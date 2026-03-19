# Northstar Portal — Master Autonomous Execution Plan

> This is the single source of truth for completing the Northstar Portal autonomously.
> Every phase, task, test, agent, and acceptance criteria is defined here.

## Current State (2026-03-18)

- Backend: 7.5/10 — 17 route files, 12 services, 24 Prisma models, 107 tests
- Frontend: 3/10 — two monoliths (Admin: 4,685 lines, App: 3,217 lines), 14 components mostly unwired
- Overall: 5/10
- Issues: 114 found, 107 unfixed (9 critical, 4 blockers, 14 broken, 69 missing, 18 UX)
- Demo mode: 74/120 API functions have fallbacks, 40 missing

## Target State

- Frontend: 7.5/10 — extracted pages/managers, all components wired, responsive, accessible
- Overall: 8/10 — all blockers fixed, all critical issues resolved, demo mode 100%
- Every feature works in demo mode (no backend required)
- All modules tested with smoke tests
- All 67 functional fix tasks complete

---

## PHASE 0: Wire Components into Monoliths
**Agent:** Sonnet builder (parallel where possible)
**Reviewer:** Opus QA gate
**Status:** IN PROGRESS (autopilot running)

### Tasks (by round)
| Round | File A | File B | Status |
|-------|--------|--------|--------|
| 1 | FormInput → App.jsx | Modal → Admin.jsx | DONE |
| 2 | Modal → App.jsx | StatCard → Admin.jsx | PENDING |
| 3 | StatusBadge → Admin.jsx | StatusBadge → App.jsx | PENDING |
| 4 | Tabs → Admin.jsx | SectionHeader → App.jsx | PENDING |
| 5a | DataTable → Admin.jsx | — | PENDING |
| 5b | SearchFilterBar → Admin.jsx | — | PENDING |
| 6 | SectionHeader → Admin.jsx | — | PENDING |
| 7 | Cleanup hardcoded colors (both) | — | PENDING |

### Acceptance Criteria
- [ ] All 14 components imported AND used in Admin.jsx
- [ ] All applicable components imported AND used in App.jsx
- [ ] No hardcoded hex colors (#fff, #EA2028, etc.) in either file
- [ ] No duplicate theme constants (serif, sans, red, etc.)
- [ ] No tag mismatches (<Button> with </button>)
- [ ] npm run build passes
- [ ] No phantom imports (imported but unused)

---

## PHASE 1: State Audit & Context Layer
**Agent:** Sonnet builder
**Reviewer:** Opus QA gate
**Status:** COMPLETE

- [x] AdminDataContext — eliminates 7 redundant API calls
- [x] InvestorDataContext — wraps investor data loading
- [x] ToastContext — removes prop drilling (27 call sites)

---

## PHASE 2: Extract App.jsx Pages (12 commits)
**Agent:** Sonnet builder (HIGH parallelism — each page is a new file)
**Reviewer:** Opus QA gate

### Extraction Order (isolation-first)
| # | Page | Source Lines | Dependencies | Can Parallel With |
|---|------|-------------|--------------|-------------------|
| 1 | ResetPasswordPage | 72 | None (standalone) | 2, 3 |
| 2 | ActivityPage | 62 | fetchAuditLog | 1, 3 |
| 3 | FinancialModelerPage | 175 | runFinancialModel | 1, 2 |
| 4 | CapTablePage | 207 | fetchCapitalAccount | 5 |
| 5 | DistributionsPage | 53 | fetchDistributions | 4 |
| 6 | SecuritySection | 235 | MFA APIs, loginHistory | 7 |
| 7 | ProfilePage | 215 | updateProfile, entities | 6 |
| 8 | DocumentsPage | 234 | fetchDocuments, download | 9 |
| 9 | MessagesPage | 235 | threads APIs | 8 |
| 10 | Portfolio | 259 | fetchProjects, project detail | 11 |
| 11 | Overview | 211 | InvestorDataContext (all data) | 10 |
| 12 | LoginPage | 370 | AuthContext, all routes | LAST (solo) |

### Per-Page Acceptance Criteria
- [ ] Page is in its own file: `src/pages/{PageName}.jsx`
- [ ] Max 300 lines
- [ ] Imports from theme.js (no hardcoded colors)
- [ ] Uses shared components (Button, Card, etc.)
- [ ] App.jsx imports and renders the page
- [ ] npm run build passes
- [ ] Demo mode still works (no white screen)

### Result
- App.jsx becomes ~150-line routing shell
- 12 new files in src/pages/

---

## PHASE 3: Extract Admin.jsx Managers (17 commits)
**Agent:** Sonnet builder (HIGH parallelism — each manager is a new file)
**Reviewer:** Opus QA gate

### Extraction Order
| # | Manager | Source Lines | Can Parallel With |
|---|---------|-------------|-------------------|
| 1 | AuditLogViewer | 93 | 2, 3 |
| 2 | SignatureManager | 83 | 1, 3 |
| 3 | ProspectManager | 179 | 1, 2 |
| 4 | GroupManager | 178 | 5 |
| 5 | Toggle + helpers | 83 | 4 |
| 6 | EmailSettingsManager | 469 | 7 |
| 7 | StaffManager | 208 | 6 |
| 8 | AdminInbox | 316 | 9 |
| 9 | StatementManager | 593 | 8 |
| 10 | InvestorManager + KPIInput | 198 | 11 |
| 11 | InvestorProfile + ActivityTimeline | 308 | 10 |
| 12 | ProjectManager | 227 | 13 |
| 13 | Dashboard | 187 | 12 |
| 14 | ProjectDetail | 660 | LAST (largest, most deps) |

### ProjectDetail Sub-extraction (3 follow-up commits)
| # | Sub-component | Lines | Can Parallel |
|---|--------------|-------|-------------|
| 14a | ProjectOverviewTab | ~150 | 14b |
| 14b | ProjectInvestorsTab | ~100 | 14a |
| 14c | ProjectCashFlowsTab + UpdatesTab + WaterfallTab + DocumentsTab + ModelTab | ~400 | AFTER 14a/14b |

### Per-Manager Acceptance Criteria
- [ ] Manager is in its own file: `src/admin/{ManagerName}.jsx`
- [ ] Max 300 lines (split if larger)
- [ ] Imports from theme.js
- [ ] Uses shared components
- [ ] Admin.jsx imports and renders the manager
- [ ] npm run build passes

### Result
- Admin.jsx becomes ~120-line routing shell
- 14+ new files in src/admin/

---

## PHASE 4: Demo Mode Fixes (1 commit)
**Agent:** Sonnet builder
**Reviewer:** Opus QA gate

### 40 Functions Missing Demo Fallbacks
| Category | Functions |
|----------|-----------|
| Admin ops | updateProject, inviteInvestor, updateInvestor, approveInvestor, deactivateInvestor |
| Admin ops | resetInvestorPassword, assignInvestorProject, updateInvestorKPI |
| Groups | createGroup, updateGroup, deleteGroup, addGroupMembers, removeGroupMember |
| Staff | fetchStaff, createStaff, updateStaff, deactivateStaff, reactivateStaff, resetStaffPassword |
| Documents | deleteDocument, assignDocument, deleteProject |
| Finance | recordBulkDistribution, recordBulkCapitalCall |
| Cap table | createCapTableEntry, updateCapTableEntry, deleteCapTableEntry |
| Waterfall | updateWaterfall, createWaterfallTier, updateWaterfallTier, deleteWaterfallTier |
| Profile | updateProfile |
| Posting | postUpdate |

### Shape Mismatches to Fix
1. Document list returns `project` as string, detail returns object
2. Investor profile shape inconsistency
3. Project detail nested vs flat response

### Acceptance Criteria
- [ ] All 120 API functions have demo fallbacks
- [ ] No function throws on missing backend
- [ ] Demo banner shows when in demo mode
- [ ] All admin write operations return realistic fake success responses

---

## PHASE 5: Smoke Tests (1 commit)
**Agent:** Sonnet builder
**Reviewer:** Opus QA gate

### Test Coverage Required
| Area | Tests |
|------|-------|
| Pages | Each extracted page renders without crash |
| Managers | Each extracted manager renders without crash |
| Components | Each shared component renders with required props |
| Routing | App.jsx renders correct page for each route |
| Admin routing | Admin.jsx renders correct manager for each nav item |
| Demo mode | App loads with VITE_DEMO_MODE=true |
| Auth flow | Login → dashboard → logout |

### Implementation
- Framework: Vitest + React Testing Library
- Location: `src/__tests__/`
- One test file per page/manager
- Mock api.js for all tests

### Acceptance Criteria
- [ ] `npm test` passes
- [ ] Every page has at least 1 render test
- [ ] Every manager has at least 1 render test
- [ ] Demo mode render test passes

---

## PHASE 6: Update Doc Paths (1 commit)
**Agent:** Sonnet builder
**Reviewer:** Opus QA gate

All docs referencing `src/Admin.jsx` line numbers or `src/App.jsx` line numbers need updating to reference the new extracted files.

Files to update:
- docs/FEATURE-FIX-PLAN.md
- docs/WORKFLOW-AUDIT.md
- docs/DEEP-AUDIT.md
- docs/UI-REVIEW.md
- docs/BACKLOG.md
- docs/ROADMAP.md
- CLAUDE.md

---

## PHASE 7: Functional Fixes — Sprint A (Onboarding Blockers)
**Agent:** Sonnet builder
**Reviewer:** Opus QA gate
**Priority:** CRITICAL — must fix before any investor sees the app

| # | Task | File(s) | Type |
|---|------|---------|------|
| A1 | Fix PENDING status trap — show "Account pending approval" not "Invalid password" | server/routes/auth.js, LoginPage.jsx | BLOCKER |
| A2 | Add inline Approve button to investor list | InvestorManager.jsx | UX |
| A3 | Fix welcome email to mention approval wait | server/services/email/templates.js | BROKEN |
| A4 | Report email failure to admin (not just console.log) | server/routes/admin.js | BROKEN |
| A5 | Wire unlock account button in InvestorProfile | InvestorProfile.jsx | BROKEN |
| A6 | Add empty dashboard state for new investors | Overview.jsx | UX |
| A7 | Fix IRR NaN% display | Overview.jsx, Portfolio.jsx | BROKEN |

### Acceptance Criteria
- [ ] New investor can see "pending approval" message on login
- [ ] Admin can approve investor from the list view (one click)
- [ ] Failed emails show warning in admin UI
- [ ] Locked accounts can be unlocked from admin
- [ ] New investor with no projects sees helpful empty state
- [ ] IRR displays "—" when not calculable, never "NaN%"

---

## PHASE 8: Functional Fixes — Sprint B (Documents)
**Agent:** Sonnet builder
**Reviewer:** Opus QA gate

| # | Task | File(s) | Type |
|---|------|---------|------|
| B1 | Fix download to use secure tracking endpoint | DocumentsPage.jsx, api.js | CRITICAL |
| B2 | Fix document assignment to preserve history (upsert not deleteMany) | server/routes/admin.js | BROKEN |
| B3 | Add PDF preview in sign modal | DocumentsPage.jsx | MISSING |
| B4 | Add signer status table to admin doc detail | AdminDocuments manager | MISSING |
| B5 | Add unmatched K-1 reassignment UI | AdminDocuments manager | MISSING |
| B6 | Add signature reminder/resend button | SignatureManager.jsx | MISSING |

---

## PHASE 9: Functional Fixes — Sprint C (Messaging)

| # | Task | File(s) | Type |
|---|------|---------|------|
| C1 | Send email on new thread creation | server/routes/threads.js | MISSING |
| C2 | Add read receipts to admin inbox (admin only) | AdminInbox.jsx | MISSING |
| C3 | Add message search | MessagesPage.jsx, AdminInbox.jsx | MISSING |
| C4 | Add message sort (newest/oldest) | MessagesPage.jsx, AdminInbox.jsx | MISSING |
| C5 | Remove dead legacy messaging code | server/routes/messages.js | DEAD CODE |
| C6 | Fix timestamp format consistency | MessagesPage.jsx | UX |

---

## PHASE 10: Functional Fixes — Sprint D (Admin Project & Finance)

| # | Task | File(s) | Type |
|---|------|---------|------|
| D1 | Add cap table CRUD | ProjectDetail tabs, server/routes/admin.js | MISSING |
| D2 | Add waterfall tier editing | ProjectDetail tabs | MISSING |
| D3 | Add "Assign Investor" from project detail | ProjectDetail tabs | UX |
| D4 | Add photo upload on project updates | ProjectUpdatesTab.jsx | MISSING |
| D5 | Add bulk distribution recording | ProjectCashFlowsTab.jsx | MISSING |
| D6 | Add bulk capital call recording | ProjectCashFlowsTab.jsx | MISSING |
| D7 | Add project financial summary | ProjectDetail tabs | MISSING |

---

## PHASE 11: Functional Fixes — Sprint E (Investor UX)

| # | Task | File(s) | Type |
|---|------|---------|------|
| E1 | Dashboard project cards drill down to detail | Overview.jsx | UX |
| E2 | Add tab interface to investment detail | Portfolio.jsx | UX |
| E3 | Add empty states to all pages | All pages | UX |
| E4 | Make dashboard recent messages clickable | Overview.jsx | UX |
| E5 | Add distribution detail view | DistributionsPage.jsx | MISSING |
| E6 | Add standalone capital account summary | Portfolio.jsx | MISSING |

---

## PHASE 12: Functional Fixes — Sprint F (Notifications)

| # | Task | File(s) | Type |
|---|------|---------|------|
| F1 | Create activity/notification log page | ActivityPage.jsx | MISSING |
| F2 | Wire notification bell to activity page | App shell | MISSING |
| F3 | Add email on distribution recorded | server/routes/finance.js | MISSING |
| F4 | Add email on capital call recorded | server/routes/finance.js | MISSING |
| F5 | Add mark-as-read on notifications | ActivityPage.jsx, api.js | MISSING |

---

## PHASE 13: Functional Fixes — Sprint G (Permissions & Prospects)

| # | Task | File(s) | Type |
|---|------|---------|------|
| G1 | Create prospect interest backend | server/routes/prospects.js | MISSING |
| G2 | Wire ProspectPortal to real API (not hardcoded) | ProspectPortal.jsx | BROKEN |
| G3 | Add prospect → investor conversion | ProspectManager.jsx, server | MISSING |
| G4 | Add investor permission customization | InvestorProfile.jsx, server | MISSING |

---

## PHASE 14: Functional Fixes — Sprint H (Security & Profile)

| # | Task | File(s) | Type |
|---|------|---------|------|
| H1 | Add copy-to-clipboard for MFA backup codes | SecuritySection.jsx | UX |
| H2 | Fix password validation mismatch (frontend vs backend) | SecuritySection.jsx, server | BROKEN |
| H3 | Add login history pagination | SecuritySection.jsx | UX |
| H4 | Add profile fields (phone, address, banking) | ProfilePage.jsx, server | MISSING |
| H5 | Add session management | SecuritySection.jsx | MISSING |
| H6 | Mobile capital account responsive fix | CapTablePage.jsx | UX |

---

## PHASE 15: Functional Fixes — Sprint I (Demo Mode)
*Covered by Phase 4 — skip if already done*

---

## PHASE 16: Functional Fixes — Sprint J (Data Integrity)

| # | Task | File(s) | Type |
|---|------|---------|------|
| J1 | Add CASCADE delete rules to Prisma schema | prisma/schema.prisma | CRITICAL |
| J2 | Encrypt tax IDs at rest | server/services, schema | CRITICAL |
| J3 | Mask tax IDs in API responses (show last 4 only) | server/routes/entities.js | CRITICAL |
| J4 | Add input validation to financial endpoints | server/routes/finance.js | MISSING |
| J5 | Wrap multi-step operations in transactions | server/routes/admin.js | MISSING |
| J6 | Add remove-investor-from-project endpoint | server/routes/admin.js | MISSING |

---

## PHASE 17: Functional Fixes — Sprint K (Audit Logging)

| # | Task | File(s) | Type |
|---|------|---------|------|
| K1 | Add audit logging to 20+ missing actions | server/routes/*.js | CRITICAL |
| K2 | Add old/new value comparison to audit log | server/services/audit.js | MISSING |
| K3 | Add date range filter to audit log | AuditLogViewer.jsx | UX |
| K4 | Add CSV export for audit log | AuditLogViewer.jsx | MISSING |
| K5 | Add createdAt index to AuditLog | prisma/schema.prisma | PERF |

---

## PHASE 18: Functional Fixes — Sprint L (Reporting & Lifecycle)

| # | Task | File(s) | Type |
|---|------|---------|------|
| L1 | Add CSV export of investor list | InvestorManager.jsx | MISSING |
| L2 | Add group filter to investor list | InvestorManager.jsx | MISSING |
| L3 | Add group-based message targeting | AdminInbox.jsx | MISSING |
| L4 | Add capital account statement PDF generation | StatementManager.jsx | MISSING |
| L5 | Add investor statement portal access | Portfolio.jsx | MISSING |
| L6 | Add investor activity timeline | InvestorProfile.jsx | MISSING |

---

## PHASE 19: Accessibility (Sprint M)
**Agent:** Sonnet builder
**Reviewer:** Opus QA gate

### 28 Issues to Fix
| Category | Count | Key Items |
|----------|-------|-----------|
| Semantic HTML | 8 | Replace span onClick with button, add proper roles |
| ARIA attributes | 6 | aria-sort on tables, aria-selected on tabs, aria-label on badges |
| Focus management | 5 | Modal focus trap, skip-to-content link, keyboard tab nav |
| Form labels | 4 | htmlFor/id linking, required indicators |
| Color contrast | 3 | Status badges, muted text ratios |
| Screen reader | 2 | aria-live regions for dynamic content |

### Acceptance Criteria
- [ ] All interactive elements use button/a (not div/span onClick)
- [ ] All form inputs have linked labels
- [ ] All modals trap focus and close on Escape
- [ ] All tabs are keyboard navigable with arrow keys
- [ ] All tables have aria-sort on sortable headers
- [ ] All status badges have aria-label
- [ ] Skip-to-content link on every page

---

## PHASE 20: Responsive Design (Sprint N)
**Agent:** Sonnet builder
**Reviewer:** Opus QA gate

### 22 Issues to Fix
| Category | Count | Key Items |
|----------|-------|-----------|
| Grid breakpoints | 6 | Stat cards, project grids → auto-fill |
| Table stacking | 5 | Tables → card layout below 768px |
| Form stacking | 4 | Forms → single column below 768px |
| Modal sizing | 3 | max-width: min(90vw, 520px) |
| Tab overflow | 2 | overflow-x: auto on mobile |
| Toast position | 1 | Don't hide behind mobile keyboard |
| Nav collapse | 1 | Hamburger menu on mobile |

### Acceptance Criteria
- [ ] All grids use repeat(auto-fill, minmax(Xpx, 1fr))
- [ ] All tables stack to cards below 768px
- [ ] All forms single-column below 768px
- [ ] Modals fit on 320px screen
- [ ] No horizontal scroll on any page at 375px width

---

## AGENT DEFINITIONS

### 1. Builder Agent (Sonnet)
**Purpose:** Execute single coding tasks
**Config:** `.claude/agents/builder.md`
**Model:** claude-sonnet-4-6
**Tools:** Read, Edit, Write, Bash, Grep, Glob
**When to use:** Every coding task

### 2. Peer Review Gate (Opus via bash)
**Purpose:** Validate Sonnet's work before proceeding
**Checks:** Commits exist, build passes, tag mismatches, phantom imports, hardcoded colors, code diff review
**When to use:** After every round of builder tasks

### 3. QA Auditor (Opus interactive)
**Purpose:** Deep audit of completed phases
**Config:** `.claude/commands/audit.md`
**When to use:** After completing each major phase (end of Phase 0, end of extraction, end of each sprint)

### 4. Test Runner Agent (Sonnet)
**Purpose:** Run tests, verify coverage, fix failures
**When to use:** After Phase 5 (smoke tests), after each sprint

### 5. Doc Updater Agent (Sonnet)
**Purpose:** Update all documentation to reflect current state
**When to use:** After each phase completes

---

## PERMISSION MATRIX

### Role: INVESTOR
| Module | View | Create | Edit | Delete |
|--------|------|--------|------|--------|
| Dashboard | Own projects | — | — | — |
| Portfolio | Own investments | — | — | — |
| Documents | Assigned docs | — | — | — |
| Distributions | Own distributions | — | — | — |
| Messages | Own threads | New thread | Reply | — |
| Profile | Own profile | — | Edit own | — |
| Security | Own MFA/password | Setup MFA | Change password | Disable MFA |
| Capital Account | Own accounts | — | — | — |
| Entities | Own entities | Create | Edit own | Delete own |
| Notifications | Own notifications | — | Mark read | — |
| Financial Modeler | Scenarios | Create scenario | — | — |

### Role: ADMIN
| Module | View | Create | Edit | Delete |
|--------|------|--------|------|--------|
| All investor modules | All data | — | — | — |
| Projects | All | Create | Edit all | Delete |
| Investors | All | Invite | Edit, Approve, Lock/Unlock | Deactivate |
| Documents | All | Upload | Assign | Delete |
| Statements | All | Generate | Approve/Reject | — |
| Staff | All | Create | Edit roles | Deactivate |
| Groups | All | Create | Edit members | Delete |
| Signatures | All | Request | Cancel | — |
| Audit Log | All | — | — | — |
| Email Settings | All | — | Configure | — |
| Prospects | All | — | Update status | — |

### Role: GP
Same as ADMIN but with portfolio-level financial controls (waterfall, distributions).

---

## TEST PLAN

### Tier 1: Smoke Tests (Phase 5)
Every page/manager renders without crash in demo mode.

### Tier 2: Module Functionality Tests
| Module | Test Cases |
|--------|-----------|
| Auth | Login success, login fail, MFA flow, password reset, session timeout |
| Dashboard | Shows stats, project cards link to detail, empty state for new users |
| Portfolio | Lists projects, drill down to detail, shows IRR/MOIC correctly |
| Documents | List, filter, download triggers tracking, sign flow |
| Distributions | List, filter by project, detail view |
| Messages | List threads, create thread, reply, mark read |
| Profile | Edit fields, save, entity CRUD |
| Security | MFA setup, backup codes, password change, login history |
| Cap Table | View entries, ownership percentages |
| Financial Modeler | Run scenario, adjust parameters, view results |
| Admin Dashboard | Stats, pending items, quick actions |
| Project Management | CRUD, detail tabs, updates, cash flows |
| Investor Management | List, invite, approve, deactivate, KPI edit |
| Document Management | Upload, assign, delete, K-1 bulk upload |
| Statement Management | Generate, approve, reject, send |
| Signature Management | Request, track status, cancel, resend |
| Group Management | Create, add members, remove members, delete |
| Staff Management | Create, edit roles, deactivate |
| Audit Log | View, filter, export CSV |
| Email Settings | Configure provider, test send |
| Prospect Management | List, update status, convert to investor |

### Tier 3: UI/UX Validation
| Check | How |
|-------|-----|
| Responsive 375px | All pages render, no horizontal scroll |
| Responsive 768px | Tables stack, forms stack |
| Responsive 1024px | Grids reflow |
| Empty states | Every list shows empty state when data is [] |
| Loading states | Every data fetch shows spinner |
| Error states | API failures show error banner with retry |
| Accessibility | Tab navigation works, screen reader announces |
| Demo mode | Full app works with VITE_DEMO_MODE=true |

### Tier 4: Security Tests (Existing — 107 tests)
- Auth: login, logout, session
- RBAC: role-based endpoint access
- IDOR: cross-user data access prevention
- MFA: setup, verify, backup codes

---

## EXECUTION TIMELINE

| Phase | Tasks | Parallelism | Est. Rounds |
|-------|-------|-------------|-------------|
| 0 | Wire components | 2 parallel | 7 rounds |
| 2 | Extract App.jsx pages | 2-3 parallel | 6 rounds |
| 3 | Extract Admin.jsx managers | 2-3 parallel | 8 rounds |
| 4 | Demo mode fixes | 1 (single file) | 1 round |
| 5 | Smoke tests | 1 | 1 round |
| 6 | Doc updates | 1 | 1 round |
| 7-18 | Functional fixes (12 sprints) | 2 parallel per sprint | 12 rounds |
| 19 | Accessibility | 2 parallel | 3 rounds |
| 20 | Responsive | 2 parallel | 3 rounds |
| **TOTAL** | | | **~42 rounds** |

---

## MEMORY FILES NEEDED

| Memory | Purpose | When Created |
|--------|---------|-------------|
| agent-memory.md | Autopilot state between rounds | Auto-updated |
| phase-completion.md | Which phases are done | After each phase |
| known-bugs.md | Bugs found during extraction | During work |
| component-api.md | Component props reference | Phase 0 |
| test-results.md | Test pass/fail tracking | Phase 5+ |

---

## AUTOPILOT CONFIGURATION

### For Phases 0-6 (Extraction)
```bash
cd /home/pc/northstar-portal && ./scripts/autopilot.sh
```
Current script handles Phase 0. After Phase 0 completes, the script needs updating with Phase 2-6 rounds.

### For Phases 7-18 (Functional Fixes)
New autopilot script per sprint, or extend current script with sprint-specific rounds.

### For Phases 19-20 (Polish)
Dedicated accessibility and responsive fix scripts.

---

## SUCCESS CRITERIA

The project is complete when:
1. Admin.jsx < 150 lines (routing shell)
2. App.jsx < 150 lines (routing shell)
3. All 14 components imported and used
4. All 12 App.jsx pages extracted to src/pages/
5. All 14+ Admin.jsx managers extracted to src/admin/
6. All 120 API functions have demo fallbacks
7. npm run build passes
8. npm test passes (smoke tests)
9. All 9 critical issues resolved
10. All 4 blockers resolved
11. All 14 broken features fixed
12. Demo mode works end-to-end
13. No horizontal scroll at 375px
14. All forms have labels, all buttons are semantic
15. Existing 107 backend tests still pass
