#!/bin/bash
# Northstar Portal — Autopilot Build Loop
# Sonnet codes → Opus reviews → Opus generates next instructions → Sonnet codes → repeat
# Usage: ./scripts/autopilot.sh [max_cycles]
# Default: 10 cycles. Stops early if Opus says "ALL PHASES COMPLETE"

set -e
cd /home/pc/northstar-portal

MAX_CYCLES="${1:-10}"
LOG_DIR="logs"
INSTRUCTIONS_FILE=".claude/next-build-instructions.md"
mkdir -p "$LOG_DIR"

# Initial instructions if no instruction file exists
if [ ! -f "$INSTRUCTIONS_FILE" ]; then
  cat > "$INSTRUCTIONS_FILE" << 'INIT'
Read docs/FRONTEND-PLAN.md and continue from where the last session left off. If Phase 0 is incomplete, finish it first: wire ALL 14 components into Admin.jsx and App.jsx, replace local theme constants with imports from styles/theme.js, delete the duplicate constants. Then proceed to the next phase.
INIT
fi

echo "=========================================="
echo "  NORTHSTAR AUTOPILOT — $MAX_CYCLES cycles"
echo "=========================================="
echo ""

for i in $(seq 1 "$MAX_CYCLES"); do
  TIMESTAMP=$(date +%Y%m%d-%H%M%S)
  INSTRUCTIONS=$(cat "$INSTRUCTIONS_FILE")

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  CYCLE $i/$MAX_CYCLES — $(date)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  # ── STEP 1: Sonnet builds ──
  echo "[$(date '+%H:%M:%S')] SONNET building..."
  claude --dangerously-skip-permissions --model claude-sonnet-4-6 -p /home/pc/northstar-portal "/build $INSTRUCTIONS" \
    2>&1 | tee "$LOG_DIR/build-$TIMESTAMP.log"
  echo ""
  echo "[$(date '+%H:%M:%S')] SONNET done."
  echo ""

  # ── STEP 2: Opus reviews and writes next instructions ──
  echo "[$(date '+%H:%M:%S')] OPUS reviewing..."
  claude --dangerously-skip-permissions --model claude-opus-4-6 -p /home/pc/northstar-portal "/review After reviewing, write the next build instructions to .claude/next-build-instructions.md — be specific about which phase, which files, what mistakes to avoid. If all phases in FRONTEND-PLAN.md are complete, write ONLY the text ALL PHASES COMPLETE to that file." \
    2>&1 | tee "$LOG_DIR/review-$TIMESTAMP.log"
  echo ""
  echo "[$(date '+%H:%M:%S')] OPUS done."
  echo ""

  # ── STEP 3: Check if we're done ──
  if grep -q "ALL PHASES COMPLETE" "$INSTRUCTIONS_FILE" 2>/dev/null; then
    echo "=========================================="
    echo "  ALL PHASES COMPLETE — stopping autopilot"
    echo "=========================================="
    break
  fi

  echo "[$(date '+%H:%M:%S')] Next instructions written. Continuing to cycle $((i+1))..."
  echo ""
done

echo ""
echo "Autopilot finished. $i cycles completed."
echo "Logs: $LOG_DIR/"
echo "Final state: git log --oneline -20"
git log --oneline -10
