#!/bin/bash
# Northstar Portal — Autopilot Build Loop
# Sonnet codes → bash reviews → Opus writes next instructions → repeat
# Usage: ./scripts/autopilot.sh [max_cycles]

set -e
cd /home/pc/northstar-portal

MAX_CYCLES="${1:-10}"
LOG_DIR="logs"
INSTRUCTIONS_FILE=".claude/next-build-instructions.md"
BUILD_RULES=".claude/commands/build.md"
mkdir -p "$LOG_DIR"

if [ ! -f "$INSTRUCTIONS_FILE" ]; then
  cat > "$INSTRUCTIONS_FILE" << 'INIT'
Read docs/FRONTEND-PLAN.md and continue from where the last session left off.
INIT
fi

echo "=========================================="
echo "  NORTHSTAR AUTOPILOT — $MAX_CYCLES cycles"
echo "=========================================="

for i in $(seq 1 "$MAX_CYCLES"); do
  TIMESTAMP=$(date +%Y%m%d-%H%M%S)

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  CYCLE $i/$MAX_CYCLES — $(date)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # ── STEP 1: Build prompt as temp file (avoids heredoc escaping issues) ──
  BUILD_PROMPT=$(mktemp)
  cat "$BUILD_RULES" | sed 's/\$ARGUMENTS//' > "$BUILD_PROMPT"
  cat >> "$BUILD_PROMPT" << 'DIVIDER'

---

IMPORTANT: You are running in non-interactive mode. Do NOT ask questions. Do NOT summarize. Do NOT list tasks. Execute the code changes, commit, and push. Start coding immediately.

Your specific instructions for this session:

DIVIDER
  cat "$INSTRUCTIONS_FILE" >> "$BUILD_PROMPT"

  # ── STEP 2: Sonnet builds ──
  echo "[$(date '+%H:%M:%S')] SONNET building..."
  cat "$BUILD_PROMPT" | claude -p --dangerously-skip-permissions --model claude-sonnet-4-6 \
    2>&1 | tee "$LOG_DIR/build-$TIMESTAMP.log"
  rm -f "$BUILD_PROMPT"
  echo "[$(date '+%H:%M:%S')] SONNET done."

  # ── STEP 3: Bash collects review data ──
  echo "[$(date '+%H:%M:%S')] Collecting review data..."
  REVIEW_DATA=$(mktemp)
  {
    echo "=== GIT LOG (last 15 commits) ==="
    git log --oneline -15

    echo ""
    echo "=== FILE SIZES ==="
    wc -l src/Admin.jsx src/App.jsx

    echo ""
    echo "=== PAGES EXTRACTED ==="
    ls src/pages/ 2>/dev/null || echo "(empty)"

    echo ""
    echo "=== ADMIN MANAGERS EXTRACTED ==="
    ls src/admin/ 2>/dev/null || echo "(empty)"

    echo ""
    echo "=== COMPONENTS IMPORTED IN ADMIN.JSX ==="
    grep "from.*./components/" src/Admin.jsx 2>/dev/null || echo "(none)"

    echo ""
    echo "=== COMPONENTS IMPORTED IN APP.JSX ==="
    grep "from.*./components/" src/App.jsx 2>/dev/null || echo "(none)"

    echo ""
    echo "=== THEME.JS IMPORTED ==="
    grep "from.*./styles/theme" src/Admin.jsx src/App.jsx 2>/dev/null || echo "(none)"

    echo ""
    echo "=== DUPLICATE LOCAL CONSTANTS ==="
    echo "Admin.jsx:"
    grep -n "^const \(sans\|red\|green\|darkText\|inputStyle\|btnStyle\|btnOutline\) " src/Admin.jsx 2>/dev/null || echo "  (none - good)"
    echo "App.jsx:"
    grep -n "^export const \(serif\|sans\|red\|darkText\|cream\|green\) " src/App.jsx 2>/dev/null || echo "  (none - good)"

    echo ""
    echo "=== RAW COLOR COUNTS ==="
    echo "Admin.jsx #fff: $(grep -c '#fff\|#FFF' src/Admin.jsx 2>/dev/null || echo 0)"
    echo "App.jsx #fff: $(grep -c '#fff\|#FFF' src/App.jsx 2>/dev/null || echo 0)"

    echo ""
    echo "=== BUILD STATUS ==="
    npm run build 2>&1 | tail -5

    echo ""
    echo "=== PREVIOUS INSTRUCTIONS ==="
    cat "$INSTRUCTIONS_FILE"
  } > "$REVIEW_DATA" 2>&1

  cat "$REVIEW_DATA" >> "$LOG_DIR/review-data-$TIMESTAMP.log"

  # ── STEP 4: Opus generates next instructions via temp file ──
  echo "[$(date '+%H:%M:%S')] OPUS generating next instructions..."
  REVIEW_PROMPT=$(mktemp)
  cat > "$REVIEW_PROMPT" << 'HEADER'
You are the project manager reviewing build progress. Based on the review data and the frontend plan below, output ONLY the next build instructions. No preamble, no commentary, no markdown headers like "# Next Instructions" — just the actionable instructions that tell the build agent exactly what to do next.

Be specific: name exact files, components, line numbers, and what mistakes to avoid based on what you see in the data.

If the monoliths are both under 200 lines and all pages/managers are extracted, output ONLY: ALL PHASES COMPLETE

=== REVIEW DATA ===
HEADER
  cat "$REVIEW_DATA" >> "$REVIEW_PROMPT"
  echo "" >> "$REVIEW_PROMPT"
  echo "=== FRONTEND PLAN ===" >> "$REVIEW_PROMPT"
  cat docs/FRONTEND-PLAN.md >> "$REVIEW_PROMPT"

  cat "$REVIEW_PROMPT" | claude -p --dangerously-skip-permissions --model claude-opus-4-6 \
    2>&1 | tee "$LOG_DIR/review-$TIMESTAMP.log" > "$INSTRUCTIONS_FILE"

  rm -f "$REVIEW_DATA" "$REVIEW_PROMPT"
  echo "[$(date '+%H:%M:%S')] Next instructions written."

  # ── STEP 5: Check if done ──
  if grep -q "ALL PHASES COMPLETE" "$INSTRUCTIONS_FILE" 2>/dev/null; then
    echo ""
    echo "=========================================="
    echo "  ALL PHASES COMPLETE — stopping"
    echo "=========================================="
    break
  fi
done

echo ""
echo "Autopilot finished after $i cycles."
echo "Logs: $LOG_DIR/"
echo ""
git log --oneline -10
