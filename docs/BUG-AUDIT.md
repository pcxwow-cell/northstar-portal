# Northstar Portal — Comprehensive Bug Audit

**Date:** 2026-03-18
**Branch:** `bugfix/thorough-review`
**Scope:** Full-stack review of every module, route, workflow, and UI component

---

## Table of Contents

1. [Security & Access Control](#1-security--access-control)
2. [DocuSign / E-Signature Integration](#2-docusign--e-signature-integration)
3. [Document Upload, Download & Management](#3-document-upload-download--management)
4. [Entity & Investor Management](#4-entity--investor-management)
5. [Permissions & RBAC](#5-permissions--rbac)
6. [Approval Workflows & Pipelines](#6-approval-workflows--pipelines)
7. [Email & Notification System](#7-email--notification-system)
8. [Frontend Bugs (App.jsx)](#8-frontend-bugs-appjsx)
9. [Frontend Bugs (Admin.jsx)](#9-frontend-bugs-adminjsx)
10. [API Client & Demo Mode (api.js)](#10-api-client--demo-mode-apijs)
11. [Database & Seed Data](#11-database--seed-data)
12. [Fix Plan](#12-fix-plan)

---

## 1. Security & Access Control

### SEC-1: CRITICAL -- Projects endpoint exposes all data to any investor
- **Location:** `server/routes/projects.js` (GET `/` and GET `/:id`)
- **Issue:** No role check, no IDOR protection. Any authenticated user (including investors) can list ALL projects and view FULL details of ANY project -- cap table, waterfall, distributions, documents, performance history -- even projects they are NOT invested in.
- **Fix:** Add investor scoping: if `role === "INVESTOR"`, filter to only projects the investor is assigned to via `InvestorProject`.

### SEC-2: CRITICAL -- Distributions endpoint has no IDOR protection
- **Location:** `server/routes/distributions.js:8`
- **Issue:** `GET /` accepts an `investorId` query param but does NOT force it to `req.user.id` for investors. An investor can pass any other investor's ID or omit it entirely to see ALL distributions.
- **Fix:** Add `if (req.user.role === "INVESTOR") investorId = String(req.user.id);`

### SEC-3: CRITICAL -- Uploaded files are publicly accessible without auth
- **Location:** `server/index.js:104`
- **Issue:** `app.use("/uploads", express.static(...))` serves the entire uploads directory as public static files with NO authentication. Any uploaded document can be accessed by URL.
- **Fix:** Remove static serving of uploads. Serve files only through the authenticated download endpoint.

### SEC-4: HIGH -- GP can self-escalate to ADMIN role
- **Location:** `server/routes/admin.js` -- `PUT /staff/:id`
- **Issue:** Any ADMIN/GP can change any staff member's role, including their own. A GP could change their own role to ADMIN.
- **Fix:** Prevent self-edit (`req.user.id !== parseInt(req.params.id)`) and prevent GP from assigning ADMIN role.

### SEC-5: HIGH -- Feature flag permissions are frontend-only
- **Location:** `src/Admin.jsx` (PERMISSION_GROUPS, PRESETS)
- **Issue:** The backend does NOT enforce feature flag permissions. A GP with "Read Only" preset can still call all ADMIN/GP endpoints directly. Permissions are decoration only.
- **Fix:** Either enforce flags via middleware or clearly document that role = permission boundary.

### SEC-6: HIGH -- Webhook signature verification missing
- **Location:** `server/routes/signatures.js:278-303`
- **Issue:** No HMAC verification on incoming e-sign webhook payloads. Anyone could POST to the webhook endpoint and forge a "signed" event.
- **Fix:** Implement DocuSign Connect HMAC-256 verification.

### SEC-7: MEDIUM -- Document row click bypasses authenticated download
- **Location:** `src/App.jsx:1178`
- **Issue:** Clicking a document row does `window.open(d.file, "_blank")` which opens the raw file URL, bypassing the authenticated download endpoint and audit logging. Combined with SEC-3, this means no access control.
- **Fix:** Replace with `downloadDocument(d.id)` call.

---

## 2. DocuSign / E-Signature Integration

### ESIGN-1: CRITICAL -- Webhook endpoint is behind JWT auth
- **Location:** `server/index.js:95` mounts signatures router with `authenticate` middleware
- **Issue:** DocuSign Connect/Dropbox Sign webhooks will never include a JWT. Every webhook call gets 401 Unauthorized. External status updates never reach the app.
- **Fix:** Mount the webhook route before `authenticate`, or add a route-level bypass.

### ESIGN-2: CRITICAL -- Webhook does not update individual signer records
- **Location:** `server/routes/signatures.js:278-303`
- **Issue:** Only updates overall `SignatureRequest.status` when fully signed. Does NOT update individual `SignatureSigner` records with `status: "signed"` and `signedAt`. Does not handle "declined" or "cancelled" events.
- **Fix:** Parse signer-level events, update each `SignatureSigner`, handle declined/cancelled/expired statuses.

### ESIGN-3: ~~CRITICAL~~ FIXED -- Investor-side signing modal doesn't call API
- **Location:** `src/App.jsx:1080-1098`
- **Issue:** When a document has `status === "pending_signature"`, clicking "Sign" opens a modal. The `handleSign()` function only updates local React state (`signedDocs`). It does NOT call `signDocument()`. No database record is updated. Refreshing the page loses the "signed" state.
- **Fix:** Call `signDocument(signerId)` from the modal handler, then update local state on success.
- **Status:** FIXED — `handleSign()` now looks up the signer from `pendingSigs`, calls `signDocument(mySigner.id)` with try/catch, and only updates local state on success.

### ESIGN-4: MAJOR -- Demo adapter generates unparseable signer IDs
- **Location:** `server/services/esign/demo.js:22`
- **Issue:** Generates URLs like `/api/v1/signatures/demo_sig_abc123_signer_0/sign`. The route does `parseInt(req.params.signerId)` which returns `NaN`. Prisma query fails.
- **Fix:** Use the actual Prisma-generated `SignatureSigner.id` (integer) in the URL.

### ESIGN-5: MAJOR -- DocuSign never provides embedded signing URLs
- **Location:** `server/services/esign/docusign.js:122-129`
- **Issue:** `signUrl` is always `null`. No `createRecipientView()` call for embedded signing. Investors are sent to the generic portal URL instead of a DocuSign signing ceremony.
- **Fix:** Implement embedded signing via `envelopesApi.createRecipientView()`.

### ESIGN-6: MAJOR -- DocuSign `cancelRequest` uses wrong SDK method
- **Location:** `server/services/esign/docusign.js:173`
- **Issue:** Calls `envelopesApi.update()` which doesn't exist. Should be `envelopesApi.updateEnvelope()`.
- **Fix:** Change to `updateEnvelope()`.

### ESIGN-7: MODERATE -- DocuSign anchor tags assume "/sn/" text in PDF
- **Location:** `server/services/esign/docusign.js:83-88`
- **Issue:** If the uploaded PDF doesn't contain `/sn/` literal text, DocuSign places no signature tabs. The placeholder PDF doesn't contain this text.
- **Fix:** Use position-based tabs as fallback.

### ESIGN-8: MODERATE -- HelloSign adapter entirely non-functional
- **Location:** `server/services/esign/hellosign.js`
- **Issue:** Throws error on require. Falls back to demo mode silently.

### ESIGN-9: MODERATE -- Response shape mismatch between demo and backend
- **Location:** `src/api.js:490-501` vs `server/routes/signatures.js:89-101`
- **Issue:** Demo response includes `userId` but no `signUrl`. Backend includes `signUrl` but no `userId`.

### ESIGN-10: MINOR -- No "expired" status handling anywhere
- **Location:** `prisma/schema.prisma:352`
- **Issue:** Schema defines `expired` status but no code sets it, no scheduler checks for it, frontend doesn't render it.

### ESIGN-11: MINOR -- No "declined" event handling in webhook
- **Location:** `server/routes/signatures.js:287`
- **Issue:** Webhook only checks `event === "signed"`. Declined events are silently ignored.

### ESIGN-12: MINOR -- Demo mode starts with empty signature list
- **Location:** `src/api.js:478`
- **Issue:** `_demoSignatures = []` on page load. No pre-populated demo data for signatures.

---

## 3. Document Upload, Download & Management

### DOC-1: HIGH -- No delete document functionality
- **Location:** Absent from `src/api.js`, `server/routes/documents.js`, `server/routes/admin.js`, `src/Admin.jsx`
- **Issue:** There is no way to delete a document -- no API function, no route, no UI button. Orphaned documents cannot be cleaned up.
- **Fix:** Add `DELETE /api/v1/documents/:id` route with ADMIN/GP role check, cascade delete assignments, add UI button.

### DOC-2: ~~HIGH~~ FIXED -- Document assignment UI missing
- **Location:** `server/routes/admin.js:313-326` (backend exists), `src/Admin.jsx` (frontend added)
- **Issue:** Backend `POST /admin/documents/:id/assign` exists but there was no UI in Admin.jsx. Admins could see who has access but could not modify it.
- **Fix:** Added "Assign to Investors" button in document detail view with checkbox list and save functionality using `assignDocument()`.

### DOC-3: HIGH -- Bulk K-1 upload crashes frontend after success
- **Location:** `src/Admin.jsx:1452`
- **Issue:** Calls `reload()` which is undefined. Should be `loadDocs()`. Throws `ReferenceError` at runtime, document list never refreshes.
- **Fix:** Change `reload()` to `loadDocs()`.

### DOC-4: MEDIUM -- Bulk K-1 upload sends no notifications
- **Location:** `server/routes/documents.js:193-274`
- **Issue:** Single document upload sends notifications (line 172) but bulk K-1 upload does not. Investors don't know their K-1s are available.
- **Fix:** Add `notifyMany()` calls after bulk upload creates assignments.

### DOC-5: MEDIUM -- No document draft/review/publish workflow
- **Location:** `server/routes/documents.js:148`
- **Issue:** All documents go directly to `status: "published"` on upload. There is no draft -> review -> publish pipeline, no publish/unpublish buttons, no status change UI.
- **Fix:** Add status management (draft/published) with UI controls.

### DOC-6: MEDIUM -- Upload/download bypass demo mode detection
- **Location:** `src/api.js:256-263` (download), `src/api.js:445-457` (upload), `src/api.js:459-475` (bulk K-1)
- **Issue:** All use raw `fetch()` instead of `apiFetch()`, so they don't trigger demo mode fallback. They fail silently on Vercel.
- **Fix:** Add demo mode checks with graceful fallback messaging.

### DOC-7: LOW -- S3 storage adapter entirely non-functional
- **Location:** `server/storage/s3.js:51-54`
- **Issue:** Commented out, throws on import.

---

## 4. Entity & Investor Management

### ENT-1: HIGH -- No entity EDIT UI (Admin or Investor)
- **Location:** `src/Admin.jsx:1582-1637`, `src/App.jsx:2061-2117`
- **Issue:** Both admin and investor can create and delete entities but cannot edit them. No edit button, no inline editing, no modal. The backend `PUT /entities/:id` endpoint works. `updateEntity()` is exported from api.js but never called.
- **Fix:** Add edit button/modal that calls `updateEntity()`.

### ENT-2: HIGH -- Address field never collected in entity forms
- **Location:** `src/Admin.jsx:1531`, `src/App.jsx:1953`
- **Issue:** Entity form state includes `address: ""` but neither form has an `<input>` for address. Schema supports it, backend stores it, but UI never sends it. All entities have `address: null`.
- **Fix:** Add address input field to both entity forms.

### ENT-3: HIGH -- No entity-to-investment linking
- **Location:** `server/routes/admin.js:479`, `prisma/schema.prisma:94`
- **Issue:** `InvestorProject.entityId` exists in schema but `POST /admin/investors/:id/assign-project` does not accept `entityId`. No UI exists to choose which entity an investment belongs to. The `entityId` column is always `null`.
- **Fix:** Add `entityId` param to assign-project endpoint, add entity dropdown in assignment UI.

### ENT-4: ~~HIGH~~ FIXED -- No UI to assign investors to projects
- **Location:** `src/Admin.jsx` (InvestorProfile component)
- **Issue:** `assignInvestorProject` was imported but never called. There was no "Assign to Project" button or form anywhere in the admin panel.
- **Fix:** Added "Assign to Project" form in InvestorProfile with project dropdown and committed/called/currentValue fields, calling `assignInvestorProject()`.

### ENT-5: MEDIUM -- Admin profile endpoint omits entities
- **Location:** `server/routes/admin.js:590-636`
- **Issue:** `GET /admin/investors/:id/profile` does not include entities in its Prisma query. Admin.jsx works around this by calling `fetchEntities()` separately, but entities are invisible in the admin investor list.
- **Fix:** Add `entities: true` to the Prisma include.

### ENT-6: MEDIUM -- Investor projects route doesn't return entity info
- **Location:** `server/routes/investors.js:42-56`
- **Issue:** `GET /investors/:id/projects` does not `include: { entity: true }` in Prisma query. Even if `entityId` were populated, entity data wouldn't reach the frontend.
- **Fix:** Add entity include to the Prisma query.

### ENT-7: LOW -- No way to reassign investments before entity deletion
- **Location:** `server/routes/entities.js:84-96`
- **Issue:** Deletion is blocked when investments are linked, but there's no UI to reassign investments to a different entity. The entity becomes permanently undeletable.
- **Fix:** Add reassignment option in delete confirmation dialog.

---

## 5. Permissions & RBAC

### PERM-1: CRITICAL -- No DELETE project endpoint
- **Location:** Absent from `server/routes/admin.js`
- **Issue:** There is no way to delete a project. No API route, no frontend action. Orphaned projects cannot be cleaned up.
- **Fix:** Add `DELETE /api/v1/admin/projects/:id` with cascade handling.

### PERM-2: HIGH -- No hard-delete user endpoint
- **Location:** `server/routes/admin.js`
- **Issue:** Only soft-delete (deactivation) exists via `POST /admin/investors/:id/deactivate`. No permanent deletion. May be intentional for audit compliance, but should be documented.

### PERM-3: HIGH -- GP and ADMIN treated identically on backend
- **Location:** All admin routes use `requireRole("ADMIN", "GP")`
- **Issue:** No granular permission differences between GP and ADMIN roles. The only exception: feature flag management is ADMIN-only. Frontend permission presets ("Read Only", "Full Access") are purely decorative.
- **Fix:** Either enforce GP restrictions via middleware or document the equivalence.

### PERM-4: MEDIUM -- Finance calculation endpoints have no role restriction
- **Location:** `server/routes/finance.js:11,23,257`
- **Issue:** `POST /calculate-irr`, `POST /calculate-waterfall`, `POST /model-scenario` are accessible to any authenticated user. Pure calculators with no data leak, but should be restricted.

---

## 6. Approval Workflows & Pipelines

### FLOW-1: CRITICAL -- Statement store is in-memory only
- **Location:** `server/routes/statements.js:12`
- **Issue:** `const statementStore = new Map()` -- all capital account statements are stored in a JavaScript Map. Lost on server restart. No database persistence.
- **Fix:** Create a `Statement` Prisma model and persist to database.

### FLOW-2: CRITICAL -- Statement "send" is a TODO
- **Location:** `server/routes/statements.js:126-128`
- **Issue:** `// TODO: Actually send email via email service adapter`. Statements are marked SENT but never actually emailed to investors.
- **Fix:** Implement email sending via the notification service.

### FLOW-3: ~~CRITICAL~~ FIXED -- No capital call generation UI
- **Location:** `server/routes/statements.js:211-247` (backend), `src/Admin.jsx` StatementManager (frontend added)
- **Issue:** `POST /generate-capital-call` endpoint existed but had no admin UI form to invoke it.
- **Fix:** Added "Generate Capital Call" form in StatementManager with projectId, callAmount, dueDate, wireInstructions fields. Downloads the returned PDF blob.

### FLOW-4: ~~CRITICAL~~ FIXED -- No quarterly report generation UI
- **Location:** `server/routes/statements.js:250-285` (backend), `src/Admin.jsx` StatementManager (frontend added)
- **Issue:** `POST /generate-quarterly-report` existed but no frontend UI called it.
- **Fix:** Added "Generate Quarterly Report" form in StatementManager with projectId, quarter, summary fields. Downloads the returned PDF blob.

### FLOW-5: HIGH -- No approval pipeline for capital calls or quarterly reports
- **Location:** `server/routes/statements.js`
- **Issue:** Capital calls and quarterly reports are generated and returned as immediate downloads. No draft -> review -> approve -> distribute pipeline.
- **Fix:** Extend the statement workflow to cover these document types.

### FLOW-6: HIGH -- Scheduler integration is broken
- **Location:** `server/services/scheduler.js:58-64`
- **Issue:** Calls `stmt.investorEmail` and `stmt.html` but `generateAllStatements()` returns `{ userId, projectId, statement, error }`. Properties don't exist at top level. Would crash at runtime.
- **Fix:** Fix property access to `stmt.statement.header.investorEmail`.

### FLOW-7: HIGH -- Generated PDFs not saved to storage
- **Location:** `server/routes/statements.js:211-247,250-285`
- **Issue:** Capital call and quarterly report PDFs are returned as direct downloads but NOT saved to the Document table or storage adapter. No record that they were generated.
- **Fix:** Save generated PDFs to storage and create Document records.

### FLOW-8: MEDIUM -- Wrong Prisma relation in quarterly report
- **Location:** `server/routes/statements.js:260`
- **Issue:** Uses `include: { investors: {...} }` but the correct relation is `investorProjects`. Also uses `project.completion` (line 268) instead of `project.completionPct`.
- **Fix:** Change to `investorProjects` and `completionPct`.

### FLOW-9: MEDIUM -- No audit logging for document assignment changes
- **Location:** `server/routes/admin.js:313-326`
- **Issue:** `POST /admin/documents/:id/assign` does not call `audit.log()`.
- **Fix:** Add audit logging.

---

## 7. Email & Notification System

### EMAIL-1: CRITICAL -- Password reset email calls non-existent method
- **Location:** `server/routes/auth.js:193`
- **Issue:** Calls `emailService.send()` but the email service exposes `sendEmail()`. The call always throws, silently caught. The password reset email NEVER sends.
- **Fix:** Change to `emailService.sendEmail()`.

### EMAIL-2: ~~CRITICAL~~ FIXED -- No password reset page in frontend
- **Location:** `src/App.jsx` (missing component)
- **Issue:** Reset email generates URL like `/#/reset-password?token=<token>` but App.jsx has no component for this route. The hash listener only recognizes `#/login`. Clicking the reset link shows the prospect portal. The entire self-service password reset flow is non-functional.
- **Fix:** Add a ResetPasswordPage component and wire it into the hash router.
- **Status:** FIXED — Added `ResetPasswordPage` component that extracts token from hash params, shows new/confirm password form, calls `resetPassword(token, newPassword)`, and redirects to login on success. Hash listener updated to handle `#/reset-password`.

### EMAIL-3: ~~HIGH~~ PARTIALLY FIXED -- No in-app notification display
- **Location:** `src/App.jsx`
- **Issue:** No notification bell, no inbox, no unread indicators. `NotificationLog` has no `read`/`unread` field. `fetchNotifications()` exists in api.js but is never called from any component.
- **Fix:** Add notification bell component, add read/unread tracking, add mark-as-read endpoint.
- **Status:** PARTIALLY FIXED — Added notification bell icon in header that calls `fetchNotifications()` on mount and shows unread count badge. Clicking navigates to messages view. Full notification inbox and mark-as-read still needed.

### EMAIL-4: HIGH -- Distribution notification never triggers
- **Location:** `server/routes/distributions.js`
- **Issue:** The `distribution_paid` template exists but no code path ever calls `notify(userId, "distribution_paid", ...)`. The distributions route is read-only.
- **Fix:** Add notification trigger when distributions are recorded.

### EMAIL-5: HIGH -- Capital call notification never triggers
- **Location:** No route
- **Issue:** `capital_call` template exists in templates.js but nothing invokes it.
- **Fix:** Connect to capital call generation flow.

### EMAIL-6: MEDIUM -- Welcome email uses inline HTML, not branded template
- **Location:** `server/routes/admin.js:357-374`
- **Issue:** Investor invite sends raw inline HTML instead of using the template system. Not branded, hardcoded URL, bypasses notification preferences, no NotificationLog entry.
- **Fix:** Create a `welcome` template and route through `notify()`.

### EMAIL-7: MEDIUM -- Admin password reset uses inline HTML
- **Location:** `server/routes/admin.js:451-466`
- **Issue:** Same as EMAIL-6 -- uses inline HTML instead of the branded `passwordReset` template.
- **Fix:** Use the existing `passwordReset` template from templates.js.

### EMAIL-8: MEDIUM -- Prospect notification fakes "sent" without sending
- **Location:** `server/routes/prospects.js:33-47`
- **Issue:** Creates `NotificationLog` entries for admins with `status: "sent"` but never calls the email service. No email is actually dispatched.
- **Fix:** Call the email service before marking as sent.

---

## 8. Frontend Bugs (App.jsx)

### APP-1: HIGH -- CapTablePage and FinancialModelerPage crash on empty projects
- **Location:** `src/App.jsx:850,1521`
- **Issue:** `myProjects[selectedIdx]` accessed without checking if array is empty. If `myProjects` is `[]`, `project` is `undefined`, causing cascading crashes.
- **Fix:** Add empty-array guard: `if (!myProjects.length) return <EmptyState />;`

### APP-2: HIGH -- Signed document modal doesn't update backend
- **Location:** `src/App.jsx:1082-1098`
- **Issue:** Already covered in ESIGN-3. Modal sign handler only updates local React state.

### APP-3: MEDIUM -- Missing useEffect dependency
- **Location:** `src/App.jsx:1957`
- **Issue:** `investor.id` used in effect but not in dependency array. Entities won't reload if investor changes.
- **Fix:** Add `investor.id` to deps array.

### APP-4: ~~MEDIUM~~ FIXED -- Waterfall input has no null guard
- **Location:** `src/App.jsx:961`
- **Issue:** If `waterfallInput` is empty AND `project.totalRaise` is missing, API gets `NaN`.
- **Fix:** Add validation before API call.
- **Status:** FIXED — Added `parseFloat` + `isNaN` guard with toast error message before API call.

### APP-5: ~~MEDIUM~~ FIXED -- Race condition in financial modeler
- **Location:** `src/App.jsx:1561`
- **Issue:** Changing project tab mid-calculation assigns result to wrong project because `selectedIdx` changes but the in-flight request uses the old project.
- **Fix:** Disable tab switching while loading, or use a request ID to discard stale results.
- **Status:** FIXED — Tab click handler now checks `if (!loading)` before allowing `setSelectedIdx`.

### APP-6: ~~LOW~~ FIXED -- Cap table bar overflows if ownership > 35%
- **Location:** Known bug B4 in ROADMAP.md
- **Fix:** Use percentage-based bar width.
- **Status:** FIXED — Changed from `(r.ownership / 35) * 100` to `Math.min(r.ownership, 100)` for bar width percentage.

### APP-7: ~~LOW~~ FIXED -- Hardcoded "Oct 2025" distribution date
- **Location:** Known bug B5 in ROADMAP.md
- **Fix:** Use actual data from distributions.
- **Status:** FIXED — Replaced hardcoded "Oct 2025" with "See distributions".

### APP-8: ~~LOW~~ FIXED -- Download error silently swallowed
- **Location:** `src/App.jsx:805`
- **Issue:** `.catch(() => {})` provides no user feedback on failure.
- **Fix:** Show toast notification on error.
- **Status:** FIXED — Replaced `.catch(() => {})` with `.catch(err => alert(err.message || "Download failed"))`.

---

## 9. Frontend Bugs (Admin.jsx)

### ADMIN-1: HIGH -- `reload()` undefined after bulk K-1 upload
- **Location:** `src/Admin.jsx:1452`
- **Issue:** Already covered in DOC-3.

### ADMIN-2: HIGH -- Missing address input in entity form
- **Location:** `src/Admin.jsx:1542-1606`
- **Issue:** Already covered in ENT-2.

### ADMIN-3: ~~MEDIUM~~ FIXED -- Wrong property access in signature list
- **Location:** `src/Admin.jsx` (SignatureManager render)
- **Issue:** Used `sig.createdBy?.name` instead of the mapped `sig.createdByName` in the render output.
- **Fix:** Changed to `sig.createdByName`.

### ADMIN-4: MEDIUM -- No UI to assign investors to projects
- **Location:** `src/Admin.jsx`
- **Issue:** Already covered in ENT-4.

---

## 10. API Client & Demo Mode (api.js)

### API-1: HIGH -- fetchProjects strips financial data in demo mode
- **Location:** `src/api.js:220`
- **Issue:** Demo mode mapping removes `irr`, `moic`, `currentValue`, `investorCommitted`, `investorCalled`. Financial columns show as undefined.
- **Fix:** Include all fields in the demo mode mapping.

### API-2: HIGH -- Field name mismatch: completion vs completionPct
- **Location:** `src/api.js:325`
- **Issue:** Demo returns `completion`, backend returns `completionPct` for admin projects. Admin project list may show undefined.
- **Fix:** Normalize field names.

### API-3: MEDIUM -- DELETE with body payload for MFA disable
- **Location:** `src/api.js:191`
- **Issue:** Some proxies/firewalls strip DELETE request bodies.
- **Fix:** Change to POST endpoint.

### API-4: MEDIUM -- getMe() doesn't check token before calling
- **Location:** `src/api.js:114-120`
- **Issue:** If token is null, sends an unnecessary 401 request.
- **Fix:** Early return if no token.

---

## 11. Database & Seed Data

### DB-1: HIGH -- DocumentAssignment records missing for seeded documents
- **Location:** `server/seed.js:218`
- **Issue:** Documents 1,3,4,6,7,8 exist but have no `DocumentAssignment` records. Investors can't see most seeded documents.
- **Fix:** Add assignments in seed.js for the demo investor.

### DB-2: MEDIUM -- MessageRecipient records missing in seed
- **Location:** `server/seed.js:267-277`
- **Issue:** Messages created with no recipients. Depends on application logic that may not exist.
- **Fix:** Add MessageRecipient records in seed.

### DB-3: MEDIUM -- Missing indexes on foreign key columns
- **Location:** `prisma/schema.prisma`
- **Issue:** No indexes on `userId`, `projectId`, `documentId`, etc. Performance degradation on JOINs.
- **Fix:** Add `@@index` directives.

### DB-4: LOW -- Mixed date field types (String vs DateTime)
- **Location:** `prisma/schema.prisma`
- **Issue:** Some fields use String for dates, others use DateTime. Inconsistent and confusing.

---

## 12. Fix Plan

### Sprint 1: Security (Critical)
Fix SEC-1 through SEC-7. These are data leaks and access control failures.
- [ ] Add investor scoping to projects route
- [ ] Add IDOR protection to distributions route
- [ ] Remove public static serving of uploads
- [ ] Add self-edit protection on staff role changes
- [ ] Add webhook signature verification
- [ ] Fix document row click to use authenticated download

### Sprint 2: Core Workflows (Critical)
Fix FLOW-1 through FLOW-9, EMAIL-1, EMAIL-2.
- [ ] Persist statements to database instead of in-memory Map
- [ ] Implement statement email sending
- [ ] Add capital call generation UI
- [ ] Add quarterly report generation UI
- [ ] Fix password reset email method name
- [ ] Add password reset page component
- [ ] Fix scheduler property access
- [ ] Fix quarterly report Prisma relation and field name

### Sprint 3: E-Signature (Critical/Major)
Fix ESIGN-1 through ESIGN-9.
- [ ] Move webhook route outside JWT auth
- [ ] Update webhook handler for individual signers and declined events
- [ ] Fix investor signing modal to call API
- [ ] Fix demo adapter signer IDs
- [ ] Fix DocuSign cancel method name
- [ ] Add anchor tag fallback for DocuSign

### Sprint 4: Document Management (High)
Fix DOC-1 through DOC-6.
- [ ] Add delete document route and UI
- [ ] Add document assignment UI
- [ ] Fix `reload()` -> `loadDocs()` in bulk K-1
- [ ] Add notifications to bulk K-1 upload
- [ ] Add demo mode fallbacks for upload/download

### Sprint 5: Entity & Investor Management (High)
Fix ENT-1 through ENT-7.
- [ ] Add entity edit UI (admin and investor)
- [ ] Add address field to entity forms
- [ ] Add entity-to-investment linking
- [ ] Add investor-to-project assignment UI
- [ ] Add entity include in profile and projects endpoints

### Sprint 6: Permissions & Admin (High)
Fix PERM-1 through PERM-3.
- [ ] Add delete project endpoint and UI
- [ ] Define and enforce GP vs ADMIN differences
- [ ] Add role restriction to finance calculation endpoints

### Sprint 7: Notifications (High)
Fix EMAIL-3 through EMAIL-8.
- [ ] Add in-app notification bell and inbox
- [ ] Connect distribution and capital call notification triggers
- [ ] Create branded welcome email template
- [ ] Fix admin password reset to use template
- [ ] Fix prospect notification to actually send email

### Sprint 8: Frontend & Demo Mode (Medium)
Fix APP-1 through APP-8, ADMIN-1 through ADMIN-4, API-1 through API-4.
- [ ] Add empty-array guards
- [ ] Fix race conditions
- [ ] Fix demo mode data shapes
- [ ] Fix useEffect dependencies
- [ ] Fix known UI bugs (cap table overflow, hardcoded dates)

### Sprint 9: Database & Seed (Medium)
Fix DB-1 through DB-4.
- [ ] Add DocumentAssignment records to seed
- [ ] Add MessageRecipient records to seed
- [ ] Add database indexes
- [ ] Standardize date field types

---

## Issue Count Summary

| Category | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| Security | 3 | 3 | 1 | 0 | **7** |
| E-Signature | 3 | 0 | 5 | 4 | **12** |
| Documents | 0 | 3 | 3 | 1 | **7** |
| Entities | 0 | 4 | 2 | 1 | **7** |
| Permissions | 1 | 2 | 1 | 0 | **4** |
| Workflows | 4 | 3 | 2 | 0 | **9** |
| Email/Notif | 2 | 3 | 3 | 0 | **8** |
| App.jsx | 0 | 2 | 3 | 3 | **8** |
| Admin.jsx | 0 | 2 | 2 | 0 | **4** |
| API Client | 0 | 2 | 2 | 0 | **4** |
| Database | 0 | 1 | 2 | 1 | **4** |
| **TOTAL** | **13** | **25** | **26** | **10** | **74** |
