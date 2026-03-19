#!/bin/bash
# Northstar Portal — Autopilot v10
# Bash dispatches parallel Sonnet agents → Opus reviews → memory persists across rounds
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
MEMORY="$LOG_DIR/agent-memory.md"
mkdir -p "$LOG_DIR"

log() { echo "[$(date '+%H:%M:%S')] $1" | tee -a "$STATUS"; }

# Update memory file after each round so agents know what's done
update_memory() {
  local round_name="$1"
  local result="$2"
  local admin=$(wc -l < src/Admin.jsx)
  local app=$(wc -l < src/App.jsx)
  local components=$(grep "from.*./components/" src/Admin.jsx src/App.jsx 2>/dev/null | sed 's/.*import /- /' || echo "- none")

  cat > "$MEMORY" << MEMEOF
# Agent Memory — Auto-updated after $round_name

## Current State
- Admin.jsx: $admin lines
- App.jsx: $app lines
- Build: $(npm run build 2>&1 | grep -q "built in" && echo "PASS" || echo "FAIL")
- Last round: $round_name — $result

## Components Imported
$components

## Completed Rounds
$(grep "━━ ROUND\|Done\|commit(s)\|PASS\|FAIL" "$STATUS" 2>/dev/null | tail -20)

## Known Issues
- Sonnet sometimes creates tag mismatches (<Button> with </button>) — always verify tags match
- When replacing inline styles with components, preserve all event handlers (onClick, onChange, etc.)
- Some components have variant props — check the component source before wiring
MEMEOF
}

run_task() {
  local task="$1"
  local logfile="$2"
  local memory_context=$(cat "$MEMORY" 2>/dev/null || echo "No previous memory.")
  echo "You are in autopilot mode. Do NOT greet, summarize, or ask questions. Execute immediately. Run npm run build to verify after changes. If build fails, fix it.

MEMORY FROM PREVIOUS ROUNDS:
$memory_context

YOUR TASK:
$task" | claude -p --dangerously-skip-permissions --model claude-sonnet-4-6 --max-turns 30 > "$logfile" 2>&1 || true
}

peer_review_gate() {
  local round_name="$1"
  local before="$2"
  local max_retries=2
  local attempt=0

  while [ $attempt -le $max_retries ]; do
    attempt=$((attempt + 1))
    local after=$(git rev-parse HEAD)
    local admin=$(wc -l < src/Admin.jsx)
    local app=$(wc -l < src/App.jsx)
    local issues=""
    local gate_pass=true

    log "  ── Peer Review Gate (attempt $attempt) ──"

    # ── CHECK 1: Did Sonnet commit anything? ──
    if [ "$before" = "$after" ]; then
      log "  GATE FAIL: No commits made"
      issues="$issues\n- No commits were made. You must make code changes, commit, and push."
      gate_pass=false
    else
      local count=$(git log --oneline "$before".."$after" | wc -l)
      log "  Commits: $count"
      git log --oneline "$before".."$after" | while IFS= read -r c; do log "    $c"; done
    fi

    # ── CHECK 2: Does the build pass? ──
    local build_output=$(npm run build 2>&1)
    if echo "$build_output" | grep -q "built in"; then
      log "  Build: PASS"
    else
      log "  GATE FAIL: Build broken"
      local build_errors=$(echo "$build_output" | grep -i "error\|Error" | head -10)
      issues="$issues\n- Build is broken. Errors:\n$build_errors"
      gate_pass=false
    fi

    # ── CHECK 3: Tag mismatches (known Sonnet bug) ──
    local tag_mismatches=""
    for component in Button Card Modal FormInput StatCard StatusBadge Tabs DataTable SearchFilterBar SectionHeader; do
      # Check for <Component> opened but </component> closed (case mismatch)
      local lower=$(echo "$component" | tr '[:upper:]' '[:lower:]')
      if [ "$component" != "$lower" ]; then
        local mismatch_admin=$(grep -n "<${component}[> ]" src/Admin.jsx 2>/dev/null | wc -l)
        local close_lower_admin=$(grep -nc "</${lower}>" src/Admin.jsx 2>/dev/null || echo 0)
        if [ "$close_lower_admin" -gt 0 ] && [ "$mismatch_admin" -gt 0 ]; then
          tag_mismatches="$tag_mismatches\n- Admin.jsx: <$component> opened but </$lower> closed ($close_lower_admin instances)"
        fi
        local mismatch_app=$(grep -n "<${component}[> ]" src/App.jsx 2>/dev/null | wc -l)
        local close_lower_app=$(grep -nc "</${lower}>" src/App.jsx 2>/dev/null || echo 0)
        if [ "$close_lower_app" -gt 0 ] && [ "$mismatch_app" -gt 0 ]; then
          tag_mismatches="$tag_mismatches\n- App.jsx: <$component> opened but </$lower> closed ($close_lower_app instances)"
        fi
      fi
    done
    if [ -n "$tag_mismatches" ]; then
      log "  GATE FAIL: Tag mismatches found"
      issues="$issues\n- Tag mismatches (opening/closing case mismatch):$tag_mismatches"
      gate_pass=false
    fi

    # ── CHECK 4: Phantom imports (imported but never used in JSX) ──
    local phantom=""
    for file in src/Admin.jsx src/App.jsx; do
      while IFS= read -r import_line; do
        local comp_name=$(echo "$import_line" | sed 's/.*import \([A-Za-z]*\).*/\1/')
        # Check if component is actually used in JSX (not just the import line)
        local usage_count=$(grep -c "<${comp_name}[> /]" "$file" 2>/dev/null || echo 0)
        if [ "$usage_count" -eq 0 ]; then
          phantom="$phantom\n- $file: imports $comp_name but never uses <$comp_name> in JSX"
        fi
      done < <(grep "from.*./components/" "$file" 2>/dev/null)
    done
    if [ -n "$phantom" ]; then
      log "  GATE WARN: Phantom imports detected"
      issues="$issues\n- Phantom imports (imported but not used in JSX):$phantom"
      # Warning only, not a gate fail — component might be used as a function
    fi

    # ── CHECK 5: Hardcoded colors still present ──
    local hardcoded_admin=$(grep -cE "'#[0-9A-Fa-f]{3,8}'|\"#[0-9A-Fa-f]{3,8}\"" src/Admin.jsx 2>/dev/null || echo 0)
    local hardcoded_app=$(grep -cE "'#[0-9A-Fa-f]{3,8}'|\"#[0-9A-Fa-f]{3,8}\"" src/App.jsx 2>/dev/null || echo 0)
    log "  Hardcoded colors remaining: Admin=$hardcoded_admin App=$hardcoded_app"

    # ── CHECK 6: Opus code review (the actual peer review) ──
    if [ "$gate_pass" = true ] && [ "$before" != "$after" ]; then
      log "  Sending to Opus for code review..."
      local review_log="$LOG_DIR/opus-review-$(date +%s).log"
      local actual_diff=$(git diff "$before".."$after" -- src/ 2>/dev/null | head -200)
      local component_imports=$(grep "from.*./components/" src/Admin.jsx src/App.jsx 2>/dev/null || echo "none")
      local memory_context=$(cat "$MEMORY" 2>/dev/null || echo "No memory.")

      cat << REVIEW_EOF | claude -p --dangerously-skip-permissions --model claude-opus-4-6 --max-turns 5 > "$review_log" 2>&1 || true
You are a code reviewer. Do NOT greet or ask questions. Output ONLY this format:

VERDICT: PASS or FAIL
ISSUES: (list each issue on its own line, or "none")
FIX: (if FAIL, exact instructions for the coding agent to fix the issues)

Review criteria:
1. Are components actually USED in JSX, not just imported?
2. Do opening and closing tags match? (<Button> must close with </Button>, not </button>)
3. Are event handlers preserved? (onClick, onChange, onSubmit, onMouseEnter, etc.)
4. Are style overrides passed correctly via style prop?
5. Is the component API used correctly? (check props match the component definition)

CONTEXT:
$memory_context

DIFF:
$actual_diff

CURRENT IMPORTS:
$component_imports

File sizes: Admin=$admin App=$app
Hardcoded colors: Admin=$hardcoded_admin App=$hardcoded_app
REVIEW_EOF

      local verdict=$(grep -i "VERDICT:" "$review_log" 2>/dev/null | head -1 | sed 's/.*VERDICT:[[:space:]]*//')
      local review_issues=$(sed -n '/ISSUES:/,/FIX:/p' "$review_log" 2>/dev/null | grep -v "ISSUES:\|FIX:" | head -10)
      local fix_instructions=$(sed -n '/FIX:/,$p' "$review_log" 2>/dev/null | tail -n +2)

      log "  Opus verdict: $verdict"
      if [ -n "$review_issues" ]; then
        echo "$review_issues" | while IFS= read -r line; do
          [ -n "$line" ] && log "    $line"
        done
      fi

      if echo "$verdict" | grep -qi "FAIL"; then
        issues="$issues\n- Opus review failed:\n$review_issues"
        gate_pass=false
      fi
    fi

    # ── GATE DECISION ──
    if [ "$gate_pass" = true ]; then
      log "  ✓ PEER REVIEW GATE: PASSED — Admin: $admin, App: $app"
      return 0
    fi

    # Gate failed — attempt fix
    if [ $attempt -le $max_retries ]; then
      log "  ✗ PEER REVIEW GATE: FAILED — sending fixes to Sonnet (retry $attempt/$max_retries)"

      local fix_prompt="The peer review gate found these issues. Fix ALL of them, run npm run build to verify, commit and git push:$(echo -e "$issues")"

      # Also append Opus fix instructions if available
      if [ -n "$fix_instructions" ]; then
        fix_prompt="$fix_prompt

Opus reviewer says: $fix_instructions"
      fi

      run_task "$fix_prompt" "$LOG_DIR/gate-fix-${round_name}-attempt${attempt}-$(date +%s).log"
    else
      log "  ✗ PEER REVIEW GATE: FAILED $max_retries times — stopping autopilot"
      log "  Issues:$(echo -e "$issues")"
      return 1
    fi
  done
}

echo "=== AUTOPILOT v10 — $(date) ===" | tee "$STATUS"
log "Parallel Sonnet builders + Peer Review Gate"
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
peer_review_gate "Round 1" "$BEFORE" || exit 1
update_memory "Round 1" "FormInput→App + Modal→Admin"

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
peer_review_gate "Round 2" "$BEFORE" || exit 1
update_memory "Round 2" "Modal→App + StatCard→Admin"

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
peer_review_gate "Round 3" "$BEFORE" || exit 1
update_memory "Round 3" "StatusBadge→both"

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
peer_review_gate "Round 4" "$BEFORE" || exit 1
update_memory "Round 4" "Tabs→Admin + SectionHeader→App"

# ══════════════════════════════════════════════════
# ROUND 5: DataTable + SearchFilterBar in Admin.jsx (sequential — same file)
# ══════════════════════════════════════════════════
BEFORE=$(git rev-parse HEAD)
log "━━ ROUND 5: DataTable→Admin.jsx (sequential) ━━"

run_task "In src/Admin.jsx, replace inline sortable table patterns with <DataTable> from ./components/DataTable. Look for <table> elements with sortable column headers (the local SortableHeader component). Replace with <DataTable columns={[...]} data={[...]} sortable />. Delete the local SortableHeader function definition if it exists. Do ALL table instances. Commit: 'Wire DataTable into Admin.jsx'. Git push." \
  "$LOG_DIR/r5-table-admin-$(date +%s).log"
peer_review_gate "Round 5a" "$BEFORE" || exit 1
update_memory "Round 5a" "DataTable→Admin"

BEFORE=$(git rev-parse HEAD)
log "━━ ROUND 5b: SearchFilterBar→Admin.jsx (sequential) ━━"

run_task "In src/Admin.jsx, replace inline search input + filter dropdown combo patterns with <SearchFilterBar> from ./components/SearchFilterBar. These are typically a text input for searching plus one or more select/dropdown elements for filtering, wrapped in a flex row. Replace with <SearchFilterBar searchValue={search} onSearchChange={setSearch} filters={[...]} />. Do ALL instances. Commit: 'Wire SearchFilterBar into Admin.jsx'. Git push." \
  "$LOG_DIR/r5-search-admin-$(date +%s).log"
peer_review_gate "Round 5b" "$BEFORE" || exit 1
update_memory "Round 5b" "SearchFilterBar→Admin"

# ══════════════════════════════════════════════════
# ROUND 6: SectionHeader + Tabs in Admin.jsx (sequential — same file)
# ══════════════════════════════════════════════════
BEFORE=$(git rev-parse HEAD)
log "━━ ROUND 6: SectionHeader→Admin.jsx ━━"

run_task "In src/Admin.jsx, replace section title + action button patterns with <SectionHeader> from ./components/SectionHeader. Replace with <SectionHeader title=\"...\" action={<Button .../>} />. Do ALL instances. Commit: 'Wire SectionHeader into Admin.jsx'. Git push." \
  "$LOG_DIR/r6-header-admin-$(date +%s).log"
peer_review_gate "Round 6" "$BEFORE" || exit 1
update_memory "Round 6" "SectionHeader→Admin"

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
peer_review_gate "Round 7" "$BEFORE" || exit 1
update_memory "Round 7" "Hardcoded colors cleanup"

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
