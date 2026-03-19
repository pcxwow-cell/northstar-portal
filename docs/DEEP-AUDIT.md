# Northstar Portal — Deep Audit (Round 3)

> Date: 2026-03-18
> Role: QA / PM — deep-dive audits on demo mode, entities, admin lifecycle, PDF/reporting, data integrity, audit logging

This document supplements `WORKFLOW-AUDIT.md` with findings from 6 targeted deep-dive audits.

---

## Severity Guide

| Level | Meaning |
|-------|---------|
| **CRITICAL** | Security vulnerability or data loss risk |
| **BLOCKER** | Workflow cannot complete — user is stuck |
| **BROKEN** | Feature exists but doesn't work correctly |
| **MISSING** | Expected feature does not exist |
| **UX** | Works but confusing, buried, or poorly designed |

---

## 8. Demo Mode & Vercel Production

### Problem
The Vercel frontend has NO backend. All features must gracefully fall back to demo/static data. Currently **25 admin write functions** have no demo fallback and will crash or show network errors on the live Vercel deployment.

### Crash Points — Admin Write Functions with No Demo Fallback

| Function | Location | Impact |
|----------|----------|--------|
| `updateProject()` | api.js | Admin edits crash |
| `inviteInvestor()` | api.js | Invite flow crash |
| `updateInvestor()` | api.js | Status change crash |
| `approveInvestor()` | api.js | Approve button crash |
| `deactivateInvestor()` | api.js | Deactivate crash |
| `resetInvestorPassword()` | api.js | Password reset crash |
| `assignInvestorProject()` | api.js | Assignment crash |
| `updateInvestorKPI()` | api.js | KPI edit crash |
| `createInvestorGroup()` | api.js | Group create crash |
| `updateInvestorGroup()` | api.js | Group edit crash |
| `deleteInvestorGroup()` | api.js | Group delete crash |
| `createStaff()` | api.js | Staff create crash |
| `updateStaff()` | api.js | Staff edit crash |
| `deleteStaff()` | api.js | Staff delete crash |
| `updateWaterfall()` | api.js | Waterfall edit crash |
| `sendMessage()` | api.js | Legacy messaging crash |
| `deleteDocument()` | api.js | Document delete crash |
| `assignDocument()` | api.js | Document assign crash |
| `deleteProject()` | api.js | Project delete crash |
| `updateUserFlags()` | api.js | Permission flags crash |
| `createThread()` | api.js | Thread create crash |
| `replyToThread()` | api.js | Reply crash |
| `uploadDocument()` | api.js | Upload crash |
| `bulkUploadK1s()` | api.js | Bulk upload crash |
| `requestSignature()` | api.js | Signature request crash |

### Shape Mismatch

| Issue | Severity | Detail |
|-------|----------|--------|
| Document detail vs list shape | **BROKEN** | Document list returns `project` as string name, but document detail returns `project` as full object. Any code that expects consistent shape breaks |

### Fix Required
Each admin write function needs a demo mode check that returns a simulated success response (e.g., `{ success: true, demo: true }`) when the API is unreachable, similar to how read endpoints already fall back to `data.js` static data.

---

## 9. Entity Management

### Flow: Admin creates entity → assigns to investor → entity linked to investments → tax docs reference entity

| Step | Status | Detail |
|------|--------|--------|
| Create entity with tax ID | OK | entities.js:23-73 |
| Entity detail view | OK | Admin.jsx entity panel |
| Edit entity | OK | entities.js:79 |
| Delete entity | OK | entities.js:98 |
| Link entity to investment | **BROKEN** | UI never passes `entityId` when assigning investor to project |
| Cap table uses entity data | **MISSING** | Cap table completely disconnected from entities |
| Tax ID encryption at rest | **CRITICAL** | taxId stored as plain `String` in schema — not encrypted |
| Tax ID masked in display | **CRITICAL** | Tax ID returned in full from API — no masking (should show •••XX-XXXX) |
| Audit log for entity changes | **MISSING** | No audit logging on entity update (line 79) or delete (line 98) |

### Security Issues

1. **Tax ID stored as plain text** — `prisma/schema.prisma` stores `taxId` as a plain `String`. PII/financial data should be encrypted at rest.
2. **Tax ID returned unmasked** — API returns full tax IDs in responses. Should mask to last 4 digits for display, only show full value on explicit request with audit logging.

---

## 10. Admin Investor Lifecycle

### What Works
- Search investors by name ✓
- Edit investor details ✓
- Deactivate investor ✓
- Investor groups (create/edit/delete/assign) ✓
- Reset password ✓

### What's Missing

| Feature | Severity | Detail |
|---------|----------|--------|
| CSV export of investor list | **MISSING** | No export functionality anywhere in admin |
| Group filter on investor list | **MISSING** | Can't filter investors by group |
| Group-based message targeting | **MISSING** | Can't send message to all investors in a specific group |
| Remove investor from project | **MISSING** | No endpoint or UI to unassign an investor from a project |
| Investor activity timeline | **MISSING** | No view of what an investor has done (logins, downloads, messages) |
| Bulk investor import | **MISSING** | No CSV/spreadsheet import for new investors |

---

## 11. PDF & Reporting

### What Works
- Capital call PDF generation ✓
- Quarterly report PDF generation ✓
- Statement approval workflow (DRAFT → APPROVED → SENT → REJECTED) ✓
- Statement persistence in Prisma DB ✓

### What's Missing/Broken

| Feature | Severity | Detail |
|---------|----------|--------|
| Capital account statement PDF | **MISSING** | Statements are HTML-only. No PDF generation for investor download |
| Investor access to sent statements | **MISSING** | Investors can't view their statements in the portal — admin-only |
| Automated quarterly report distribution | **MISSING** | Reports generated but must be manually sent — no batch email to investors |
| Statement template customization | **MISSING** | No way to customize statement formatting/branding |
| Report scheduling | **MISSING** | No recurring report generation — all manual |

---

## 12. Data Integrity

### Missing CASCADE Delete Rules

When a parent record is deleted, child records become orphaned. These relationships lack proper CASCADE rules:

| Parent → Child | Risk | Detail |
|---------------|------|--------|
| Project → CashFlow | **CRITICAL** | Deleting project leaves orphaned cash flow records |
| Project → Message/Thread | **BROKEN** | Deleting project leaves orphaned messages |
| Project → Statement | **BROKEN** | Deleting project leaves orphaned statements |
| Project → Prospect | **BROKEN** | Deleting project leaves orphaned prospects |
| User → InvestorProject | **CRITICAL** | Deleting user leaves orphaned investment records across 10+ tables |
| User → CashFlow | **CRITICAL** | Deleting user leaves orphaned financial records |
| User → Thread/ThreadRecipient | **BROKEN** | Deleting user leaves orphaned message threads |
| User → Document assignments | **BROKEN** | Deleting user leaves orphaned document access records |
| User → NotificationLog | **BROKEN** | Deleting user leaves orphaned notifications |
| User → AuditLog | **BROKEN** | Deleting user leaves orphaned audit entries |

### Concurrency Issues

| Issue | Severity | Detail |
|-------|----------|--------|
| No optimistic locking | **BROKEN** | Last write wins — two admins editing same project simultaneously will overwrite each other |
| No transaction wrapping | **BROKEN** | Multi-step operations (e.g., bulk distribution → create CashFlow + update InvestorProject) are not atomic |

### Pagination Missing

Most admin list endpoints return ALL records with no pagination:

| Endpoint | Status | Detail |
|----------|--------|--------|
| GET /admin/investors | **No pagination** | Returns all records |
| GET /admin/projects | **No pagination** | Returns all records |
| GET /admin/documents | **No pagination** | Returns all records |
| GET /admin/staff | **No pagination** | Returns all records |
| GET /admin/investor-groups | **No pagination** | Returns all records |
| GET /threads | **No pagination** | Returns all records |
| GET /admin/audit-log | **Has pagination** | limit param, default 100, max 500 |
| Dashboard recent docs | **Has limit** | `take: 5` |
| Investor threads | **Has limit** | `take: 10` |

### Input Validation Missing

15+ endpoints accept arbitrary input with no validation:

| Category | Endpoints Affected |
|----------|-------------------|
| Project CRUD | create, update — no validation on financial fields (could be negative, strings, etc.) |
| Investor CRUD | invite, update — no email format validation, no name length limits |
| Financial operations | record-cashflow — no amount validation (could be 0, negative, absurdly large) |
| Document upload | upload, bulk K-1 — no file type/size validation beyond what multer provides |

---

## 13. Audit Logging Gaps

### What IS Logged (34 actions)
Login, logout, failed login, MFA setup, password change, document upload, document download, signature request, project creation, project update, investor invite, thread creation, thread reply, and ~20 more routine actions.

### What is NOT Logged (20+ sensitive actions)

| Action | Severity | Why It Matters |
|--------|----------|----------------|
| Investor deactivation | **CRITICAL** | Compliance — must track who deactivated which investor and when |
| Investor approval | **CRITICAL** | Must track who approved investor access |
| Investor profile update | **MISSING** | Audit trail for PII changes |
| Project assignment changes | **MISSING** | Track who gave/removed investor access to projects |
| KPI manual edits | **CRITICAL** | Admin manually changing IRR/MOIC/values with no audit trail is a compliance risk |
| All group CRUD operations | **MISSING** | No logging for group create/edit/delete/membership changes |
| Waterfall parameter changes | **CRITICAL** | Changes to profit split terms must be audited |
| Staff permission changes | **CRITICAL** | Changes to who can do what must be logged |
| Entity update/delete (create IS logged) | **CRITICAL** | Entity/tax ID changes need audit trail |
| Document deletion | **MISSING** | Must track who deleted what document |
| Statement status changes | **MISSING** | DRAFT→APPROVED→SENT transitions unlogged |

### Audit Log Feature Gaps

| Feature | Severity | Detail |
|---------|----------|--------|
| No old/new value comparison | **MISSING** | Log says "updated project" but doesn't say what changed |
| No date range filtering | **UX** | Can't filter audit log by date |
| No CSV export | **MISSING** | Can't export audit log for compliance review |
| No index on createdAt | **MISSING** | Audit log queries will slow down at scale |

---

## Priority Fix List (Round 3 Additions)

### P0 — Critical Security & Data

| # | Issue | Category | Fix |
|---|-------|----------|-----|
| 39 | Tax ID stored plain text | Entity | Encrypt at rest, mask in API responses |
| 40 | Missing CASCADE deletes | Schema | Add onDelete: Cascade to all parent-child relations |
| 41 | KPI edits not audit logged | Audit | Log all manual financial field changes with old/new values |
| 42 | Feature flags not enforced server-side | Security | Add middleware to check flags before allowing endpoint access |

### P1 — Broken Workflows

| # | Issue | Category | Fix |
|---|-------|----------|-----|
| 43 | Entity-investment linking broken | Entity | Pass entityId in project assignment UI |
| 44 | 25 demo mode crash points | Demo | Add demo fallback to all admin write functions in api.js |
| 45 | Document shape mismatch | API | Normalize project field format across list/detail endpoints |
| 46 | No remove-investor-from-project | Admin | Add endpoint + UI button |
| 47 | Operations not atomic | Data | Wrap multi-step financial operations in transactions |

### P2 — Missing Features

| # | Issue | Category |
|---|-------|----------|
| 48 | CSV export of investor list | Admin |
| 49 | Group filter on investor list | Admin |
| 50 | Group-based message targeting | Messaging |
| 51 | Investor activity timeline | Admin |
| 52 | Capital account statement PDF | Reporting |
| 53 | Investor statement portal access | Reporting |
| 54 | Automated report distribution | Reporting |
| 55 | Bulk investor import | Admin |
| 56 | 20+ missing audit log entries | Audit |
| 57 | Audit log date filter + CSV export | Audit |
| 58 | Old/new value comparison in audit log | Audit |

### P3 — Performance & Polish

| # | Issue | Category |
|---|-------|----------|
| 59 | 15+ endpoints need pagination | Performance |
| 60 | 15+ endpoints need input validation | Data Quality |
| 61 | No optimistic locking | Data Integrity |
| 62 | No audit log createdAt index | Performance |

---

## Updated Summary (All Audits Combined)

| Category | Critical | Blocker | Broken | Missing | UX |
|----------|----------|---------|--------|---------|----|
| Onboarding (Audit 1) | 0 | 2 | 1 | 3 | 3 |
| Documents (Audit 1) | 0 | 1 | 4 | 5 | 1 |
| Messaging (Audit 1) | 0 | 0 | 1 | 5 | 4 |
| Admin Projects (Audit 1) | 0 | 0 | 0 | 4 | 1 |
| Investor Portal (Audit 1) | 0 | 1 | 3 | 4 | 8 |
| Permissions (Audit 1) | 0 | 0 | 1 | 2 | 0 |
| Notifications (Audit 1) | 0 | 0 | 0 | 3 | 0 |
| Demo Mode (Audit 3) | 0 | 0 | 1 | 25 | 0 |
| Entity Management (Audit 3) | 2 | 0 | 1 | 1 | 0 |
| Admin Lifecycle (Audit 3) | 0 | 0 | 0 | 6 | 0 |
| PDF/Reporting (Audit 3) | 0 | 0 | 0 | 5 | 0 |
| Data Integrity (Audit 3) | 3 | 0 | 2 | 2 | 0 |
| Audit Logging (Audit 3) | 4 | 0 | 0 | 4 | 1 |
| **Total** | **9** | **4** | **14** | **69** | **18** |

**Grand total: 114 issues** (9 critical, 4 blockers, 14 broken, 69 missing, 18 UX)

---

## Verification Notes (Cross-Checked 2026-03-18)

| Item | Status | Detail |
|------|--------|--------|
| Feature flags enforcement | **CONFIRMED NOT ENFORCED** | `isEnabled()` exists in service but NO route imports it as middleware. Frontend-only decoration |
| Statement persistence | **ALREADY FIXED** | Statements now use Prisma DB, not in-memory Map() |
| Auth PENDING rejection | **CONFIRMED BROKEN** | auth.js:33 still returns "Invalid email or password" for PENDING users |
| Download bypass | **CONFIRMED BROKEN** | App.jsx:1199 still uses `window.open(d.file, "_blank")` |
| Read receipts to investors | **CONFIRMED BROKEN** | App.jsx:1423-1440 still shows read receipts to investors |
| Document assignment deleteMany | **CONFIRMED BROKEN** | admin.js:348 still uses `deleteMany()` before `createMany()` |
| Thread creation email | **CONFIRMED MISSING** | No `notifyMany` call in thread creation (only on replies at line 232) |
| unlockInvestor API function | **CONFIRMED MISSING** | Not in api.js |
| Legacy messaging code | **CONFIRMED PRESENT** | admin.js:308-338 still has POST /admin/messages endpoint |
| Audit log pagination | **ALREADY EXISTS** | Has limit param (default 100, max 500) — removed from "missing pagination" list |
| Entity create audit logging | **ALREADY EXISTS** | entities.js:46 has `audit.log()` for creates. Only update/delete missing |
| Client-side CSV export | **PARTIALLY EXISTS** | App.jsx has CSV export for cap table, documents, distributions. Admin-side export missing |
