#!/bin/bash
# Northstar Portal — Autopilot v6 (multi-agent)
# Opus orchestrator spawns Sonnet builder subagents autonomously
# Usage: ./scripts/autopilot.sh

set -e
cd /home/pc/northstar-portal

# ── Lock file ──
LOCKFILE="/tmp/northstar-autopilot.lock"
if [ -f "$LOCKFILE" ]; then
  OTHER_PID=$(cat "$LOCKFILE" 2>/dev/null)
  if kill -0 "$OTHER_PID" 2>/dev/null; then
    echo "ERROR: Autopilot already running (PID $OTHER_PID)"
    exit 1
  fi
  rm -f "$LOCKFILE"
fi
echo $$ > "$LOCKFILE"
trap 'rm -f "$LOCKFILE"' EXIT

mkdir -p logs
echo "=== AUTOPILOT v6 STARTED $(date) ===" > logs/autopilot-status.txt
echo "Opus orchestrator with Sonnet builder subagents" >> logs/autopilot-status.txt
echo "Monitor: tail -f $(pwd)/logs/autopilot-status.txt" >> logs/autopilot-status.txt
echo "" >> logs/autopilot-status.txt

echo "=========================================="
echo "  NORTHSTAR AUTOPILOT v6"
echo "  Opus orchestrates Sonnet builders"
echo "  Monitor: tail -f $(pwd)/logs/autopilot-status.txt"
echo "=========================================="

claude -p --dangerously-skip-permissions \
  --model claude-opus-4-6 \
  --max-turns 200 \
  --agent orchestrator \
  "Read the frontend plan and execute all remaining Phase 0 tasks. Spawn builder agents for each task. Verify each result. Log progress to logs/autopilot-status.txt. Continue through all phases until done."
