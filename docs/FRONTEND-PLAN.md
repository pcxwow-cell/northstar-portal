# Northstar Portal — Frontend Refactor Plan

> Date: 2026-03-18
> Status: In progress — Phase 0 (partial) + Phase 1 (partial) complete
> Scope: Decompose 2 monolithic files (8,132 lines) into focused modules without breaking demo mode or visual design

## Completed

| Commit | Description | Date |
|--------|-------------|------|
| e3c9bf6 | Wire ToastContext into App.jsx — remove local useToast/ToastContainer, update 27 call sites | 2026-03-18 |
| e02a6fc | Wire shared components into Admin.jsx — Spinner, EmptyState, ConfirmDialog; wire toast via context | 2026-03-18 |
| 01570ad | Add AdminDataContext, eliminate 6 redundant API calls (DocumentManager, StatementManager, GroupManager, AdminInbox) | 2026-03-18 |

---

## Current Reality

### What exists
| File | Lines | useState | useEffect | Role |
|------|-------|----------|-----------|------|
| Admin.jsx | 4,796 | ~160 | 19 | 15 manager sub-components in one file |
| App.jsx | 3,336 | ~100 | 12 | Auth + 10 pages + session + toast in one file |
| ProspectPortal.jsx | 903 | — | — | Standalone, already reasonable size |
| api.js | 950 | — | — | 127 API functions, 22 missing demo fallbacks |
| data.js | 193 | — | — | Static demo data |

### What was attempted but never wired up
Phase 0-1 from the old plan was partially executed. These files **exist** but are **not imported** by Admin.jsx or App.jsx:

- `src/components/` — 14 files (Button, Card, Modal, etc.), 11-69 lines each
- `src/hooks/` — 4 files (useDataFetch, useFilters, usePagination, useWindowWidth)
- `src/context/` — 2 files (ToastContext, AuthContext)
- `src/styles/theme.js` — design tokens

**Total: 529 lines of dead code.** The monoliths still contain their own inline versions of everything.

### Key problems the old plan didn't address

1. **State ownership is tangled.** Admin.jsx fetches `projects` in 5 different managers independently. `investors` is fetched 3 times. There's no shared data layer — each manager re-fetches on mount.

2. **Extraction isn't clean cut-and-paste.** Managers share closures, callback functions, and navigation state from the parent component. You can't just move lines — you need to identify dependency boundaries.

3. **Big-bang commits are too risky.** "Split Admin.jsx into 14 files (1 commit)" means a single commit changes 4,796 lines. If anything breaks, you're debugging a haystack.

4. **Feature fix paths go stale.** FEATURE-FIX-PLAN.md references `src/Admin.jsx:3375` but after extraction that code lives in `src/admin/AdminInbox.jsx`. Every sprint task needs path updates.

5. **No verification step.** The plan says "verify the app renders" but doesn't define how. There are zero frontend tests.

---

## This Plan: Incremental Extraction with Verification

### Core principles

1. **One manager per commit.** Extract one manager, verify it renders, commit. Never batch multiple extractions.
2. **State audit before extraction.** Document what each manager reads and writes before moving it.
3. **Shared data via context, not props.** Create data contexts for frequently-fetched resources (projects, investors).
4. **Components-first.** Wire up the existing dead components before extracting managers — this reduces each manager's line count before the move.
5. **Smoke test after every commit.** Dev server must start, login must work, extracted page must render, demo mode must work.

---

## Phase 0: Wire Up Existing Components (2 commits)

The 14 component files and 4 hooks already exist. They just need to be imported.

### Commit 0A: Wire components into App.jsx

Replace inline patterns in App.jsx with imports from `src/components/`. Work top-to-bottom through the file:

| Pattern to replace | Component | Estimated occurrences |
|--------------------|-----------|-----------------------|
| Inline `<button style={{...btnStyle}}>` | `<Button>` | ~30 |
| Inline `<div style={{background:'#fff', borderRadius:8, boxShadow:...}}>` | `<Card>` | ~15 |
| Inline label + input pairs | `<FormInput>` | ~25 |
| Inline stat number + label boxes | `<StatCard>` | ~8 |
| Inline colored pill spans | `<StatusBadge>` | ~6 |
| Inline tab button rows | `<Tabs>` | ~3 |
| Inline modal overlay + box | `<Modal>` | ~4 |
| Inline "No data" messages | `<EmptyState>` | ~5 |
| Section title + right element | `<SectionHeader>` | ~4 |
| Inline loading spinner | `<Spinner>` | ~5 |
| `window.confirm()` calls | `<ConfirmDialog>` | ~3 |
| Inline search + filter dropdowns | `<SearchFilterBar>` | ~3 |
| Inline sortable tables | `<DataTable>` | ~4 |

**Also wire up:**
- Replace App.jsx's internal toast system (lines 73-82) with `ToastContext`
- Replace `useWindowWidth` inline hook with import from `src/hooks/useWindowWidth.js`

**Verification:** `npm run dev` → login as investor → navigate every page → verify demo mode

**Commit:** `Wire shared components into App.jsx`

### Commit 0B: Wire components into Admin.jsx

Same process for Admin.jsx. Larger file, more replacements:

| Pattern | Component | Estimated occurrences |
|---------|-----------|-----------------------|
| Inline buttons | `<Button>` | ~50 |
| Inline card containers | `<Card>` | ~28 |
| Inline form inputs | `<FormInput>` | ~35 |
| Inline stat cards | `<StatCard>` | ~12 |
| Inline status badges | `<StatusBadge>` | ~14 |
| Inline tab rows | `<Tabs>` | ~3 |
| Inline modals | `<Modal>` | ~6 |
| Inline empty states | `<EmptyState>` | ~3 |
| `window.confirm()` | `<ConfirmDialog>` | ~5 |
| Inline search bars | `<SearchFilterBar>` | ~5 |
| Inline sortable tables | `<DataTable>` | ~8 |

**Also wire up:**
- Replace Admin.jsx toast prop drilling with `ToastContext`
- Import `useFilters` hook where applicable (InvestorManager, DocumentManager sections)

**Verification:** `npm run dev` → login as admin → navigate every manager view → verify demo mode

**Commit:** `Wire shared components into Admin.jsx`

**Expected result:** Both files shrink by ~30-40% from component replacement alone. No behavior changes — just import swaps.

---

## Phase 1: State Audit & Context Layer (1 commit)

Before extracting any managers, document and solve the shared state problem.

### 1A: State ownership map

Each Admin.jsx manager's state falls into one of three categories:

| Category | Examples | Solution |
|----------|----------|----------|
| **App-level** (navigation, auth) | `view`, `profileId`, `projectDetailId`, `peopleTab`, `docsTab` | Stay in Admin.jsx shell |
| **Shared data** (fetched by 3+ managers) | `projects` list, `investors` list | New `AdminDataContext` |
| **Local** (form state, UI toggles) | `showCreate`, `search`, `editing`, `confirmAction` | Move with the manager |

### 1B: Create AdminDataContext

```
src/context/AdminDataContext.jsx
```

This context provides:
```javascript
{
  projects,        // fetched once, shared by 5 managers
  reloadProjects,  // refetch after create/update/delete
  investors,       // fetched once, shared by 3 managers
  reloadInvestors, // refetch after invite/approve/deactivate
  loading,         // initial load state
}
```

Currently `fetchAdminProjects()` is called independently by ProjectManager, InvestorManager, DocumentManager, StatementManager, and AdminInbox. `fetchAdminInvestors()` is called by DocumentManager, GroupManager, and AdminInbox. This context eliminates 7 redundant API calls on admin load.

### 1C: Create InvestorDataContext

```
src/context/InvestorDataContext.jsx
```

App.jsx loads all investor data in one `Promise.all` on login (line 2987). This context wraps that pattern:

```javascript
{
  investor,         // current user
  myProjects,       // investor's project assignments
  allProjects,      // all visible projects
  allDocuments,     // investor's documents
  allDistributions, // investor's distributions
  messages,         // message previews
  loading,          // initial load
  reload,           // full refresh
}
```

### 1D: Wire toast via context

Replace all `toast` prop passing in Admin.jsx with `useToast()` from existing `ToastContext.jsx`. This removes the #1 prop that every single manager receives.

**Verification:** Same behavior, fewer props. Every manager should still show toasts.

**Commit:** `Add data contexts, wire toast context, eliminate redundant fetches`

---

## Phase 2: Extract App.jsx Pages (12 commits)

Extract one page per commit, smallest and most isolated first.

### Extraction order (by isolation — fewest dependencies first)

| # | Page | Lines | Dependencies | Risk |
|---|------|-------|-------------|------|
| 1 | ResetPassword | 2740-2812 | None (standalone) | Trivial |
| 2 | Activity | 2875-2936 | `fetchNotifications` | Trivial |
| 3 | Distributions | 1390-1442 | `allDistributions`, `myProjects` from context | Low |
| 4 | FinancialModeler | 1678-1852 | `myProjects`, `runFinancialModel` | Low |
| 5 | CapTable | 948-1155 | `myProjects`, `calculateWaterfallApi` | Low |
| 6 | Documents | 1156-1389 | `allDocuments`, signing state | Medium |
| 7 | Messages | 1443-1677 | Thread state, compose, reply | Medium |
| 8 | Profile | 2120-2352 | `user`, entities, notif prefs, `onUpdate` | Medium |
| 9 | Security | 1880-2119 | MFA flow (19 useState calls) | Medium |
| 10 | Portfolio | 689-947 | Selected project, capital account, cash flows | Medium |
| 11 | Overview | 478-688 | `myProjects`, `allDocuments`, `msgs`, navigation | High |
| 12 | Login | 2353-2739 | Auth flow, MFA, `onLogin` callback | High |

### Extraction process (same for each page)

```
1. Create src/pages/[PageName].jsx
2. Copy the component function and its local state
3. Replace data props with useContext(InvestorDataContext)
4. Replace toast prop with useToast()
5. Replace onNavigate prop with a passed callback or context
6. Import shared components (Button, Card, etc.)
7. Delete the code from App.jsx, add import + render
8. npm run dev → test the page → test demo mode
9. Commit: "Extract [PageName] from App.jsx"
```

### After all 12 extractions, App.jsx becomes (~150 lines):

```javascript
// App.jsx — Application shell
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { InvestorDataProvider } from "./context/InvestorDataContext";
// ... page imports

function App() {
  const [view, setView] = useState("overview");
  const [navParams, setNavParams] = useState({});
  const { authed, user } = useAuth();

  const navigateTo = (page, params) => { setView(page); setNavParams(params || {}); };

  if (!authed) return <Login onLogin={handleLogin} />;

  const Page = pages[view];
  return (
    <InvestorDataProvider user={user}>
      <Header view={view} onNavigate={navigateTo} />
      <main><Page navParams={navParams} onNavigate={navigateTo} /></main>
      <Footer />
    </InvestorDataProvider>
  );
}
```

### Utilities to extract alongside pages

| Utility | Current location | New location | Used by |
|---------|-----------------|-------------|---------|
| `useSessionTimeout` | App.jsx:2814-2844 | `src/hooks/useSessionTimeout.js` | App shell |
| `SessionWarningModal` | App.jsx:2846-2873 | `src/components/SessionWarningModal.jsx` | App shell |
| `PasswordStrengthBar` | inline in Security | `src/components/PasswordStrengthBar.jsx` | Security, Login |
| `AnimatedNumber` | App.jsx:455-475 | `src/components/AnimatedNumber.jsx` | Overview |
| `Table` (internal) | App.jsx:157-213 | Merge into `DataTable.jsx` | Multiple pages |

---

## Phase 3: Extract Admin.jsx Managers (14 commits)

Same incremental approach — one manager per commit, isolated first.

### Extraction order

| # | Manager | Lines | Dependencies | Risk |
|---|---------|-------|-------------|------|
| 1 | AuditLog | 4415-4506 | `fetchAuditLog` | Trivial |
| 2 | EmailSettings | 4508-4797 | Email API functions | Low |
| 3 | SignatureManager | 3830-3911 | `fetchSignatureRequests` | Low |
| 4 | ProspectManager | 3913-4090 | Prospect API functions | Low |
| 5 | GroupManager | 2733-2909 | `investors` from context | Low |
| 6 | StaffManager | 2994-3205 | Staff API + flags | Low |
| 7 | AdminInbox | 4092-4413 | `projects`, `investors` from context, thread state | Medium |
| 8 | StatementManager | 3207-3828 | `projects` from context, 28 useState calls | Medium |
| 9 | AdminDashboard | 277-466 | Multiple fetch calls, navigation callbacks | Medium |
| 10 | ProjectManager | 469-691 | `projects` from context, create form | Medium |
| 11 | InvestorManager | 725-910 | `investors` from context, invite/approve | Medium |
| 12 | DocumentManager | 1589-2031 | 36 useState calls, bulk K-1, signatures | High |
| 13 | InvestorProfile | 2033-2286 | Profile fetch, entities, assignment | High |
| 14 | ProjectDetail | 923-1587 | 52 useState calls, 7 tabs, cash flows, waterfall, model | Highest |

### ProjectDetail sub-extraction (commit 14, then 3 follow-ups)

ProjectDetail is 664 lines with 52 useState calls. After initial extraction, split further:

| Sub-component | Content | File |
|---------------|---------|------|
| ProjectOverviewTab | KPI editing, org chart | `src/admin/ProjectOverviewTab.jsx` |
| ProjectInvestorsTab | Investor list, add investor, distribution recording | `src/admin/ProjectInvestorsTab.jsx` |
| ProjectUpdatesTab | Update list, create update | `src/admin/ProjectUpdatesTab.jsx` |
| ProjectCashFlowsTab | Cash flow table, record/edit modal | `src/admin/ProjectCashFlowsTab.jsx` |
| ProjectWaterfallTab | Waterfall tiers, cap table | `src/admin/ProjectWaterfallTab.jsx` |
| ProjectDocumentsTab | Document list filtered to project | `src/admin/ProjectDocumentsTab.jsx` |
| ProjectModelTab | Financial modeler | `src/admin/ProjectModelTab.jsx` |

**Commit each sub-extraction separately.**

### After all extractions, Admin.jsx becomes (~120 lines):

```javascript
// Admin.jsx — Admin shell
import { AdminDataProvider } from "./context/AdminDataContext";
import { ToastProvider } from "./context/ToastContext";
// ... manager imports

function AdminPanel() {
  const [view, setView] = useState("dashboard");
  const [profileId, setProfileId] = useState(null);
  const [projectDetailId, setProjectDetailId] = useState(null);
  const [peopleTab, setPeopleTab] = useState("investors");
  const [docsTab, setDocsTab] = useState("documents");

  const Manager = managers[view];
  return (
    <AdminDataProvider>
      <Sidebar view={view} onNavigate={setView} />
      <main>
        <Manager
          onViewProfile={setProfileId}
          onViewProject={setProjectDetailId}
        />
      </main>
    </AdminDataProvider>
  );
}
```

---

## Phase 4: Fix Demo Mode (1 commit)

### 4A: Add missing demo fallbacks

22 admin write functions in api.js have no demo fallback. For each:

```javascript
export async function updateProject(id, data) {
  if (_demoMode) {
    console.log("[Demo] updateProject", id, data);
    return { ...data, id, updatedAt: new Date().toISOString() };
  }
  return apiFetch(`/admin/projects/${id}`, { method: "PUT", body: data });
}
```

**Functions needing fallbacks (22):**

Admin write operations:
- `updateProject`, `postUpdate`, `deleteProject`
- `inviteInvestor`, `updateInvestor`, `approveInvestor`, `deactivateInvestor`, `unlockInvestor`, `resetInvestorPassword`, `assignInvestorProject`, `updateInvestorKPI`
- `createGroup`, `updateGroup`, `deleteGroup`, `fetchGroupDetail`, `addGroupMembers`, `removeGroupMember`
- `createStaff`, `updateStaff`, `deactivateStaff`, `reactivateStaff`, `resetStaffPassword`
- `deleteDocument`, `assignDocument`
- `createCapTableEntry`, `updateCapTableEntry`, `deleteCapTableEntry`
- `createWaterfallTier`, `updateWaterfallTier`, `deleteWaterfallTier`
- `recordBulkDistribution`, `recordBulkCapitalCall`
- `updateWaterfall`

### 4B: Fix response shape mismatches

| Function | Problem | Fix |
|----------|---------|-----|
| `fetchAdminProjectDetail()` | Demo flattens `waterfall` fields, live doesn't | Normalize in component, not api.js |
| `fetchAdminDocuments()` | Demo adds `totalInvestors`, `viewed`, `downloaded` | Add same fields to live response |
| `fetchInvestorProfile()` | Demo returns complex nested structure | Document the expected shape, ensure live matches |

### 4C: Add demo mode indicator

When `isDemoMode()` returns true, show a persistent banner:
```
⚠ Demo Mode — Data is simulated. Changes won't be saved.
```

**Commit:** `Add demo fallbacks for 22 admin write functions, fix response shapes`

---

## Phase 5: Smoke Tests (1 commit)

Add minimal render tests that catch white-screen regressions.

```
src/__tests__/
  smoke.test.jsx    # Does each page render without crashing?
```

Using Vite's test runner (vitest):

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

```javascript
// smoke.test.jsx
import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";

// Test each extracted page renders without crashing
const pages = [
  ["Overview", () => import("../pages/Overview")],
  ["Portfolio", () => import("../pages/Portfolio")],
  ["Documents", () => import("../pages/Documents")],
  ["Messages", () => import("../pages/Messages")],
  ["Login", () => import("../pages/Login")],
  // ... all pages
];

describe.each(pages)("%s page", (name, importFn) => {
  it("renders without crashing", async () => {
    const { default: Page } = await importFn();
    // Wrap in necessary providers
    expect(() => render(
      <TestProviders>
        <Page />
      </TestProviders>
    )).not.toThrow();
  });
});
```

**Commit:** `Add smoke tests for all extracted pages`

---

## Phase 6: Update Feature Fix Paths (1 commit)

After phases 2-3, every sprint task in FEATURE-FIX-PLAN.md references stale paths. Update all:

| Old path | New path |
|----------|----------|
| `src/App.jsx:486-509` | `src/pages/Overview.jsx` |
| `src/App.jsx:497` | `src/pages/Overview.jsx` |
| `src/App.jsx:524` | `src/pages/Overview.jsx` |
| `src/App.jsx:652-812` | `src/pages/Portfolio.jsx` |
| `src/App.jsx:1199` | `src/pages/Documents.jsx` |
| `src/App.jsx:1223-1248` | `src/pages/Documents.jsx` |
| `src/App.jsx:1310-1323` | `src/pages/Distributions.jsx` |
| `src/App.jsx:1817-1821` | `src/pages/Security.jsx` |
| `src/App.jsx:1926-1930` | `src/pages/Security.jsx` |
| `src/App.jsx:1954` | `src/pages/Security.jsx` |
| `src/App.jsx:1971-2077` | `src/pages/Profile.jsx` |
| `src/App.jsx:3003-3009` | `src/App.jsx` (shell) |
| `src/Admin.jsx` (all refs) | `src/admin/[ManagerName].jsx` |
| `src/Admin.jsx:3375-3417` | `src/admin/AdminInbox.jsx` |
| `src/Admin.jsx:3400` | `src/admin/AdminInbox.jsx` |
| `src/Admin.jsx:971` | `src/admin/ProjectDetail.jsx` |
| `src/Admin.jsx:1356-1375` | `src/admin/DocumentManager.jsx` |

Also update: WORKFLOW-AUDIT.md, DEEP-AUDIT.md, UI-REVIEW.md, build command.

**Commit:** `Update all doc references to match new file structure`

---

## Commit Summary

| Phase | Commits | What happens |
|-------|---------|-------------|
| 0: Wire components | 2 | App.jsx and Admin.jsx import existing components. Files shrink ~35% |
| 1: State & context | 1 | AdminDataContext, InvestorDataContext, toast wiring |
| 2: Extract App.jsx | 12 | One page per commit → App.jsx becomes 150-line shell |
| 3: Extract Admin.jsx | 14+3 | One manager per commit + ProjectDetail sub-splits → Admin.jsx becomes 120-line shell |
| 4: Demo mode | 1 | 22 missing fallbacks, shape fixes, demo banner |
| 5: Smoke tests | 1 | Vitest + render tests for every page |
| 6: Update docs | 1 | Fix all stale file paths in audit/plan docs |
| **Total** | **~35** | |

---

## Verification Checklist (run after EVERY commit)

```bash
# 1. Dev server starts
npm run dev

# 2. Login works (both roles)
# - Investor: j.chen@pacificventures.ca / northstar2025
# - Admin: admin@northstardevelopment.ca / admin2025

# 3. The extracted page renders
# - Navigate to the page that was just extracted
# - Check: no white screen, no console errors, data loads

# 4. Demo mode works
# - Stop backend (or set VITE_DEMO_MODE=true)
# - Repeat steps 2-3
# - Verify: no crashes, static data appears

# 5. Other pages still work
# - Quick-check 2-3 other pages didn't break
```

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Closure references break when moving code | High | Page crashes | State audit in Phase 1 identifies all dependencies before extraction |
| Demo mode breaks silently | High | Vercel shows blank page | Verification checklist step 4 after every commit |
| Component prop mismatch | Medium | Render errors | Existing components are small (11-69 lines) and well-defined |
| Context re-render storms | Medium | Performance regression | Keep contexts narrow (data + reload only, no UI state) |
| ProjectDetail extraction too complex | High | Merge conflicts, bugs | Extract shell first, then split tabs one at a time (4 commits total) |
| Line numbers drift mid-extraction | High | Wrong code moved | Search by function name, not line number |

---

## What This Plan Does NOT Cover

These are handled by separate plans after the frontend architecture is clean:

- **Functional fixes** (Sprints A-L) → see `docs/FEATURE-FIX-PLAN.md`
- **Accessibility** (Sprint M) → see `docs/REFACTOR-PLAN.md` Phase 6
- **Responsive design** (Sprint N) → see `docs/REFACTOR-PLAN.md` Phase 6
- **Backend changes** → backend is already well-structured (7.5/10)
- **TypeScript migration** → future consideration, not blocking
- **React Router** → future consideration; state-based navigation works for now

---

## Execution Rules

1. **Never extract two managers in the same commit.** One at a time.
2. **Never skip the verification checklist.** If it fails, fix before moving on.
3. **Search by function name, not line number.** Lines will drift.
4. **Don't refactor while extracting.** Move code as-is first, clean up in a separate commit.
5. **Don't rename variables during extraction.** Minimize diff size.
6. **If a manager has >300 lines after extraction, plan sub-splits** but do them in follow-up commits.
7. **Commit message format:** `Extract [ComponentName] from [App|Admin].jsx`
