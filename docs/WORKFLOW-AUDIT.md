# Northstar Investor Portal — Workflow & UX Audit

> Date: 2026-03-18
> Role: QA / PM audit — broken workflows, missing functionality, bad interface design

---

## Severity Guide

| Level | Meaning |
|-------|---------|
| **BLOCKER** | Workflow cannot complete — user is stuck |
| **BROKEN** | Feature exists but doesn't work correctly |
| **MISSING** | Expected feature does not exist |
| **UX** | Works but confusing, buried, or poorly designed |

---

## 1. Investor Onboarding Workflow

### Flow: Admin invites investor → investor receives credentials → logs in → sees dashboard → gets assigned to project

| Step | Status | Detail |
|------|--------|--------|
| Admin opens invite form | OK | Admin.jsx:583-600 — name + email form |
| Backend creates user | **BLOCKER** | admin.js:378 — creates with `status: "PENDING"` |
| Welcome email sent | **BROKEN** | admin.js:386-394 — failure silently logged, admin not notified |
| Investor tries to login | **BLOCKER** | auth.js:33 — rejects non-ACTIVE users as "Invalid email or password" |
| Admin approves investor | **UX** | Approve button buried in detail view, no notification prompting admin |
| Investor sees dashboard | **UX** | All zeros, no empty state message, IRR shows NaN% |
| Admin assigns to project | **UX** | "Assign to Project" button buried inside investor profile detail panel |

### Blockers

**B1: Pending Status Trap** — Investor is created as PENDING but login rejects anything not ACTIVE. The welcome email says "log in with these credentials" but login fails. Error message is misleading ("Invalid email or password" instead of "Account pending approval").
- `admin.js:378` — status: "PENDING"
- `auth.js:33` — `if (!user || user.status !== "ACTIVE")`
- `templates.js:239` — email doesn't mention approval needed

**B2: Silent Email Failure** — If email service is down, admin sees the credential dialog and assumes email was sent. No warning. Investor never receives credentials.
- `admin.js:393` — `console.warn("Welcome email failed")` — only logs to console

### Missing

- No onboarding checklist for new investors
- No "account pending approval" error message on login
- No admin notification that investors need approval
- No inline Approve button in investor list (must click View → scroll → Approve)
- No empty state on dashboard ("Your portfolio is being set up")

---

## 2. Document Lifecycle Workflow

### Flow: Admin uploads → assigns to investors → investors view/download → admin tracks access

| Step | Status | Detail |
|------|--------|--------|
| Admin uploads document | OK | Admin.jsx:1428, documents.js:113 |
| Admin assigns to investors | **BROKEN** | admin.js:348 — `deleteMany` then `createMany` destroys existing view/download tracking |
| Investor sees document | OK | App.jsx:1052-1273, documents.js:16 |
| Investor downloads | **BROKEN** | App.jsx:1199 — uses `window.open(d.file)` bypassing secure download endpoint |
| Download tracking | **BROKEN** | documents.js:83-94 has tracking but it's never called because download bypasses it |
| Admin sees access audit | **BROKEN** | Admin.jsx:1368 — shows download dates but they're always empty |

### E-Signature Flow

| Step | Status | Detail |
|------|--------|--------|
| Admin requests signature | OK | Admin.jsx:1313, signatures.js:11 |
| Document status changes | OK | signatures.js:72-75 |
| Investor sees "Action Required" | OK | App.jsx:1136-1155 |
| Investor reviews document before signing | **MISSING** | Sign modal (App.jsx:1223-1248) shows NO PDF preview |
| Investor signs document | **BROKEN** | App.jsx:1112 — fake confirmation dialog, no actual signature capture |
| Webhook updates status | **BROKEN** | signatures.js:278 — no HMAC verification, doesn't update signer records |
| Admin sees signed status | **MISSING** | Admin.jsx:1356-1375 — no signer status table in document detail |

### Bulk K-1 Upload

| Step | Status | Detail |
|------|--------|--------|
| Admin uploads multiple K-1s | OK | Admin.jsx:1482-1531, documents.js:193 |
| Auto-matching by name | OK | documents.js:210-225 |
| Unmatched K-1s | **MISSING** | documents.js:243 — orphaned with status "pending", no UI to reassign |

### Missing

- No PDF preview/viewer anywhere (all opens are `window.open`)
- No signature decline option for investors
- No "remind investor" / resend signature request button
- No document acknowledgement flow (schema has `acknowledgedAt` but no UI)
- No bulk assignment UI (one doc → many investors in batch)
- Review modal iframe may fail silently on CORS (App.jsx:1262)

---

## 3. Messaging Workflow

### Flow: Admin composes → selects recipients → sends → investor sees in inbox → reads → replies

| Step | Status | Detail |
|------|--------|--------|
| Admin composes message | OK | Admin.jsx:3421-3527 |
| Selects recipients (individual/project/all) | OK | Admin.jsx:3431-3509, searchable picker works |
| Message sent | OK | threads.js:130-186 |
| Email notification to investor | **MISSING** | threads.js:131-186 — NO email sent on thread creation, only on reply |
| Investor sees in inbox | OK | App.jsx:1329-1535 |
| Unread badge updates | OK | App.jsx:3006-3008 |
| Investor reads message | OK | threads.js:121-124 marks read |
| Investor replies | OK | threads.js:188-245 |
| Admin sees reply | OK | Admin.jsx:3375-3417 |
| Admin sees read receipts | **MISSING** | Admin.jsx:3375-3417 — no read receipt display |
| Search messages | **MISSING** | No search in either admin or investor inbox |
| Sort messages | **MISSING** | No sort options |
| Delete/archive messages | **MISSING** | No delete or archive |

### Dead Code

- Legacy `Message` model + `/admin/messages` endpoint (admin.js:308-338) — unused, replaced by threads
- `sendMessage()` in api.js:461-463 — exported but never called
- Inbound email webhook (inbound-email.js) — set up but never receives emails because no reply-to addresses are sent

### UX Issues

- Admin "From Investors" filter only shows threads created by investors, not threads with investor replies (Admin.jsx:3370)
- Timestamp format inconsistent: investor sees year, admin doesn't (App.jsx:1414 vs Admin.jsx:3400)
- **Investors can see read receipts** (App.jsx:1422-1440) — investors should NOT see who else read a message (other investors or staff). Read receipts should be admin/GP only
- Notification bell goes to messages page, not a notification center (App.jsx:3004)
- No message attachments supported

---

## 4. Admin Project Management Workflow

### Flow: Create project → manage cap table → configure waterfall → post updates → record distributions

| Step | Status | Detail |
|------|--------|--------|
| Create project with all fields | OK | Admin.jsx:348-415, admin.js:28-67 |
| Auto-create waterfall tiers | OK | admin.js:52-63 |
| Edit project details | OK | Admin.jsx:883-927, admin.js:131-157 |
| Quick edit from card | OK | Admin.jsx:453-485 |
| View cap table | OK | Admin.jsx:999-1019 (read-only display) |
| Add/edit/delete cap table entries | **MISSING** | No CRUD UI, no backend endpoints |
| Bulk import cap table | **MISSING** | No import functionality |
| Edit waterfall parameters | OK | Admin.jsx:1042-1056, admin.js:188-202 |
| Edit individual waterfall tiers | **MISSING** | Tiers auto-created on project creation, read-only after |
| Run financial scenario model | OK | Admin.jsx:1082-1187, finance.js:259-378 |
| Post project update | OK | Admin.jsx:1888-2009, admin.js:205-229 |
| Attach photos to update | **MISSING** | No file input, no media fields in schema |
| Record cash flow (distribution/capital call) | OK | Admin.jsx:2054-2170, finance.js:79-100 |
| Assign investor to project | OK | Admin.jsx:1740-1795, admin.js:483-502 |

### Missing

- **Cap table management** — displayed but not editable. No way to add entries, edit allocations, or import from spreadsheet
- **Waterfall tier editing** — tiers locked after project creation. Can change pref/carry/catchup percentages but not tier structure
- **Media on updates** — text-only updates. No photo upload for construction progress
- **Assign from project view** — must go to investor profile to assign. No "Add investor" button on project detail page

---

## 5. Investor Portal UX

### Dashboard

| Issue | Type | Detail |
|-------|------|--------|
| Project cards don't drill down | **UX** | App.jsx:524 — clicks go to portfolio list, not specific project |
| IRR shows NaN% for new investments | **BROKEN** | App.jsx:497 — no null check on IRR calculation |
| No empty state | **UX** | All zeros shown with no explanation |
| Recent messages not clickable | **UX** | App.jsx:612-632 — styled text, not interactive |
| Time-of-day greeting hardcoded | **UX** | App.jsx:477 — always says same greeting |

### Investment Detail

| Issue | Type | Detail |
|-------|------|--------|
| No tab interface | **UX** | Everything vertically stacked — stats, capital account, cash flows, about, updates, documents in one long scroll |
| No empty states for sub-sections | **UX** | Blank space if no updates, no cash flows, etc. |
| Capital account grid unreadable on mobile | **UX** | 4-column grid doesn't collapse on small screens |
| Document download uses alert() on error | **UX** | App.jsx:805 — browser alert instead of toast |

### Distributions Page

| Issue | Type | Detail |
|-------|------|--------|
| Status always "Paid" | **BROKEN** | App.jsx:1318 — hardcoded, no actual status tracking |
| "Next Estimated" shows "See distributions" | **UX** | App.jsx:1290 — unhelpful placeholder text |
| No detail view on click | **MISSING** | Can't see distribution breakdown by tier |

### Profile & Security

| Issue | Type | Detail |
|-------|------|--------|
| MFA backup codes not copyable | **UX** | App.jsx:1926-1930 — no copy button |
| Password validation mismatch | **UX** | Strength bar checks for special char but form validation doesn't require it |
| Login history limited to 10 entries | **UX** | App.jsx:1954 — no pagination |
| Missing profile fields | **MISSING** | No phone, address, accreditation status |

### Prospect Portal

| Issue | Type | Detail |
|-------|------|--------|
| Interest form submits but goes nowhere | **BLOCKER** | ProspectPortal.jsx:84 — no backend route creates investor account |
| All project data hardcoded | **BROKEN** | ProspectPortal.jsx — never fetches from API, `fetchProjects` imported but unused |
| No prospect → investor conversion flow | **MISSING** | Form submits, admin reviews... somehow? No pipeline, no status tracking |
| Mobile layouts broken | **UX** | Fixed-width containers, no responsive design |

---

## 6. Permissions & Account Management

### Staff Permissions — COMPLETE

| Feature | Status | Detail |
|---------|--------|--------|
| Granular permission flags (15 flags across 4 groups) | OK | Admin.jsx:2541-2724 |
| Role presets (Full Admin, Project Manager, Accounting, Read Only) | OK | Admin.jsx:2550 |
| Per-staff permission editing | OK | API: updateUserFlags() |

### Investor Permissions — MISSING

| Feature | Status | Detail |
|---------|--------|--------|
| Custom investor permissions | **MISSING** | Fixed INVESTOR role, no customization |
| Investor groups with access control | **MISSING** | InvestorGroup model exists but is categorization only, no permission flags |
| Restrict investor to specific projects only | **MISSING** | Investor sees all assigned projects, no selective hiding |
| Restrict investor from specific tabs/features | **MISSING** | All investors see all portal features |

### Account Management

| Feature | Status | Detail |
|---------|--------|--------|
| Reset investor password | OK | Admin.jsx:661, admin.js:454-481 — generates new temp password + sends email |
| Reset staff password | OK | Admin.jsx:2665, admin.js:866-893 |
| Credential dialog with copy | OK | Admin.jsx:2727-2750 |
| Unlock locked investor account | **BROKEN** | admin.js:431-441 — backend endpoint exists but NO UI button and NO api.js function |
| Deactivate investor | OK | Admin.jsx:641, admin.js:421-430 |
| Approve pending investor | OK | Admin.jsx:641, admin.js:421-430 |

---

## 7. Notification & Activity System

| Feature | Status | Detail |
|---------|--------|--------|
| Notification bell with unread count | OK | App.jsx:3003-3009 |
| Notification page / activity log | **MISSING** | Bell just links to messages page |
| Email on new thread creation | **MISSING** | threads.js:131-186 — no notify call |
| Email on new document | OK | documents.js:277-285 |
| Email on signature request | OK | signatures.js notification flow |
| Email on distribution | **MISSING** | No notification triggered |
| In-app toast notifications | OK | Toast system exists throughout |
| Real-time updates | **MISSING** | No WebSocket/polling for live updates |

---

## Priority Fix List

### P0 — Blockers (users cannot complete workflow)

| # | Issue | Files | Fix |
|---|-------|-------|-----|
| 1 | Investor created as PENDING but login rejects non-ACTIVE with wrong error | admin.js:378, auth.js:33 | Either auto-activate on invite, or show "Account pending approval" error |
| 2 | Document download bypasses tracking endpoint | App.jsx:1199 | Change `window.open(d.file)` to call `downloadDocument(d.id)` via API |
| 3 | Document signing is fake (confirmation dialog, no actual signing) | App.jsx:1112, 1223-1248 | Integrate DocuSign/HelloSign or build signature pad |
| 4 | Prospect interest form has no backend | ProspectPortal.jsx:84 | Create endpoint, admin review flow, prospect→investor conversion |
| 5 | Unlock account button missing from UI | admin.js:431-441 | Add button to investor detail + api.js function |

### P1 — Broken (feature exists but wrong)

| # | Issue | Files | Fix |
|---|-------|-------|-----|
| 6 | Document assignment destroys view/download tracking | admin.js:348 | Use upsert instead of deleteMany + createMany |
| 7 | No email notification on new thread creation | threads.js:131-186 | Add notify call after thread creation |
| 8 | Sign modal shows no PDF preview | App.jsx:1223-1248 | Add iframe or "View Document" button before sign |
| 9 | IRR shows NaN% for new investments | App.jsx:497 | Add null check, show "—" instead |
| 10 | Welcome email failure not reported to admin | admin.js:393 | Return warning in API response, show in credential dialog |
| 11 | Distribution status hardcoded to "Paid" | App.jsx:1318 | Use actual status from backend |
| 12 | Prospect portal projects hardcoded, never fetches API | ProspectPortal.jsx | Call fetchProjects, remove static data |

### P2 — Missing (expected feature doesn't exist)

| # | Issue | Category |
|---|-------|----------|
| 13 | Cap table CRUD (add/edit/delete entries) | Admin |
| 14 | Waterfall tier editing after creation | Admin |
| 15 | Photo/media upload on project updates | Admin |
| 16 | Activity/notification log page | Investor |
| 17 | Investor permission customization | Admin |
| 18 | Message search and sort | Messaging |
| 19 | Message delete/archive | Messaging |
| 20 | Admin read receipt display | Messaging |
| 21 | Unmatched K-1 reassignment UI | Documents |
| 22 | Signature decline option | Documents |
| 23 | Remind/resend signature request | Documents |
| 24 | Standalone capital account statement page | Investor |
| 25 | "Assign investor" from project detail view | Admin |
| 26 | Distribution detail view (waterfall breakdown) | Investor |

### P3 — UX Polish

| # | Issue | Category |
|---|-------|----------|
| 27 | Dashboard project cards don't drill down to detail | Investor |
| 28 | Investment detail needs tab interface instead of vertical scroll | Investor |
| 29 | Empty states missing throughout (dashboard, portfolio, distributions) | Investor |
| 30 | MFA backup codes need copy-to-clipboard button | Security |
| 31 | Password validation vs strength bar mismatch | Security |
| 32 | Login history needs pagination | Security |
| 33 | Profile missing phone/address/accreditation fields | Investor |
| 34 | Approve button should be inline in investor list | Admin |
| 35 | Mobile capital account grid needs responsive redesign | Investor |
| 36 | Recent messages on dashboard should be clickable | Investor |
| 37 | Timestamp format inconsistent (admin vs investor) | Messaging |
| 38 | Remove dead legacy messaging code | Cleanup |

---

## Dead Code to Remove

| Item | Location | Replaced By |
|------|----------|-------------|
| Legacy `Message` model endpoints | admin.js:308-338 | Thread system |
| `sendMessage()` API function | api.js:461-463 | `createThread()` |
| Inbound email webhook (never receives) | inbound-email.js | Email notifications not sent with reply-to |
| `fetchProjects` import in ProspectPortal | ProspectPortal.jsx | Hardcoded data (should be fixed, not removed) |

---

## Summary

| Category | Blockers | Broken | Missing | UX Issues |
|----------|----------|--------|---------|-----------|
| Onboarding | 2 | 1 | 3 | 3 |
| Documents | 1 | 4 | 5 | 1 |
| Messaging | 0 | 1 | 5 | 4 |
| Admin Projects | 0 | 0 | 4 | 1 |
| Investor Portal | 1 | 3 | 4 | 8 |
| Permissions | 0 | 1 | 2 | 0 |
| Notifications | 0 | 0 | 3 | 0 |
| **Total** | **4** | **10** | **26** | **17** |
