# Northstar Portal — Comprehensive Refactor & Fix Plan

> **SUPERSEDED by `docs/FRONTEND-PLAN.md`** — This file is kept as reference for sprint details and component specs. The frontend extraction strategy in FRONTEND-PLAN.md replaces the phased approach below with incremental one-commit-per-manager extraction.

> Date: 2026-03-18
> Scope: Frontend architecture refactor + 107 unfixed functional issues
> Approach: Refactor first (make code changeable), then fix issues (make code correct)

---

## Why Refactor First

Adding 107 fixes to two 4,800-line and 3,300-line monolithic files will make them worse. Every fix touches the same files, creates merge conflicts, and increases the blast radius of bugs. The refactor takes ~3 hours but makes every subsequent fix faster, safer, and isolated.

---

## Phase 0: Tooling & Foundation (30 min)

### 0A: Add ESLint + Prettier
```
npm install -D eslint prettier eslint-config-prettier
```
Create `.eslintrc.json` and `.prettierrc`. Don't fix existing warnings — just prevent new ones.

### 0B: Create directory structure
```
src/
  components/       # Shared UI components
    Button.jsx
    Card.jsx
    EmptyState.jsx
    FormInput.jsx
    Modal.jsx
    ConfirmDialog.jsx
    SearchFilterBar.jsx
    SectionHeader.jsx
    Spinner.jsx
    StatCard.jsx
    StatusBadge.jsx
    Tabs.jsx
    Toast.jsx
    DataTable.jsx
  pages/             # Investor portal pages
    Overview.jsx
    Portfolio.jsx
    CapTable.jsx
    Documents.jsx
    Distributions.jsx
    Messages.jsx
    FinancialModeler.jsx
    Profile.jsx
    Security.jsx
    Activity.jsx
    Login.jsx
  admin/             # Admin panel pages
    AdminDashboard.jsx
    ProjectManager.jsx
    ProjectDetail.jsx
    InvestorManager.jsx
    InvestorProfile.jsx
    DocumentManager.jsx
    GroupManager.jsx
    StaffManager.jsx
    StatementManager.jsx
    SignatureManager.jsx
    ProspectManager.jsx
    AdminInbox.jsx
    AuditLog.jsx
    EmailSettings.jsx
  hooks/             # Custom hooks
    useDataFetch.js
    useFilters.js
    usePagination.js
  styles/            # CSS modules
    theme.js         # Design tokens (colors, spacing, typography)
    global.css       # Base styles, CSS custom properties
  context/           # React context providers
    ToastContext.jsx
    AuthContext.jsx
```

### 0C: Create design tokens (src/styles/theme.js)
Extract all duplicated constants into one file:
```javascript
export const colors = {
  red: "#EA2028",
  green: "#3D7A54",
  darkText: "#231F20",
  mutedText: "#767168",
  lightBorder: "#F0EDE8",
  cardBg: "#FAFAF8",
  surface: "#FAF9F7",
};

export const fonts = {
  sans: "'DM Sans', -apple-system, sans-serif",
  serif: "'Cormorant Garamond', Georgia, serif",
};

export const shadows = {
  card: "0 1px 4px rgba(0,0,0,.05), 0 4px 16px rgba(0,0,0,.03)",
  elevated: "0 4px 20px rgba(0,0,0,.08)",
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32, section: 48 };

export const radius = { sm: 4, md: 8, lg: 12, xl: 16 };

export const inputStyle = { /* the shared input style */ };
export const btnStyle = { /* primary button */ };
export const btnOutline = { /* outline button */ };
export const labelStyle = { fontSize: 11, color: "#888", display: "block", marginBottom: 4 };
```

---

## Phase 1: Extract Shared Components (2 hours)

Extract the 12 most-repeated patterns. Each becomes a single file in `src/components/`. Import everywhere they're used.

| Component | Replaces | Uses | Priority |
|-----------|----------|------|----------|
| `FormInput` | label + input pattern | 60+ | Highest |
| `Button` | btnStyle/btnOutline inline | 80+ | Highest |
| `Card` | section container with shadow | 43+ | High |
| `StatCard` | KPI number + label card | 20+ | High |
| `StatusBadge` | inline status pill | 20+ | High |
| `Tabs` | 5 different tab implementations | 6 | High |
| `Modal` | fixed overlay + content box | 10+ | High |
| `ConfirmDialog` | browser confirm() replacements | 8+ | High |
| `DataTable` | sortable table with empty state | 12+ | Medium |
| `SearchFilterBar` | search + dropdown filters | 8 | Medium |
| `EmptyState` | "no data" message | 8+ | Medium |
| `SectionHeader` | title with optional right element | 10+ | Medium |

**Rule**: Each component imports from `styles/theme.js`. No inline color values. No duplicated style objects.

---

## Phase 2: Split Admin.jsx into 14 Files (2 hours)

Extract each manager from Admin.jsx into its own file in `src/admin/`. The main Admin.jsx becomes a thin router (~100 lines) that imports and renders the active manager.

| File | Source Lines | Description |
|------|-------------|-------------|
| `AdminDashboard.jsx` | 277-466 | Dashboard with stats + pending items |
| `ProjectManager.jsx` | 469-691 | Project list, create, quick edit |
| `ProjectDetail.jsx` | 923-1587 | 7-tab project detail view |
| `InvestorManager.jsx` | 725-910 | Investor list, search, filter, invite |
| `InvestorProfile.jsx` | 2033-2286 | Investor detail, entities, assignments |
| `DocumentManager.jsx` | 1589-2031 | Document upload, K-1, signatures |
| `GroupManager.jsx` | 2733-2909 | Hierarchical group management |
| `StaffManager.jsx` | 2994-3205 | Staff CRUD + permission flags |
| `StatementManager.jsx` | 3207-3828 | Statement generation + approval |
| `SignatureManager.jsx` | 3830-3911 | Signature request tracking |
| `ProspectManager.jsx` | 3913-4090 | Prospect pipeline |
| `AdminInbox.jsx` | 4092-4413 | Admin messaging |
| `AuditLog.jsx` | 4415-4506 | Audit log viewer |
| `EmailSettings.jsx` | 4508-4797 | Email configuration |

**Shared admin state** (passed as props or via context):
- `toast(message, type)` — use ToastContext
- `darkText`, `red`, `green` etc. — import from theme.js
- `investors`, `projects` lists — fetched in each manager independently

**Sub-components to also extract:**
- `ProjectUpdatesTab.jsx` (lines 2341-2464)
- `ProjectCashFlowsTab.jsx` (lines 2466-2623)
- `InvestorCashFlowsSection.jsx` (lines 2625-2731)
- `ActivityTimeline.jsx` (lines 2288-2339)
- `CredentialDialog.jsx` (lines 695-723)
- `KPIInput.jsx` (lines 912-920)

---

## Phase 3: Split App.jsx into 12 Files (2 hours)

Same approach for the investor portal.

| File | Source Lines | Description |
|------|-------------|-------------|
| `Login.jsx` | 2353-2739 | Auth form + MFA |
| `Overview.jsx` | 478-688 | Investor dashboard |
| `Portfolio.jsx` | 689-947 | Investment detail |
| `CapTable.jsx` | 948-1155 | Cap table + waterfall calculator |
| `Documents.jsx` | 1156-1389 | Document library + signing |
| `Distributions.jsx` | 1390-1442 | Distribution history |
| `Messages.jsx` | 1443-1677 | Threaded messaging |
| `FinancialModeler.jsx` | 1678-1852 | Scenario modeling |
| `Security.jsx` | 1880-2119 | Password, MFA, sessions |
| `Profile.jsx` | 2120-2352 | Profile + entities + notifications |
| `Activity.jsx` | 2875-2936 | Notification/activity log |
| `ResetPassword.jsx` | 2740-2812 | Password reset flow |

**App.jsx becomes** the app shell (~200 lines): header, navigation, footer, ToastProvider, AuthContext, theme toggle, and a view switcher that renders the active page component.

---

## Phase 4: Custom Hooks (1 hour)

### useDataFetch(fetchFn, deps)
Replaces the 50+ useState+useEffect+try/catch patterns:
```javascript
const { data, loading, error, reload } = useDataFetch(() => fetchProjects(), []);
```

### useFilters(items, config)
Replaces search+filter+sort patterns repeated in every list view:
```javascript
const { filtered, search, setSearch, filters, setFilter, sort, setSort } = useFilters(investors, {
  searchFields: ["name", "email"],
  filterFields: ["status", "projectId"],
  defaultSort: { field: "name", dir: "asc" }
});
```

### usePagination(items, pageSize)
```javascript
const { page, pageItems, totalPages, next, prev, goTo } = usePagination(filtered, 25);
```

---

## Phase 5: Fix Functional Issues (Sprints A-L)

With the architecture clean, fixes are now isolated to specific files. Each sprint touches 2-4 files instead of 1 monolith.

### Sprint A: Onboarding Blockers (7 tasks)
**Files**: `server/routes/auth.js`, `src/admin/InvestorManager.jsx`, `src/pages/Overview.jsx`, `src/api.js`, `server/services/email/templates.js`

1. auth.js:33 — Return "Account pending approval" for PENDING users
2. InvestorManager.jsx — Add inline Approve/Reject buttons for PENDING rows
3. templates.js:239 — Change welcome email to mention approval needed
4. admin.js:386-394 — Return `emailSent: false` warning on email failure, show in CredentialDialog
5. api.js — Add `unlockInvestor(id)`. InvestorProfile.jsx — Add Unlock button when `lockedUntil` set
6. Overview.jsx — When `myProjects.length === 0`, show empty state message
7. Overview.jsx — IRR null check, show "—" instead of NaN%

### Sprint B: Document Download & Tracking (7 tasks)
**Files**: `src/pages/Documents.jsx`, `server/routes/admin.js`, `src/admin/DocumentManager.jsx`, `server/routes/signatures.js`

1. Documents.jsx — Change `window.open(d.file)` to `downloadDocument(d.id)`
2. Documents.jsx — Fix review modal "Open Full Document" same issue
3. admin.js:348 — Replace deleteMany+createMany with upsert logic
4. Documents.jsx sign modal — Add iframe PDF preview before signature
5. DocumentManager.jsx — Add signer status table (investor, status, signedAt)
6. DocumentManager.jsx — Add unmatched K-1 reassignment UI
7. DocumentManager.jsx — Add "Send Reminder" button for pending signers

### Sprint C: Messaging Fixes (7 tasks)
**Files**: `server/routes/threads.js`, `src/admin/AdminInbox.jsx`, `src/pages/Messages.jsx`

1. threads.js:131-186 — Add `notifyMany()` on thread creation
2. AdminInbox.jsx — Show read receipts (data already returned by backend)
3. Messages.jsx — **Remove read receipts from investor view** (privacy fix)
4. Both inbox views — Add search input (client-side filter by subject/body)
5. Both inbox views — Add sort dropdown (newest, oldest, unread first)
6. Remove dead code: admin.js:308-338 legacy messages endpoint, api.js sendMessage()
7. AdminInbox.jsx — Add `year: "numeric"` to timestamp format

### Sprint D: Admin Project & Financial CRUD (7 tasks)
**Files**: `src/admin/ProjectDetail.jsx`, `server/routes/admin.js`, `server/routes/finance.js`

1. Cap table CRUD — Add/edit/delete entries with backend endpoints
2. Waterfall tier editing — Make tiers editable, add/delete
3. ProjectDetail.jsx investors tab — Add "Add Investor" button with picker
4. ProjectDetail.jsx updates tab — Add photo upload (add `photoUrl` to ProjectUpdate model)
5. Bulk distribution recording — Enter total, split pro-rata, create CashFlow + update InvestorProject
6. Bulk capital call recording — Same pattern for capital calls
7. Project financial summary — Show aggregate totals (committed, called, distributed)

### Sprint E: Investor Portal UX (6 tasks)
**Files**: `src/pages/Overview.jsx`, `src/pages/Portfolio.jsx`, `src/pages/Distributions.jsx`, `src/pages/Messages.jsx`

1. Overview.jsx — Project cards drill down to specific project detail
2. Portfolio.jsx — Add tab interface (Overview, Documents, Updates, Distributions)
3. All pages — Add empty state messages for empty arrays
4. Overview.jsx — Make recent messages clickable (navigate to thread)
5. Distributions.jsx — Add detail view with waterfall breakdown on click
6. Add cross-project capital account summary view

### Sprint F: Notifications & Activity Log (5 tasks)
**Files**: `src/pages/Activity.jsx`, `src/App.jsx`, `server/routes/finance.js`, `server/routes/notifications.js`

1. Activity.jsx — Create activity/notification log page from NotificationLog table
2. App.jsx header — Wire bell to activity page instead of messages
3. finance.js — After recording distribution, call `notify()`
4. finance.js — After recording capital call, call `notify()`
5. notifications.js — Add `POST /notifications/:id/read` endpoint

### Sprint G: Prospects & Permissions (4 tasks)
**Files**: `server/routes/prospects.js`, `src/ProspectPortal.jsx`, `src/admin/ProspectManager.jsx`, `prisma/schema.prisma`

1. prospects.js — Ensure interest form POST saves data and emails admin
2. ProspectPortal.jsx — Replace hardcoded data with `fetchProjects()` + demo fallback
3. ProspectManager.jsx — Add "Convert to Investor" button
4. Add investor permission customization (permissions JSON field + admin toggles + backend checks)

### Sprint H: Security & Polish (6 tasks)
**Files**: `src/pages/Security.jsx`, `src/pages/Profile.jsx`, `src/pages/Portfolio.jsx`

1. Security.jsx — Add "Copy All Codes" button for MFA backup codes
2. Security.jsx — Add special char requirement to password validation
3. Security.jsx — Add login history pagination
4. Profile.jsx — Add phone, address fields
5. Add "Log out all other sessions" button + server-side session invalidation
6. Portfolio.jsx — Verify capital account grid collapses on mobile

### Sprint I: Demo Mode Resilience (3 tasks)
**Files**: `src/api.js`, `src/admin/*.jsx`

1. api.js — Add demo fallback to all 25 admin write functions
2. Fix document list/detail shape mismatch (project as string vs object)
3. Admin components — Show "Demo mode — changes not saved" toast on demo writes

### Sprint J: Data Integrity & Security (6 tasks)
**Files**: `prisma/schema.prisma`, `server/routes/entities.js`, `server/routes/finance.js`, `server/routes/admin.js`

1. schema.prisma — Add `onDelete: Cascade` to 10+ relationships. Run migration
2. entities.js — Encrypt tax IDs at rest (AES-256-GCM)
3. entities.js — Mask tax IDs in responses (`•••-••-1234`), full on `?full=true` with audit log
4. finance.js, admin.js — Add input validation (amounts > 0, email format, percentages 0-100)
5. finance.js — Wrap bulk operations in `prisma.$transaction()`
6. Add DELETE `/admin/investors/:userId/projects/:projectId` endpoint + UI

### Sprint K: Audit Logging (5 tasks)
**Files**: `server/routes/admin.js`, `server/routes/entities.js`, `server/routes/finance.js`, `prisma/schema.prisma`

1. Add audit logging to 20+ missing actions (deactivation, approval, KPI edits, waterfall changes, etc.)
2. Capture old/new values on update operations
3. Add date range filter to GET `/admin/audit-log`
4. Add CSV export endpoint GET `/admin/audit-log/export`
5. Add `@@index([createdAt])` to AuditLog model

### Sprint L: Admin Lifecycle & Reporting (6 tasks)
**Files**: `src/admin/InvestorManager.jsx`, `src/admin/AdminInbox.jsx`, `server/routes/statements.js`, `src/pages/Activity.jsx`

1. Add CSV export of investor list (backend endpoint + admin button)
2. Add group filter dropdown to investor list
3. Add "Send to Group" option in message compose
4. Add capital account statement PDF generation
5. Add investor statement portal access (Statements tab, GET `/statements/my`)
6. Add investor activity timeline in admin profile view

---

## Phase 6: Accessibility & Responsive Fixes (1 sprint)

### Sprint M: Accessibility (after refactor makes these easy)
**Files**: All `src/components/*.jsx`, `src/pages/*.jsx`

1. All `Tabs` components use `<button>` with `role="tab"` and `aria-selected`
2. All `Modal` components trap focus, have `role="dialog"` and `aria-modal="true"`
3. All `DataTable` sort headers have `aria-sort` attribute
4. All `StatusBadge` components include screen-reader text
5. All `FormInput` components link label to input with `htmlFor`/`id`
6. Notification toggles use actual `<input type="checkbox">`
7. Add skip-to-content link on admin panel
8. Fix toast positioning for mobile keyboards
9. Add `aria-live="polite"` to pending signatures section
10. Standardize date formatting across app

### Sprint N: Responsive Design (after components extracted)
Fix responsive issues in shared components (fixes propagate everywhere):

1. `StatCard` grid — Use CSS grid with `auto-fill, minmax(200px, 1fr)`
2. `DataTable` — Add responsive card mode below 768px
3. `FormInput` — Stack labels above inputs on mobile
4. `Modal` — Use `max-width: min(90vw, 520px)`
5. `Tabs` — Horizontal scroll or wrap on mobile
6. `SearchFilterBar` — Stack vertically below 600px
7. Prospect portal — Add responsive grid breakpoints
8. Profile/Security — Stack 2-column to 1-column on mobile

---

## Execution Order

```
Phase 0: Tooling           (30 min)  — ESLint, Prettier, directory structure, theme.js
Phase 1: Components        (2 hours) — 12 shared components
Phase 2: Split Admin.jsx   (2 hours) — 14 admin page files
Phase 3: Split App.jsx     (2 hours) — 12 investor page files
Phase 4: Custom Hooks      (1 hour)  — useDataFetch, useFilters, usePagination

--- Architecture complete. Commit: "Refactor: extract components, split monoliths, add hooks" ---

Phase 5: Functional Fixes  (Sprints A-L, 12 commits)
Phase 6: A11y + Responsive (Sprints M-N, 2 commits)
```

**Total: 16 commits** transforming the codebase from 2 monolithic files to 40+ focused files, fixing 107 issues, and establishing patterns that prevent regression.

---

## Rules for the Working Claude

1. **No Co-Authored-By** in commits — Vercel blocks deploys
2. **Commit after each phase/sprint, push immediately**
3. **Don't change the visual design** — keep "Elevated Minimal" look
4. **Demo mode must keep working** — all new features need demo fallback
5. **Import from theme.js** — never hardcode colors, shadows, or spacing
6. **Max 300 lines per component** — if it's longer, split it
7. **Every list view gets**: search, sort, empty state, loading skeleton
8. **Every form gets**: required indicators, validation, Save/Cancel buttons
9. **Every new component gets**: proper aria attributes, keyboard support
10. **Read SKILLS.md** for brand guidelines and commit conventions
