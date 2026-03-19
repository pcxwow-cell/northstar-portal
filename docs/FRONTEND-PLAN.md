# Northstar Portal — Frontend Refactor Plan

> Date: 2026-03-18
> Status: **Phase 0 COMPLETE, Phase 1 COMPLETE, Phase 2 COMPLETE, Phase 3 COMPLETE**
> Scope: Decompose 2 monolithic files (8,132 lines) into focused modules without breaking demo mode or visual design

## Results

| Metric | Before | After |
|--------|--------|-------|
| App.jsx | 3,336 lines | 724 lines (shell + utilities) |
| Admin.jsx | 4,796 lines | 226 lines (shell only) |
| Total monolith lines | 8,132 | 950 |
| Extracted page files | 0 | 12 (src/pages/) |
| Extracted admin files | 0 | 14 (src/admin/) |
| Shared components wired | 0 | 14 |
| Total commits | — | 33 |

## Completed

| Commit | Description | Date |
|--------|-------------|------|
| e3c9bf6 | Wire ToastContext into App.jsx | 2026-03-18 |
| e02a6fc | Wire shared components into Admin.jsx — Spinner, EmptyState, ConfirmDialog | 2026-03-18 |
| 01570ad | Add AdminDataContext, eliminate 6 redundant API calls | 2026-03-18 |
| multiple | Wire Button, Card, FormInput, Modal, StatCard into Admin.jsx and App.jsx | 2026-03-18 |
| 9f516d5 | Add InvestorDataContext for shared investor data | 2026-03-18 |
| 3ef8246 | Wire StatusBadge into Admin.jsx | 2026-03-18 |
| e621966 | Wire StatusBadge into App.jsx | 2026-03-18 |
| faadcba | Wire Spinner, EmptyState, ConfirmDialog into App.jsx; wire SectionHeader into Admin.jsx | 2026-03-18 |
| 58b15ae | Wire Tabs into Admin.jsx | 2026-03-18 |
| 9bfef4d | Wire Tabs into App.jsx | 2026-03-18 |
| 19446db | Wire DataTable into Admin.jsx | 2026-03-18 |
| 785bb32 | Wire DataTable into App.jsx | 2026-03-18 |
| 422e275 | Wire SearchFilterBar into Admin.jsx | 2026-03-18 |
| 29d3b22 | Wire SearchFilterBar into App.jsx | 2026-03-18 |
| 233cfda | Wire SectionHeader into App.jsx | 2026-03-18 |
| 9af424f | Extract ResetPassword from App.jsx | 2026-03-18 |
| 822e4dc | Extract Activity from App.jsx | 2026-03-18 |
| 6eec203 | Extract Distributions from App.jsx | 2026-03-18 |
| 5342e10 | Extract FinancialModeler from App.jsx | 2026-03-18 |
| 5af8cbb | Extract CapTable from App.jsx | 2026-03-18 |
| c514941 | Extract Documents from App.jsx | 2026-03-18 |
| 94f9704 | Extract Messages from App.jsx | 2026-03-18 |
| b2d99a5 | Extract Profile and Security from App.jsx | 2026-03-18 |
| 9c2b5d1 | Extract Portfolio from App.jsx | 2026-03-18 |
| 45f4302 | Extract Overview from App.jsx | 2026-03-18 |
| 80b6210 | Extract Login from App.jsx | 2026-03-18 |
| cbc32b3 | Extract AuditLogViewer from Admin.jsx | 2026-03-18 |
| f528a61 | Extract EmailSettingsManager from Admin.jsx | 2026-03-18 |
| 6ddcc05 | Extract SignatureManager from Admin.jsx | 2026-03-18 |
| c09ef65 | Extract ProspectManager from Admin.jsx | 2026-03-18 |
| 74a684b | Extract GroupManager from Admin.jsx | 2026-03-18 |
| fc4c2ae | Extract StaffManager from Admin.jsx | 2026-03-18 |
| 3746f42 | Extract AdminInbox from Admin.jsx | 2026-03-18 |
| 90a6108 | Extract StatementManager from Admin.jsx | 2026-03-18 |
| 103ca10 | Extract Dashboard from Admin.jsx | 2026-03-18 |
| 3e97d8f | Extract ProjectManager from Admin.jsx | 2026-03-18 |
| acba5cb | Extract InvestorManager from Admin.jsx | 2026-03-18 |
| a13b9a7 | Extract DocumentManager from Admin.jsx | 2026-03-18 |
| c24eaa5 | Extract InvestorProfile from Admin.jsx | 2026-03-18 |
| 788b5f5 | Extract ProjectDetail from Admin.jsx | 2026-03-18 |

## Component Wiring Status (Phase 0) — COMPLETE

| Component | Admin.jsx | App.jsx |
|-----------|-----------|---------|
| Button | ✓ | ✓ |
| Card | ✓ | ✓ |
| FormInput | ✓ | ✓ |
| Modal | ✓ | ✓ |
| StatCard | ✓ | ✓ |
| StatusBadge | ✓ | ✓ |
| SectionHeader | ✓ | ✓ |
| Spinner | ✓ | ✓ |
| EmptyState | ✓ | ✓ |
| ConfirmDialog | ✓ | ✓ |
| Tabs | ✓ | ✓ |
| DataTable | ✓ | ✓ |
| SearchFilterBar | ✓ | ✓ |

## File Structure After Extraction

### src/pages/ (investor-facing)

| File | Lines | Extracted from |
|------|-------|---------------|
| ResetPassword.jsx | 79 | App.jsx |
| Activity.jsx | 68 | App.jsx |
| Distributions.jsx | 74 | App.jsx |
| FinancialModeler.jsx | 193 | App.jsx |
| CapTable.jsx | 235 | App.jsx |
| Documents.jsx | 258 | App.jsx |
| Messages.jsx | 273 | App.jsx |
| Profile.jsx | 461 | App.jsx (includes Security) |
| Portfolio.jsx | 286 | App.jsx |
| Overview.jsx | 272 | App.jsx |
| Login.jsx | 378 | App.jsx |

### src/admin/ (admin-facing)

| File | Lines | Extracted from |
|------|-------|---------------|
| AuditLog.jsx | 117 | Admin.jsx |
| EmailSettings.jsx | 325 | Admin.jsx |
| SignatureManager.jsx | 100 | Admin.jsx |
| ProspectManager.jsx | 205 | Admin.jsx |
| GroupManager.jsx | 183 | Admin.jsx |
| StaffManager.jsx | 296 | Admin.jsx |
| AdminInbox.jsx | 315 | Admin.jsx |
| StatementManager.jsx | 583 | Admin.jsx |
| AdminDashboard.jsx | 202 | Admin.jsx |
| ProjectManager.jsx | 225 | Admin.jsx |
| InvestorManager.jsx | 234 | Admin.jsx |
| DocumentManager.jsx | 446 | Admin.jsx |
| InvestorProfile.jsx | 425 | Admin.jsx |
| ProjectDetail.jsx | 939 | Admin.jsx |

### src/components/ (shared, created during extraction)

| File | Purpose |
|------|---------|
| PasswordStrengthBar.jsx | Password strength indicator (used by Profile, Login) |

---

## Remaining Work (Future Phases)

### Phase 4: Fix Demo Mode (1 commit)
22 admin write functions in api.js have no demo fallback. See original plan below.

### Phase 5: Smoke Tests (1 commit)
Add vitest render tests for all extracted pages.

### Phase 6: Update Feature Fix Paths (1 commit)
Update all file path references in FEATURE-FIX-PLAN.md, WORKFLOW-AUDIT.md, DEEP-AUDIT.md, UI-REVIEW.md.

### Optional: Sub-split large files
Files over 300 lines that could benefit from further splitting:
- ProjectDetail.jsx (939 lines) → split into per-tab components
- StatementManager.jsx (583 lines) → split detail view
- Profile.jsx (461 lines) → split security section
- DocumentManager.jsx (446 lines) → split detail/upload views
- InvestorProfile.jsx (425 lines) → split entity/assignment sections

---

## Architecture After Extraction

```
src/
├── App.jsx                    (724 lines — shell, theme, auth, navigation)
├── Admin.jsx                  (226 lines — shell, navigation, section wrappers)
├── ProspectPortal.jsx         (903 lines — standalone)
├── api.js                     (950 lines — API functions)
├── pages/                     (11 files — investor-facing pages)
├── admin/                     (14 files — admin manager components)
├── components/                (15 files — shared UI components)
├── context/                   (3 files — ToastContext, AdminDataContext, InvestorDataContext)
├── hooks/                     (4 files — shared hooks)
└── styles/
    └── theme.js               (design tokens)
```

---

## Execution Rules (preserved from original plan)

1. **Never extract two managers in the same commit.** One at a time.
2. **Never skip the verification checklist.** If it fails, fix before moving on.
3. **Search by function name, not line number.** Lines will drift.
4. **Don't refactor while extracting.** Move code as-is first, clean up in a separate commit.
5. **Don't rename variables during extraction.** Minimize diff size.
6. **If a manager has >300 lines after extraction, plan sub-splits** but do them in follow-up commits.
7. **Commit message format:** `Extract [ComponentName] from [App|Admin].jsx`
