# Northstar Portal — Full Platform Audit

> Date: 2026-03-19
> Auditor: Claude Opus (automated)
> Scope: Every page, workflow, and feature — investor portal + admin panel + backend
> Benchmark: Juniper Square, InvestNext, AppFolio Investment Management, CrowdStreet

---

## Executive Summary

**Overall: 6/10** — Strong backend (136 tests, 22 Prisma models, adapter patterns), clean extracted frontend (26 modules). But the platform feels like a developer prototype, not a product. Missing: image uploads, data export, bulk operations, proper empty states, loading feedback, mobile polish, and the dozens of small UX details that make competing platforms feel professional.

| Area | Score | Verdict |
|------|-------|---------|
| Authentication & Security | 8/10 | JWT + MFA + lockout. Missing SSO, session mgmt |
| Investor Dashboard | 6/10 | Stats + charts work. No customization, no forecasting |
| Portfolio & Projects | 7/10 | Capital accounts, cash flows, KPIs all work. No project images |
| Documents | 6/10 | Upload/sign/assign work. No versioning, no preview in demo, no search |
| Cap Table & Waterfall | 8/10 | Best feature. Scenario modeling, sensitivity analysis |
| Distributions | 4/10 | Just a list. No forecasting, no tax linkage, no charts |
| Messages | 5/10 | Threads work. No attachments, no search, no templates |
| Admin Panel | 5/10 | All CRUD exists. UX is cramped, no bulk actions, no export |
| Permissions | 4/10 | Flags exist in UI but backend doesn't enforce them |
| Groups | 4/10 | Basic CRUD. No validation, no business logic, unclear purpose |
| Statements | 6/10 | Workflow works. No templates, no scheduling |
| Prospects | 4/10 | Minimal pipeline. No lead source, no funnel |
| Data Export | 1/10 | Permission flag exists, no implementation |
| Project Images | 0/10 | Hardcoded thumbnails. No upload endpoint |
| Mobile Experience | 3/10 | Responsive CSS exists but admin panel breaks on mobile |

---

## CRITICAL ISSUES (Fix First)

### C1. No project image upload
- ProjectManager.jsx lines 162-167: thumbnails are hardcoded color blocks
- No `POST /admin/projects/:id/image` endpoint
- No file storage configured for project media
- **Every competitor** shows project hero photos — this looks broken without them
- **Fix:** Add multer endpoint, store via storage adapter, return imageUrl, display in project cards

### C2. Backend doesn't enforce permission flags
- StaffManager.jsx shows 20+ toggleable permission flags
- `server/middleware/featureGuard.js` exists (27 lines) but is NOT used on any admin route
- `server/routes/admin.js` line 11: only `requireRole("ADMIN", "GP")` — no feature checks
- **Result:** An admin with `uploadDocuments: false` can still upload via API
- **Fix:** Add `requireFeature("flagName")` middleware to each protected route

### C3. No data export anywhere
- StaffManager.jsx defines `exportData` permission flag
- No CSV/Excel/PDF export endpoints exist in the backend
- No export buttons on any admin data table (investors, projects, documents, audit log)
- **Every competitor** lets you export investor lists, distribution reports, audit trails
- **Fix:** Add `/admin/export/:type` endpoints (CSV at minimum), add export buttons to DataTable

### C4. No file type/size validation on document upload
- `server/routes/documents.js`: multer accepts any file type, no size limit
- Could upload .exe, .sh, or 5GB files
- **Fix:** Whitelist file types (pdf, doc, docx, xlsx, csv, jpg, png), set 50MB limit

### C5. Group system has no business logic
- Groups exist for document assignment but:
  - No circular reference prevention (A parent of B parent of A)
  - Tier system (Primary LP, Sub-LP, Fund of Funds) is cosmetic only
  - Deleting a group with members: no warning, no confirmation
  - Group permissions: groups can't control what members access
  - No auto-sync: adding investor to group doesn't auto-assign group's documents
- **Fix:** Add validation, confirmation dialogs, and document auto-assignment

---

## ADMIN PANEL ISSUES (By Section)

### Dashboard (AdminDashboard.jsx, 202 lines)
| Issue | Severity | Detail |
|-------|----------|--------|
| Quick actions don't pre-fill forms | Medium | "Invite Investor" navigates but doesn't open invite form |
| No refresh button | Low | Must reload page to see new pending actions |
| Stat cards show counts only | Medium | Should show trends ("+3 this week") |
| No revenue/AUM summary | High | Dashboard should show total AUM, capital deployed, distributions paid |

### Project Management (ProjectManager.jsx + ProjectDetail.jsx, 1164 lines)
| Issue | Severity | Detail |
|-------|----------|--------|
| No project images/photos | Critical | Hardcoded colored blocks instead of real project thumbnails |
| No project templates | Medium | Creating similar projects requires re-entering all fields |
| No batch project updates | Medium | Can't update completion % across multiple projects at once |
| Org chart is raw JSON textarea | High | Should be a visual tree editor or at minimum structured form |
| No project timeline/Gantt | Medium | Competitors show project milestones on a timeline |
| KPI editing is cramped | Medium | Three tiny inputs per row, hard to use |
| Cash flow CSV import missing | High | Must enter each cash flow manually — no bulk import |
| "Recalculate" button unexplained | Medium | No tooltip/description of what this does |
| No project duplication | Low | Can't clone a project as starting point |

### Investor Management (InvestorManager.jsx + InvestorProfile.jsx, 658 lines)
| Issue | Severity | Detail |
|-------|----------|--------|
| No bulk invite | High | Inviting 50 investors = filling form 50 times |
| No bulk approve | High | Approving 50 pending investors = 50 clicks |
| No CSV import for investors | High | Can't upload a spreadsheet of investors |
| No accreditation tracking | High | Competitors track accredited/qualified status with verification |
| No investor contact log | Medium | No record of calls, emails, meetings |
| No investor tier/class | Medium | Can't classify LP Class A vs Class B |
| Deactivate has no confirmation | Medium | One click = locked out, no undo |
| KPI editing is inline and cramped | Medium | Should use a modal with clear labels |
| Entity management buried | Low | Have to click into profile to manage entities |
| No investor onboarding checklist | Medium | Competitors show: KYC submitted? Subscription agreement signed? Wire received? |

### Document Management (DocumentManager.jsx, 458 lines)
| Issue | Severity | Detail |
|-------|----------|--------|
| No document versioning | High | Replace a document = old version gone forever |
| PDF preview disabled in demo | Medium | Shows "not available" with no explanation |
| K-1 filename matching is fragile | High | `K1_JamesChen_2025.pdf` relies on fuzzy name parsing |
| No document search by content | Medium | Can only search by name, not what's inside |
| No expiring access | Medium | Once assigned, access is permanent |
| No watermarking | Low | Downloaded PDFs have no investor-specific watermark |
| No download restrictions | Low | Can't make a document view-only (no download) |
| Access audit missing engagement | Medium | Shows viewed/downloaded dates but no count or duration |
| No document categories customization | Low | Categories hardcoded: Reporting, Property Update, Offering, etc. |

### Staff & Permissions (StaffManager.jsx, 296 lines)
| Issue | Severity | Detail |
|-------|----------|--------|
| Permissions not enforced on backend | Critical | See C2 above |
| No audit trail for permission changes | High | Who changed what flag? When? No log |
| Permission presets are hardcoded | Medium | Can't create custom presets |
| No time-based access | Low | Can't restrict access to business hours |
| No last-admin protection for role changes | Medium | Only checks on deactivation, not role downgrade |
| Flag descriptions missing | Medium | Flags like "manageWaterfall" — what does this actually control? |

### Group Management (GroupManager.jsx, 183 lines)
| Issue | Severity | Detail |
|-------|----------|--------|
| No circular reference check | High | Can create A → B → A hierarchy |
| Tier system is cosmetic only | Medium | Primary LP, Sub-LP labels but no business logic |
| Delete without confirmation | Medium | Groups with members can be deleted with one click |
| No group-level document assignment sync | High | Adding investor to group doesn't give them group's documents |
| Member count ambiguous | Low | Shows total including children but UI doesn't explain |
| No group editing (rename/re-tier) | Medium | Can only create or delete, can't edit group properties |
| Search missing | Low | No search for groups by name |

### Messaging (AdminInbox.jsx, 315 lines)
| Issue | Severity | Detail |
|-------|----------|--------|
| No file attachments | High | Can't send documents through messages |
| No canned responses/templates | Medium | Admin types everything from scratch |
| No message search | Medium | Can't search message history |
| No message assignment | Low | Can't assign a message thread to a specific admin |
| "All Investors" broadcast has no preview | Medium | No way to preview what investors will receive |
| No read receipts | Low | Admin doesn't know if investor read the message |

### Statement Manager (StatementManager.jsx, 583 lines)
| Issue | Severity | Detail |
|-------|----------|--------|
| No email templates | High | Statement emails use generic format |
| No send scheduling | Medium | Can only send immediately |
| No recipient tracking | Medium | Don't know if investor opened/downloaded statement |
| Capital call form is basic | Medium | No attachment support, no custom fields |
| No statement preview before send | Medium | Can approve without seeing exactly what investor gets |
| Statement data format unclear | Medium | "Statement Data" tab shows raw JSON |

### Prospect Manager (ProspectManager.jsx, 205 lines)
| Issue | Severity | Detail |
|-------|----------|--------|
| No lead source tracking | High | Don't know how prospects found you |
| No sales pipeline stages | High | Only: new → contacted → qualified → converted → declined |
| No follow-up reminders | Medium | No way to set "follow up on March 25" |
| No prospect notes/history | Medium | Can't log interactions |
| No conversion analytics | Low | Don't know conversion rate, time-to-convert |

### Email Settings (EmailSettings.jsx, 325 lines)
| Issue | Severity | Detail |
|-------|----------|--------|
| No email template preview | Medium | Can edit settings but can't see what emails look like |
| No template variables reference | Medium | What variables are available? {{investor.name}}? |
| Email log pagination missing | Low | Shows all logs at once |
| Test email goes to admin only | Low | Should allow testing to any address |

### Audit Log (AuditLog.jsx, 117 lines)
| Issue | Severity | Detail |
|-------|----------|--------|
| No export | High | Can't export audit log for compliance |
| Only 100 entries | High | No pagination, no date range filter |
| No change details | Medium | Shows "profile_update" but not what changed |
| User field sometimes blank | Medium | Audit service not consistently logging userId |
| No date range filter | Medium | Can only filter by action type |

---

## INVESTOR PORTAL ISSUES (By Page)

### Overview
| Issue | Detail |
|-------|--------|
| No empty state for 0 projects | Shows awkward blank space |
| Chart data hardcoded in demo | Performance history is fake |
| No portfolio allocation chart (pie/donut) | Competitors show allocation by project, asset class |
| No cash flow forecast | "Next distribution" unknown |
| No benchmark comparison | No S&P 500 or NCREIF overlay |

### Portfolio
| Issue | Detail |
|-------|--------|
| No project hero images | Just colored blocks |
| Capital account falls back silently | If API fails, shows demo data without warning |
| No NAV history chart | Only shows current value, no historical trend |
| No PDF export of capital account statement | Must screenshot or copy |

### Documents
| Issue | Detail |
|-------|--------|
| Signing flow simplified | "Sign Now" marks as signed without e-sign provider redirect |
| No full-text search | Can only search by document name |
| No document acknowledgment tracking visible | Investor sees signed/unsigned but not acknowledgment |

### Distributions
| Issue | Detail |
|-------|--------|
| "Next Estimated" stat says "See distributions" | Should show actual forecast or "TBD" |
| No cumulative returns chart | Just a flat table |
| No tax document linkage | K-1s not linked to distribution records |

### Messages
| Issue | Detail |
|-------|--------|
| No file attachments | Can't share documents through messages |
| No message search | Thread list only filterable, not searchable by content |

### Financial Modeler
| Issue | Detail |
|-------|--------|
| Can't save/compare scenarios | Run once, gone when you navigate away |
| No chart visualizations | Sensitivity analysis is a table, should be a chart |

### Profile & Security
| Issue | Detail |
|-------|--------|
| Email change field may silently fail | Field editable but API might reject |
| No profile photo upload | Just initials in colored circle |
| Login history IPs show "unknown" in demo | No explanation of why |

---

## MISSING FEATURES (vs Competitors)

### Features every competitor has that Northstar lacks:

| Feature | Juniper Square | InvestNext | Northstar |
|---------|---------------|------------|-----------|
| Project photo gallery | Yes | Yes | **No** |
| Investor CSV import | Yes | Yes | **No** |
| Bulk investor operations | Yes | Yes | **No** |
| Data export (CSV/Excel/PDF) | Yes | Yes | **No** |
| Document versioning | Yes | Yes | **No** |
| Email templates (customizable) | Yes | Yes | **No** |
| Accreditation tracking | Yes | Yes | **No** |
| Investor onboarding checklist | Yes | Yes | **No** |
| Distribution forecasting | Yes | No | **No** |
| Custom reports | Yes | Yes | **No** |
| File attachments in messages | Yes | Yes | **No** |
| Native e-sign (DocuSign) | Yes | Yes | **Partial** (adapter exists) |
| Mobile app | Yes | No | **No** |
| SSO / SAML | Yes | No | **No** |
| Webhooks / API | Yes | Yes | **No** |

---

## RECOMMENDED IMPROVEMENT PLAN

### Sprint 1: Critical Fixes (est. 2-3 days)
1. **Project image upload** — add multer endpoint, storage adapter, display in cards
2. **Backend permission enforcement** — wire featureGuard middleware to all admin routes
3. **File upload validation** — whitelist types, set 50MB limit
4. **Confirmation dialogs** — group deletion, investor deactivation
5. **Group circular reference check** — validate parentId on create/update

### Sprint 2: Data Export & Bulk Operations (est. 2-3 days)
1. **CSV export** for investors, projects, distributions, documents, audit log
2. **Bulk investor invite** — CSV upload with name/email columns
3. **Bulk approve** — checkbox selection + "Approve Selected" button
4. **Cash flow CSV import** — upload spreadsheet of capital calls/distributions
5. **Audit log pagination** — load more, date range filter

### Sprint 3: Document & Statement Polish (est. 2-3 days)
1. **Document versioning** — track versions, show history, restore previous
2. **PDF preview** — ensure working in production (not just demo)
3. **Statement email templates** — customizable subject/body with variables
4. **Statement preview** before sending
5. **Recipient engagement tracking** — opened, downloaded timestamps

### Sprint 4: Investor Portal UX (est. 2-3 days)
1. **Project images** on investor overview and portfolio cards
2. **Distribution forecast** — "Next estimated: Q2 2026" based on schedule
3. **Portfolio allocation chart** (donut/pie)
4. **Cumulative returns chart** on distributions page
5. **Empty states** — helpful messages for every "no data" scenario
6. **File attachments** in messages

### Sprint 5: Admin UX Polish (est. 2-3 days)
1. **Dashboard AUM/revenue summary** cards
2. **Quick action pre-fill** — buttons open relevant forms
3. **Org chart visual editor** (replace JSON textarea)
4. **KPI editing modal** (replace cramped inline inputs)
5. **Prospect pipeline** — add lead source, follow-up dates, notes
6. **Group editing** — rename, change tier, reorder

### Sprint 6: Advanced Features (est. 3-5 days)
1. **Accreditation tracking** — status, verification date, expiry
2. **Investor onboarding checklist** — KYC, subscription agreement, wire
3. **Custom reports builder** — select columns, filter, export
4. **Scenario comparison** — save and compare waterfall scenarios
5. **Push notifications** — WebSocket for real-time updates
6. **Email digest** — daily/weekly summary option

---

## FILES REFERENCED

| File | Lines | Role |
|------|-------|------|
| src/admin/ProjectManager.jsx | 225 | Project CRUD, missing images |
| src/admin/ProjectDetail.jsx | 939 | Project detail, 7 tabs |
| src/admin/InvestorManager.jsx | 234 | Investor CRUD, no bulk ops |
| src/admin/InvestorProfile.jsx | 425 | Investor detail + entities |
| src/admin/DocumentManager.jsx | 458 | Document upload/assign/sign |
| src/admin/StaffManager.jsx | 296 | Staff + permissions |
| src/admin/GroupManager.jsx | 183 | Group hierarchy |
| src/admin/AdminInbox.jsx | 315 | Messaging |
| src/admin/StatementManager.jsx | 583 | Statement workflow |
| src/admin/ProspectManager.jsx | 205 | Lead pipeline |
| src/admin/EmailSettings.jsx | 325 | Email config |
| src/admin/AuditLog.jsx | 117 | Audit log |
| src/admin/AdminDashboard.jsx | 202 | Dashboard |
| src/admin/SignatureManager.jsx | 100 | Signature tracking |
| src/pages/Overview.jsx | 272 | Investor dashboard |
| src/pages/Portfolio.jsx | 286 | Project detail |
| src/pages/Documents.jsx | 301 | Document viewing/signing |
| src/pages/Distributions.jsx | 74 | Distribution history |
| src/pages/Messages.jsx | 273 | Messaging |
| src/pages/CapTable.jsx | 235 | Cap table + waterfall |
| src/pages/FinancialModeler.jsx | 193 | Scenario modeling |
| src/pages/Profile.jsx | 223 | Account profile |
| src/pages/Security.jsx | 252 | Password/MFA/login history |
| server/routes/admin.js | ~1029 | Admin API routes |
| server/routes/documents.js | ~400 | Document routes |
| server/middleware/featureGuard.js | 27 | Unused permission middleware |
| prisma/schema.prisma | ~600 | Database models |
