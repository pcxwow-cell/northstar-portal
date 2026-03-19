#!/bin/bash
# Northstar Portal — Autopilot v8 (parallel, no Opus dependency)
# Dispatches parallel Sonnet agents per round, bash validates
# Usage: ./scripts/autopilot.sh

set -eo pipefail
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

LOG_DIR="logs"
STATUS="$LOG_DIR/autopilot-status.txt"
mkdir -p "$LOG_DIR"

log() { echo "[$(date '+%H:%M:%S')] $1" | tee -a "$STATUS"; }

SONNET_PROMPT="You are in autopilot mode. Do NOT greet, summarize, or ask questions. Execute immediately. Run npm run build to verify after changes. If build fails, fix it. Task:"

run_task() {
  local task="$1"
  local logfile="$2"
  echo "$SONNET_PROMPT $task" | claude -p --dangerously-skip-permissions --model claude-sonnet-4-6 --max-turns 30 > "$logfile" 2>&1 || true
}

validate_round() {
  local round_name="$1"
  local before="$2"
  local after=$(git rev-parse HEAD)
  local admin=$(wc -l < src/Admin.jsx)
  local app=$(wc -l < src/App.jsx)

  if [ "$before" = "$after" ]; then
    log "  $round_name: WARNING — no commits"
  else
    local count=$(git log --oneline "$before".."$after" | wc -l)
    log "  $round_name: $count commit(s)"
    git log --oneline "$before".."$after" | while IFS= read -r c; do log "    $c"; done
  fi

  if npm run build 2>&1 | grep -q "built in"; then
    log "  Build: PASS — Admin: $admin, App: $app"
  else
    log "  Build: FAIL — sending fix agent..."
    echo "$SONNET_PROMPT The npm build is broken. Run npm run build, read the full error output, fix the issue in the source files, then run npm run build again to confirm it passes. Commit the fix and git push." \
      | claude -p --dangerously-skip-permissions --model claude-sonnet-4-6 --max-turns 15 > "$LOG_DIR/fix-$(date +%s).log" 2>&1 || true
    if npm run build 2>&1 | grep -q "built in"; then
      log "  Build: FIXED"
    else
      log "  Build: STILL BROKEN — stopping"
      return 1
    fi
  fi
  return 0
}

echo "=== AUTOPILOT v8 — $(date) ===" | tee "$STATUS"
log "Parallel Sonnet agents, bash orchestration"
log "Current state: Admin=$(wc -l < src/Admin.jsx) App=$(wc -l < src/App.jsx)"
log ""

# ══════════════════════════════════════════════════
# ROUND 1: FormInput in App.jsx + Modal in Admin.jsx (parallel — different files)
# ══════════════════════════════════════════════════
BEFORE=$(git rev-parse HEAD)
log "━━ ROUND 1: FormInput→App.jsx + Modal→Admin.jsx (parallel) ━━"

run_task "In src/App.jsx, replace all label+input pairs that use labelStyle/inputStyle with <FormInput> from ./components/FormInput. Import FormInput if not already imported. Every <label style={labelStyle}>X</label> followed by <input style={inputStyle} .../> becomes <FormInput label=\"X\" value={...} onChange={...} />. Do ALL instances. Commit: 'Wire FormInput into App.jsx'. Git push." \
  "$LOG_DIR/r1-formput-app-$(date +%s).log" &
PID1=$!

run_task "In src/Admin.jsx, replace all inline modal overlay patterns with <Modal> from ./components/Modal. A modal pattern is: a fixed-position overlay div (position:fixed, inset/top/left 0, zIndex, backdrop) containing a centered content div. Replace with <Modal isOpen={showVariable} onClose={closeHandler} title=\"Title\">...content...</Modal>. Do ALL modal instances. Commit: 'Wire Modal into Admin.jsx'. Git push." \
  "$LOG_DIR/r1-modal-admin-$(date +%s).log" &
PID2=$!

wait $PID1 $PID2
validate_round "Round 1" "$BEFORE" || exit 1

# ══════════════════════════════════════════════════
# ROUND 2: Modal in App.jsx + StatCard in Admin.jsx (parallel)
# ══════════════════════════════════════════════════
BEFORE=$(git rev-parse HEAD)
log "━━ ROUND 2: Modal→App.jsx + StatCard→Admin.jsx (parallel) ━━"

run_task "In src/App.jsx, replace all inline modal overlay patterns with <Modal> from ./components/Modal. A modal pattern is: a fixed-position overlay div containing a centered content box. Replace with <Modal isOpen={showVariable} onClose={closeHandler} title=\"Title\">...content...</Modal>. Do ALL instances. Commit: 'Wire Modal into App.jsx'. Git push." \
  "$LOG_DIR/r2-modal-app-$(date +%s).log" &
PID1=$!

run_task "In src/Admin.jsx, replace inline stat display patterns with <StatCard> from ./components/StatCard. A stat pattern is: a div showing a large number with a label below it (like total investors, AUM, etc). Replace with <StatCard label=\"Label\" value={number} />. Do ALL instances. Commit: 'Wire StatCard into Admin.jsx'. Git push." \
  "$LOG_DIR/r2-statcard-admin-$(date +%s).log" &
PID2=$!

wait $PID1 $PID2
validate_round "Round 2" "$BEFORE" || exit 1

# ══════════════════════════════════════════════════
# ROUND 3: StatusBadge in both (parallel)
# ══════════════════════════════════════════════════
BEFORE=$(git rev-parse HEAD)
log "━━ ROUND 3: StatusBadge→Admin.jsx + StatusBadge→App.jsx (parallel) ━━"

run_task "In src/Admin.jsx, replace all inline colored pill/badge span patterns with <StatusBadge> from ./components/StatusBadge. These are spans with inline styles like background color, borderRadius, padding, fontSize showing status text (Active, Pending, Draft, etc). Replace with <StatusBadge status=\"active\" /> or <StatusBadge status=\"pending\" /> etc. Do ALL instances. Commit: 'Wire StatusBadge into Admin.jsx'. Git push." \
  "$LOG_DIR/r3-badge-admin-$(date +%s).log" &
PID1=$!

run_task "In src/App.jsx, replace all inline colored pill/badge span patterns with <StatusBadge> from ./components/StatusBadge. Same pattern as Admin — colored spans showing status text. Replace with <StatusBadge status=\"...\">. Do ALL instances. Commit: 'Wire StatusBadge into App.jsx'. Git push." \
  "$LOG_DIR/r3-badge-app-$(date +%s).log" &
PID2=$!

wait $PID1 $PID2
validate_round "Round 3" "$BEFORE" || exit 1

# ══════════════════════════════════════════════════
# ROUND 4: Tabs in Admin.jsx + SectionHeader in App.jsx (parallel)
# ══════════════════════════════════════════════════
BEFORE=$(git rev-parse HEAD)
log "━━ ROUND 4: Tabs→Admin.jsx + SectionHeader→App.jsx (parallel) ━━"

run_task "In src/Admin.jsx, replace all inline tab button row patterns with <Tabs> from ./components/Tabs. A tab pattern is: a row of buttons where clicking one changes the active view, usually with active/inactive styling. Replace with <Tabs tabs={[{label:'Tab1',value:'tab1'},...]} active={activeTab} onChange={setActiveTab} />. Do ALL instances. Commit: 'Wire Tabs into Admin.jsx'. Git push." \
  "$LOG_DIR/r4-tabs-admin-$(date +%s).log" &
PID1=$!

run_task "In src/App.jsx, replace section title + action button patterns with <SectionHeader> from ./components/SectionHeader. A section header pattern is: a div with a heading/title on the left and an action button on the right, used as section dividers. Replace with <SectionHeader title=\"...\" action={<Button .../>} />. Do ALL instances. Commit: 'Wire SectionHeader into App.jsx'. Git push." \
  "$LOG_DIR/r4-header-app-$(date +%s).log" &
PID2=$!

wait $PID1 $PID2
validate_round "Round 4" "$BEFORE" || exit 1

# ══════════════════════════════════════════════════
# ROUND 5: DataTable + SearchFilterBar in Admin.jsx (sequential — same file)
# ══════════════════════════════════════════════════
BEFORE=$(git rev-parse HEAD)
log "━━ ROUND 5: DataTable→Admin.jsx (sequential) ━━"

run_task "In src/Admin.jsx, replace inline sortable table patterns with <DataTable> from ./components/DataTable. Look for <table> elements with sortable column headers (the local SortableHeader component). Replace with <DataTable columns={[...]} data={[...]} sortable />. Delete the local SortableHeader function definition if it exists. Do ALL table instances. Commit: 'Wire DataTable into Admin.jsx'. Git push." \
  "$LOG_DIR/r5-table-admin-$(date +%s).log"
validate_round "Round 5a" "$BEFORE" || exit 1

BEFORE=$(git rev-parse HEAD)
log "━━ ROUND 5b: SearchFilterBar→Admin.jsx (sequential) ━━"

run_task "In src/Admin.jsx, replace inline search input + filter dropdown combo patterns with <SearchFilterBar> from ./components/SearchFilterBar. These are typically a text input for searching plus one or more select/dropdown elements for filtering, wrapped in a flex row. Replace with <SearchFilterBar searchValue={search} onSearchChange={setSearch} filters={[...]} />. Do ALL instances. Commit: 'Wire SearchFilterBar into Admin.jsx'. Git push." \
  "$LOG_DIR/r5-search-admin-$(date +%s).log"
validate_round "Round 5b" "$BEFORE" || exit 1

# ══════════════════════════════════════════════════
# ROUND 6: SectionHeader + Tabs in Admin.jsx (sequential — same file)
# ══════════════════════════════════════════════════
BEFORE=$(git rev-parse HEAD)
log "━━ ROUND 6: SectionHeader→Admin.jsx ━━"

run_task "In src/Admin.jsx, replace section title + action button patterns with <SectionHeader> from ./components/SectionHeader. Replace with <SectionHeader title=\"...\" action={<Button .../>} />. Do ALL instances. Commit: 'Wire SectionHeader into Admin.jsx'. Git push." \
  "$LOG_DIR/r6-header-admin-$(date +%s).log"
validate_round "Round 6" "$BEFORE" || exit 1

# ══════════════════════════════════════════════════
# ROUND 7: Final cleanup — hardcoded colors in both (parallel)
# ══════════════════════════════════════════════════
BEFORE=$(git rev-parse HEAD)
log "━━ ROUND 7: Cleanup hardcoded colors (parallel) ━━"

run_task "In src/Admin.jsx, find ALL remaining hardcoded color values and replace with theme.js tokens. Search for: '#fff' or '#FFF' → colors.white, '#EA2028' → colors.red, '#231F20' → colors.darkText, '#767168' → colors.mutedText, '#F0EDE8' → colors.lightBorder, '#FAFAF8' → colors.cardBg, '#E8E5DE' → colors.border, '#DDD' → colors.inputBorder. Import any missing tokens from ./styles/theme.js. Commit: 'Replace hardcoded colors with theme tokens in Admin.jsx'. Git push." \
  "$LOG_DIR/r7-colors-admin-$(date +%s).log" &
PID1=$!

run_task "In src/App.jsx, find ALL remaining hardcoded color values and replace with theme.js tokens. Search for: '#fff' or '#FFF' → colors.white, '#EA2028' → colors.red, '#231F20' → colors.darkText, '#767168' → colors.mutedText, '#F0EDE8' → colors.lightBorder, '#FAFAF8' → colors.cardBg. Also replace any remaining local theme constant usage (serif, sans, red, darkText, cream, green) with fonts.xxx or colors.xxx from theme.js. Import any missing tokens. Commit: 'Replace hardcoded colors with theme tokens in App.jsx'. Git push." \
  "$LOG_DIR/r7-colors-app-$(date +%s).log" &
PID2=$!

wait $PID1 $PID2
validate_round "Round 7" "$BEFORE" || exit 1

# ══════════════════════════════════════════════════
# DONE
# ══════════════════════════════════════════════════
log ""
log "━━ PHASE 0 COMPLETE ━━"
log "Final: Admin=$(wc -l < src/Admin.jsx) App=$(wc -l < src/App.jsx)"
log ""
log "Components wired:"
grep "from.*./components/" src/Admin.jsx src/App.jsx | tee -a "$STATUS"
log ""
git log --oneline -20 | tee -a "$STATUS"
