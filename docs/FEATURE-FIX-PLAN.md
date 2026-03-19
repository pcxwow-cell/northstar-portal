# Northstar Portal — Feature Fix Plan

> Date: 2026-03-18
> Source: WORKFLOW-AUDIT.md (workflow/UX audit) + BUG-AUDIT.md (code-level bugs)
> Scope: All missing features, broken workflows, and UX fixes

---

## Sprint Order

Sprints are ordered by dependency and impact. Each sprint should be committed and pushed separately.

---

### Sprint A: Onboarding Blockers & Account Management

**Why first:** Investors literally cannot log in after being invited. Nothing else matters if onboarding is broken.

| # | Task | Files | Detail |
|---|------|-------|--------|
| A1 | Fix PENDING status trap | server/routes/auth.js:33 | Return "Account pending approval" error instead of "Invalid email or password" when user.status === "PENDING" |
| A2 | Add inline Approve button to investor list | src/Admin.jsx | Show Approve/Reject buttons directly in investor table rows for PENDING investors, not just in detail view |
| A3 | Fix welcome email to mention approval | server/services/email/templates.js:239 | Change "log in with these credentials" to "Your account is pending admin approval. You'll be notified when approved." |
| A4 | Report email failure to admin | server/routes/admin.js:386-394 | Return `{ emailSent: false, warning: "..." }` in API response. Show warning in credential dialog |
| A5 | Wire unlock account button | src/Admin.jsx, src/api.js | Add `unlockInvestor(id)` to api.js. Add "Unlock" button to investor detail when `lockedUntil` is set. Backend endpoint already exists at admin.js:431 |
| A6 | Add empty dashboard state | src/App.jsx:486-509 | When `myProjects.length === 0`, show "Your portfolio is being set up. You'll see your investments here once assigned." instead of all zeros |
| A7 | Fix IRR NaN display | src/App.jsx:497 | Add null/NaN check, show "—" instead of "NaN%" |

**Commit message:** `Fix investor onboarding: pending status error, unlock button, empty states`

---

### Sprint B: Document Download & Tracking

**Why second:** Download tracking is completely broken — admins can't see who viewed what.

| # | Task | Files | Detail |
|---|------|-------|--------|
| B1 | Fix download to use secure endpoint | src/App.jsx:1199 | Change `window.open(d.file)` to call `downloadDocument(d.id)` which hits `/documents/:id/download` with proper tracking |
| B2 | Fix document assignment to preserve tracking | server/routes/admin.js:348 | Replace `deleteMany` + `createMany` with upsert logic that preserves existing `viewedAt`/`downloadedAt` timestamps |
| B3 | Add PDF preview to sign modal | src/App.jsx:1223-1248 | Add iframe or "View Document" button so investor can review before signing |
| B4 | Add signer status table to admin doc detail | src/Admin.jsx:1356-1375 | Show SignatureSigner records: investor name, status (pending/signed/declined), signed_at |
| B5 | Add unmatched K-1 reassignment | src/Admin.jsx, server/routes/documents.js | Add UI to list orphaned (status="pending") K-1s and assign them to investors manually |
| B6 | Add signature reminder/resend | src/Admin.jsx, server/routes/signatures.js | "Remind" button on pending signers that re-sends notification email |

**Commit message:** `Fix document downloads, tracking, signature preview, K-1 reassignment`

---

### Sprint C: Messaging Fixes

**Why third:** Email notifications not sent on new threads means investors never know they have messages.

| # | Task | Files | Detail |
|---|------|-------|--------|
| C1 | Send email on new thread creation | server/routes/threads.js:131-186 | After creating thread and recipients, call `notifyMany(recipientIds, "new_message", { subject, threadId })` |
| C2 | Add read receipts to admin inbox | src/Admin.jsx:3375-3417 | Show which investors have read the message and when (data already returned by backend in `readReceipts`) |
| C3 | Add message search | src/Admin.jsx, src/App.jsx | Add search input above message list, filter threads by subject/body containing search term |
| C4 | Add message sort | src/Admin.jsx, src/App.jsx | Sort dropdown: newest first (default), oldest first, unread first |
| C5 | Remove dead legacy messaging code | server/routes/admin.js:308-338, src/api.js:461-463 | Remove unused `/admin/messages` POST endpoint and `sendMessage()` API function |
| C6 | Fix timestamp format consistency | src/Admin.jsx:3400 | Add `year: "numeric"` to match investor-side format |

**Commit message:** `Fix messaging: email notifications, read receipts, search, cleanup dead code`

---

### Sprint D: Admin Project & Financial Management

**Why fourth:** Cap table, waterfall tiers, and contribution/distribution recording are core admin workflows that are read-only or missing.

| # | Task | Files | Detail |
|---|------|-------|--------|
| D1 | Add cap table CRUD | src/Admin.jsx, server/routes/admin.js | Add "Add Entry" form (holder name, class, committed, called, ownership %). Add edit/delete buttons per row. Backend: POST/PUT/DELETE `/admin/projects/:id/cap-table` |
| D2 | Add waterfall tier editing | src/Admin.jsx, server/routes/admin.js | Make tier rows editable (name, lpShare, gpShare, threshold). Add "Add Tier" / "Delete Tier" buttons. Backend: PUT/DELETE `/admin/projects/:id/waterfall-tiers/:tierId` |
| D3 | Add "Assign Investor" from project detail | src/Admin.jsx | Add "Add Investor" button on project detail investors tab that opens investor picker + commitment form |
| D4 | Add photo upload on project updates | src/Admin.jsx, server/routes/admin.js:205 | Add file input to update form. Store photo via storage adapter. Add `photoUrl` field to ProjectUpdate model |
| D5 | Add bulk distribution recording | src/Admin.jsx, server/routes/finance.js | "Record Distribution" button on project detail that lets admin enter total distribution amount → auto-splits pro-rata across all investors based on ownership % → creates CashFlow records AND updates each InvestorProject's called/currentValue fields. Currently recording a cash flow (finance.js:79) does NOT update InvestorProject numbers |
| D6 | Add bulk capital call recording | src/Admin.jsx, server/routes/finance.js | Same pattern as D5 but for capital calls — enter amount → split across investors → update InvestorProject.called → create CashFlow records |
| D7 | Add project financial summary | src/Admin.jsx | Show totals on project detail: total committed, total called, total distributed, unfunded commitment. Currently only shows per-investor but no project-level aggregation |

**Note on existing KPI editing:** The "Edit KPIs" button (Admin.jsx:971) does work for manually editing individual investor fields (committed, called, currentValue, IRR, MOIC) via `PUT /admin/investors/:userId/projects/:projectId`. But there is no workflow to record an actual distribution/capital call event that automatically updates all investor records. The `POST /finance/record-cashflow` endpoint creates a CashFlow record but does NOT update InvestorProject fields — these are disconnected.

**Schema change for D4:**
```prisma
model ProjectUpdate {
  // ... existing fields
  photoUrl    String?   @map("photo_url")
}
```

**Commit message:** `Add cap table CRUD, waterfall tiers, bulk distribution/capital call recording`

---

### Sprint E: Investor Portal UX

**Why fifth:** Core data is accessible but the UX makes it hard to find.

| # | Task | Files | Detail |
|---|------|-------|--------|
| E1 | Dashboard project cards drill down | src/App.jsx:524 | Change `onClick={() => onNavigate("portfolio")}` to `onClick={() => { setSelectedProject(p); onNavigate("portfolio"); }}` so it opens the specific project |
| E2 | Add tab interface to investment detail | src/App.jsx:652-812 | Replace vertical stack with tabs: Overview, Documents, Updates, Distributions. Keep capital account in Overview tab |
| E3 | Add empty states throughout | src/App.jsx | Add "No updates yet", "No cash flows recorded", "No distributions yet" messages for empty arrays |
| E4 | Make dashboard recent messages clickable | src/App.jsx:612-632 | Clicking a message should navigate to messages tab and open that thread |
| E5 | Add distribution detail view | src/App.jsx:1310-1323 | Click distribution row to see: waterfall breakdown, payment method, tax withholding |
| E6 | Add standalone capital account summary | src/App.jsx | New tab or section showing capital accounts across ALL projects in one view |

**Commit message:** `Improve investor UX: drill-down, tabs, empty states, distribution detail`

---

### Sprint F: Notifications & Activity Log

| # | Task | Files | Detail |
|---|------|-------|--------|
| F1 | Create activity/notification log page | src/App.jsx | New page showing: document uploads, distributions, capital calls, messages — pulled from NotificationLog table |
| F2 | Wire notification bell to activity page | src/App.jsx:3003-3009 | Bell click opens activity page instead of messages |
| F3 | Add email on distribution recorded | server/routes/finance.js:79-100 | After recording cash flow, call `notify(userId, "distribution_paid", ...)` |
| F4 | Add email on capital call recorded | server/routes/finance.js | Same pattern for capital calls |
| F5 | Add mark-as-read on notifications | server/routes/notifications.js | POST `/notifications/:id/read` endpoint. Update NotificationLog.read field |

**Commit message:** `Add activity log, distribution/capital call email notifications`

---

### Sprint G: Permissions & Prospect Pipeline

| # | Task | Files | Detail |
|---|------|-------|--------|
| G1 | Create prospect interest backend | server/routes/prospects.js | POST `/prospects/interest` — saves prospect, sends admin notification email, returns success |
| G2 | Wire ProspectPortal to real API | src/ProspectPortal.jsx | Replace hardcoded project data with `fetchProjects()` call. Connect interest form to backend endpoint |
| G3 | Add prospect → investor conversion | server/routes/admin.js, src/Admin.jsx | "Convert to Investor" button on prospect detail that creates user account + sends welcome email |
| G4 | Add investor permission customization | prisma/schema.prisma, server/routes/admin.js, src/Admin.jsx | Add `permissions` JSON field to User model. Admin UI to toggle: can_view_cap_table, can_view_waterfall, can_view_documents, can_download, can_message. Backend middleware checks these per-endpoint |

**Schema change for G4:**
```prisma
model User {
  // ... existing fields
  permissions Json?     @default("{}")
}
```

**Commit message:** `Add prospect pipeline, investor permissions, prospect-to-investor conversion`

---

### Sprint H: Security & Profile Polish

| # | Task | Files | Detail |
|---|------|-------|--------|
| H1 | Add copy-to-clipboard for MFA backup codes | src/App.jsx:1926-1930 | "Copy All" button using navigator.clipboard.writeText |
| H2 | Fix password validation mismatch | src/App.jsx:1817-1821 | Add special character requirement to match strength bar |
| H3 | Add login history pagination | src/App.jsx:1954 | "Load More" button or pagination instead of hardcoded 10 |
| H4 | Add profile fields | src/App.jsx:1971-2077 | Add phone number, mailing address inputs. Backend already accepts these if schema is updated |
| H5 | Add session management | src/App.jsx, server/routes/auth.js | "Log out all other sessions" button. Add server-side token blacklist |
| H6 | Mobile capital account responsive fix | src/App.jsx | Change 4-column grid to stack on mobile (<768px) |

**Commit message:** `Security polish: MFA copy, password validation, sessions, mobile fixes`

---

### Sprint I: Demo Mode Resilience

**Why:** The live Vercel deployment (no backend) crashes on all admin write operations. 25 functions have no demo fallback.

| # | Task | Files | Detail |
|---|------|-------|--------|
| I1 | Add demo fallback to all admin write functions | src/api.js | For each of the 25 write functions (updateProject, inviteInvestor, approveInvestor, etc.), add `if (DEMO_MODE) return { success: true, demo: true }` check before the fetch call |
| I2 | Fix document shape mismatch | server/routes/documents.js, src/api.js | Normalize `project` field — always return as object `{ id, name }` in both list and detail endpoints, or always as string. Pick one and be consistent |
| I3 | Add demo toast notification | src/Admin.jsx | When a demo-mode write returns, show toast: "Demo mode — changes not saved" so users know it's a demo |

**Commit message:** `Add demo mode fallbacks for all admin write functions`

---

### Sprint J: Data Integrity & Security Hardening

**Why:** Missing CASCADE rules cause orphaned records. Tax IDs stored/displayed in plain text. No input validation on financial endpoints.

| # | Task | Files | Detail |
|---|------|-------|--------|
| J1 | Add CASCADE delete rules to schema | prisma/schema.prisma | Add `onDelete: Cascade` to: Project→CashFlow, Project→Statement, User→InvestorProject, User→CashFlow, User→ThreadRecipient, User→NotificationLog, User→AuditLog. Run migration |
| J2 | Encrypt tax IDs at rest | server/routes/entities.js, prisma/schema.prisma | Add encryption helper (AES-256-GCM using env secret). Encrypt on write, decrypt on read. Migration to encrypt existing values |
| J3 | Mask tax IDs in API responses | server/routes/entities.js | Return `taxId: "•••-••-1234"` by default. Add `?full=true` query param that returns unmasked + logs audit entry |
| J4 | Add input validation to financial endpoints | server/routes/finance.js, server/routes/admin.js | Validate: amounts > 0, percentages 0-100, required fields present, email format, string length limits |
| J5 | Wrap multi-step operations in transactions | server/routes/finance.js | Use `prisma.$transaction()` for bulk distribution/capital call recording |
| J6 | Add remove-investor-from-project endpoint | server/routes/admin.js, src/Admin.jsx, src/api.js | DELETE `/admin/investors/:userId/projects/:projectId`. Add "Remove" button on project investor list |

**Commit message:** `Data integrity: CASCADE deletes, tax ID encryption, input validation, transactions`

---

### Sprint K: Audit Logging Completeness

**Why:** 20+ sensitive financial/admin actions have no audit trail. Compliance risk for an investment platform.

| # | Task | Files | Detail |
|---|------|-------|--------|
| K1 | Add audit logging to missing actions | server/routes/admin.js, server/routes/entities.js, server/routes/finance.js | Log: investor deactivation, approval, profile update, project assignment, KPI edits, group CRUD, waterfall changes, staff permission changes, entity CRUD, document deletion, statement status changes |
| K2 | Add old/new value comparison | server/middleware/audit.js (new) | Create audit middleware that captures before/after state for update operations |
| K3 | Add date range filter to audit log | server/routes/admin.js | Accept `?from=&to=` query params on GET /admin/audit-log |
| K4 | Add CSV export for audit log | server/routes/admin.js | GET `/admin/audit-log/export` returns CSV |
| K5 | Add createdAt index | prisma/schema.prisma | Add `@@index([createdAt])` to AuditLog model |

**Commit message:** `Complete audit logging: missing actions, value comparison, date filter, CSV export`

---

### Sprint L: Admin Lifecycle & Reporting

**Why:** Missing admin tools for day-to-day investor management and reporting.

| # | Task | Files | Detail |
|---|------|-------|--------|
| L1 | Add CSV export of investor list | src/Admin.jsx, server/routes/admin.js | "Export CSV" button. Include: name, email, status, group, total committed, total called |
| L2 | Add group filter to investor list | src/Admin.jsx | Dropdown filter to show investors in a specific group |
| L3 | Add group-based message targeting | src/Admin.jsx | In compose message, add "Send to Group" option that selects all investors in chosen group |
| L4 | Add capital account statement PDF generation | server/routes/statements.js | Generate PDF from statement data using existing PDF generation patterns from capital call PDFs |
| L5 | Add investor statement portal access | src/App.jsx, server/routes/statements.js | New "Statements" tab in investor portal showing SENT statements |
| L6 | Add investor activity timeline | src/Admin.jsx, server/routes/admin.js | Timeline view in investor detail: logins, downloads, messages, distributions |

**Commit message:** `Add CSV export, group filters, statement PDFs, investor activity timeline`

---

## Summary

| Sprint | Tasks | Theme | Depends On |
|--------|-------|-------|------------|
| A | 7 | Onboarding blockers | None |
| B | 6 | Document tracking & signing | None |
| C | 6 | Messaging fixes | None |
| D | 7 | Admin project & financial CRUD | None |
| E | 6 | Investor UX | A (empty states) |
| F | 5 | Notifications | C (email patterns) |
| G | 4 | Prospects & permissions | A (user creation) |
| H | 6 | Security & polish | None |
| I | 3 | Demo mode resilience | None |
| J | 6 | Data integrity & security | D (transactions) |
| K | 5 | Audit logging | None |
| L | 6 | Admin lifecycle & reporting | D (financial CRUD) |

**Total: 67 tasks across 12 sprints**

### Execution Order
**Phase 1 (parallel):** Sprints A, B, C, D, I
**Phase 2 (parallel):** Sprints E, F, G, H, K
**Phase 3 (parallel):** Sprints J, L
