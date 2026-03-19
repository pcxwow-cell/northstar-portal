#!/bin/bash
# Northstar Portal — Autopilot Build Loop
# Sonnet codes → bash reviews → Opus writes next instructions → repeat
# Usage: ./scripts/autopilot.sh [max_cycles]

set -e
cd /home/pc/northstar-portal

# ── Lock file to prevent multiple instances ──
LOCKFILE="/tmp/northstar-autopilot.lock"
if [ -f "$LOCKFILE" ]; then
  OTHER_PID=$(cat "$LOCKFILE" 2>/dev/null)
  if kill -0 "$OTHER_PID" 2>/dev/null; then
    echo "ERROR: Autopilot already running (PID $OTHER_PID). Kill it first or remove $LOCKFILE"
    exit 1
  else
    echo "WARNING: Stale lock file found (PID $OTHER_PID is dead). Removing."
    rm -f "$LOCKFILE"
  fi
fi
echo $$ > "$LOCKFILE"
trap 'rm -f "$LOCKFILE"' EXIT

MAX_CYCLES="${1:-10}"
LOG_DIR="logs"
INSTRUCTIONS_FILE=".claude/next-build-instructions.md"
STATUS_FILE="logs/autopilot-status.txt"
mkdir -p "$LOG_DIR"

if [ ! -f "$INSTRUCTIONS_FILE" ]; then
  cat > "$INSTRUCTIONS_FILE" << 'INIT'
Read docs/FRONTEND-PLAN.md and continue from where the last session left off.
INIT
fi

# Status reporting function — writes to a file the user can check
report_status() {
  local status="$1"
  local detail="$2"
  local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  echo "[$timestamp] $status — $detail" >> "$STATUS_FILE"
  echo "[$timestamp] $status — $detail"
}

# Initialize status file
echo "=== AUTOPILOT STARTED $(date) ===" > "$STATUS_FILE"
echo "Max cycles: $MAX_CYCLES" >> "$STATUS_FILE"
echo "" >> "$STATUS_FILE"

echo "=========================================="
echo "  NORTHSTAR AUTOPILOT — $MAX_CYCLES cycles"
echo "  Status file: $STATUS_FILE"
echo "=========================================="

for i in $(seq 1 "$MAX_CYCLES"); do
  TIMESTAMP=$(date +%Y%m%d-%H%M%S)

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  CYCLE $i/$MAX_CYCLES — $(date)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # Record git state before build
  COMMITS_BEFORE=$(git rev-parse HEAD)

  # ── STEP 1: Build prompt as temp file ──
  BUILD_PROMPT=$(mktemp)
  # Strip the $ARGUMENTS placeholder from build rules
  sed 's/\$ARGUMENTS//' ".claude/commands/build.md" > "$BUILD_PROMPT"
  cat >> "$BUILD_PROMPT" << 'DIVIDER'

---

YOU ARE IN AUTOPILOT MODE. THIS IS A NON-INTERACTIVE SESSION.

MANDATORY BEHAVIOR:
1. Do NOT greet the user or ask questions
2. Do NOT summarize the project state
3. Do NOT list what needs to be done
4. Do NOT say "What would you like to do?"
5. START CODING IMMEDIATELY — read files, edit them, commit, push
6. If you finish all tasks below, move to the next phase in docs/FRONTEND-PLAN.md
7. After each commit, run `npm run build` to verify — if it fails, fix it immediately

YOUR TASKS FOR THIS SESSION (execute these in order):

DIVIDER
  cat "$INSTRUCTIONS_FILE" >> "$BUILD_PROMPT"

  # ── STEP 2: Sonnet builds ──
  report_status "CYCLE $i" "SONNET building..."
  BUILD_LOG="$LOG_DIR/build-$TIMESTAMP.log"

  # Use file redirect instead of tee to ensure capture
  if cat "$BUILD_PROMPT" | claude -p --dangerously-skip-permissions --model claude-sonnet-4-6 > "$BUILD_LOG" 2>&1; then
    BUILD_EXIT=0
  else
    BUILD_EXIT=$?
  fi
  rm -f "$BUILD_PROMPT"

  # ── STEP 2b: Validate Sonnet actually did something ──
  COMMITS_AFTER=$(git rev-parse HEAD)
  BUILD_LOG_SIZE=$(wc -c < "$BUILD_LOG")
  BUILD_PASSED=$(npm run build 2>&1 | tail -1)

  if [ "$COMMITS_BEFORE" = "$COMMITS_AFTER" ]; then
    report_status "CYCLE $i WARNING" "Sonnet made NO commits. Log size: ${BUILD_LOG_SIZE} bytes. Exit code: $BUILD_EXIT"
    # Show last 10 lines of log for debugging
    echo "--- Last 10 lines of build log ---"
    tail -10 "$BUILD_LOG"
    echo "--- End ---"

    if [ "$BUILD_LOG_SIZE" -lt 100 ]; then
      report_status "CYCLE $i FAILURE" "Build log nearly empty — Sonnet likely didn't execute. Stopping."
      echo ""
      echo "AUTOPILOT STOPPED: Sonnet is not executing code. Check $BUILD_LOG"
      echo "The prompt may not be triggering action mode."
      break
    fi
  else
    NEW_COMMITS=$(git log --oneline "$COMMITS_BEFORE".."$COMMITS_AFTER")
    COMMIT_COUNT=$(echo "$NEW_COMMITS" | wc -l)
    report_status "CYCLE $i SUCCESS" "Sonnet made $COMMIT_COUNT commit(s)"
    echo "$NEW_COMMITS" >> "$STATUS_FILE"
  fi

  # Check build status
  if echo "$BUILD_PASSED" | grep -q "built in"; then
    report_status "CYCLE $i" "Build PASSES"
  else
    report_status "CYCLE $i ERROR" "Build FAILED — check output"
    npm run build 2>&1 | tail -20 >> "$STATUS_FILE"
  fi

  # ── STEP 3: Collect review data ──
  report_status "CYCLE $i" "Collecting review data..."
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
    echo "=== BUILD STATUS ==="
    npm run build 2>&1 | tail -5
  } > "$REVIEW_DATA" 2>&1

  cp "$REVIEW_DATA" "$LOG_DIR/review-data-$TIMESTAMP.log"

  # ── STEP 4: Opus generates next instructions ──
  report_status "CYCLE $i" "OPUS generating next instructions..."
  REVIEW_PROMPT=$(mktemp)
  cat > "$REVIEW_PROMPT" << 'HEADER'
YOU ARE IN AUTOPILOT MODE. THIS IS A NON-INTERACTIVE SESSION.

You are the project manager for the Northstar Investor Portal refactor. Based on the review data and frontend plan below, you MUST output ONLY the next build instructions.

MANDATORY BEHAVIOR:
1. Do NOT greet the user or say "What can I help you with?"
2. Do NOT ask questions
3. Do NOT add preamble, commentary, or markdown headers
4. Output ONLY actionable instructions telling the build agent what to code next
5. Be specific: name exact files, components, and what to do
6. If Sonnet made no commits, re-issue the same instructions with stronger wording
7. If all phases are done (monoliths under 200 lines, all pages/managers extracted), output ONLY: ALL PHASES COMPLETE

=== REVIEW DATA ===
HEADER
  cat "$REVIEW_DATA" >> "$REVIEW_PROMPT"
  echo "" >> "$REVIEW_PROMPT"
  echo "=== FRONTEND PLAN ===" >> "$REVIEW_PROMPT"
  cat docs/FRONTEND-PLAN.md >> "$REVIEW_PROMPT"

  REVIEW_LOG="$LOG_DIR/review-$TIMESTAMP.log"
  if cat "$REVIEW_PROMPT" | claude -p --dangerously-skip-permissions --model claude-opus-4-6 > "$REVIEW_LOG" 2>&1; then
    REVIEW_EXIT=0
  else
    REVIEW_EXIT=$?
  fi

  # Validate Opus output — check it's not conversational garbage
  REVIEW_SIZE=$(wc -c < "$REVIEW_LOG")
  if [ "$REVIEW_SIZE" -lt 50 ]; then
    report_status "CYCLE $i WARNING" "Opus output too short ($REVIEW_SIZE bytes) — keeping previous instructions"
  elif grep -qi "what can I help\|what would you like\|how can I assist" "$REVIEW_LOG" 2>/dev/null; then
    report_status "CYCLE $i WARNING" "Opus output was conversational, not instructions — keeping previous instructions"
    echo "Opus said: $(head -3 "$REVIEW_LOG")" >> "$STATUS_FILE"
  else
    # Good output — use it as next instructions
    cp "$REVIEW_LOG" "$INSTRUCTIONS_FILE"
    report_status "CYCLE $i" "New instructions written ($REVIEW_SIZE bytes)"
  fi

  rm -f "$REVIEW_DATA" "$REVIEW_PROMPT"

  # ── STEP 5: Check if done ──
  if grep -q "ALL PHASES COMPLETE" "$INSTRUCTIONS_FILE" 2>/dev/null; then
    echo ""
    report_status "DONE" "ALL PHASES COMPLETE"
    echo "=========================================="
    echo "  ALL PHASES COMPLETE — stopping"
    echo "=========================================="
    break
  fi

  report_status "CYCLE $i" "Complete. Starting next cycle."
done

echo ""
report_status "FINISHED" "Autopilot ran $i cycles"
echo "Status: $STATUS_FILE"
echo "Logs: $LOG_DIR/"
echo ""
git log --oneline -10
