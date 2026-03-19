#!/bin/bash
# Run a build-review-build cycle unattended
# Usage: ./scripts/run-build-cycle.sh "Phase 0: Wire all 14 components..."
#
# This runs Sonnet to build, then Opus to review.
# Check docs/FRONTEND-PLAN.md and git log when you come back.

set -e
cd /home/pc/northstar-portal

INSTRUCTIONS="${1:-Read docs/FRONTEND-PLAN.md and continue from where the last session left off.}"
LOG_DIR="logs"
mkdir -p "$LOG_DIR"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

echo "=== BUILD CYCLE $TIMESTAMP ==="
echo "Instructions: $INSTRUCTIONS"
echo ""

# Step 1: Run Sonnet to build
echo "[$(date)] Starting Sonnet build..."
claude --dangerously-skip-permissions --model claude-sonnet-4-6 -p /home/pc/northstar-portal "/build $INSTRUCTIONS" \
  2>&1 | tee "$LOG_DIR/build-$TIMESTAMP.log"

echo ""
echo "[$(date)] Sonnet build complete."
echo ""

# Step 2: Run Opus to review
echo "[$(date)] Starting Opus review..."
claude --dangerously-skip-permissions --model claude-opus-4-6 -p /home/pc/northstar-portal "/review" \
  2>&1 | tee "$LOG_DIR/review-$TIMESTAMP.log"

echo ""
echo "[$(date)] Review complete. Check logs/$LOG_DIR/"
echo "Next steps are in the review output above."
