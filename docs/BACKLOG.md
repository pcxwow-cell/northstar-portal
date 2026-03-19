# Northstar Investor Portal — Backlog

> Last updated: 2026-03-18
> Priority: P0 = must-have, P1 = should-have, P2 = nice-to-have, P3 = future
> Status: ○ not started, ◐ in progress, ● done
> Research baseline: Juniper Square, Agora, InvestNext, Covercy, CashFlow Portal
> Audit status: 114 issues found, 107 unfixed — see audit docs for details

---

## Current Priority: Frontend Extraction

**Before any feature work, the frontend architecture must be fixed.**
See `docs/FRONTEND-PLAN.md` for the ~35-commit extraction plan.

The two monolithic frontend files (Admin.jsx: 4,796 lines, App.jsx: 3,336 lines) make every bug fix risky and every feature addition harder. 14 shared components exist but aren't imported. The extraction is prerequisite to all functional fixes below.

---

## Industry Gap Analysis

### What We Have vs. Industry Standard (Honest Assessment)

| Feature | Northstar (Current) | Industry Standard (JS/Agora/IN) | Gap |
|---------|--------------------|---------------------------------|-----|
| **Investor Dashboard** | KPI strip, project cards, charts | Portfolio overview with charts, live offerings | Backend data works, frontend has no empty states, NaN on missing IRR |
| **Investment Detail** | Project detail with cap table, waterfall | Click-through with photos, map, transactions | Missing: drill-down from dashboard, tab interface, photo gallery |
| **Capital Account** | Per-project with IRR/MOIC from cash flows | Per-investor statement across all projects | Missing: cross-project summary view |
| **Documents** | Filter by project/category, signatures | Two-tab layout, download tracking | **Broken**: downloads bypass tracking, assignment destroys history |
| **Messaging** | Threaded messaging, compose | Threaded with email notifications | **Broken**: no email on new threads, read receipts exposed to investors |
| **Self-Service** | Profile, entity management, MFA | Profile, banking, contact info | Missing: phone, address, banking |
| **Onboarding** | Invite + credentials | Self-guided subscription flow | **Broken**: PENDING users get "invalid credentials" error |
| **Notifications** | Email templates exist | Real-time alerts | Scaffolded only — not wired to events |
| **Mobile** | Some responsive | Fully responsive | 22 responsive failures documented |
| **Admin Financial CRUD** | KPI editing, read-only cap table | Full CRUD on cap table, waterfall, distributions | **Missing**: cap table CRUD, bulk distributions, capital calls |
| **Demo Mode** | 83% API coverage | N/A | 22 admin write functions crash with no fallback |

---

## Updated MVP Definition of Done

- [x] Investor can log in with real credentials (JWT + bcrypt)
- [x] Investor sees only their projects with real data from database
- [x] Investor can download real documents (local storage + S3-ready)
- [x] Investor can send/receive threaded messages with Northstar staff
- [x] Investor can view capital account statement per project
- [x] Investor can update own profile/contact info
- [x] Admin can log in and see admin dashboard
- [x] Admin has full investor CRM (profile pages, search, filter, segments)
- [x] Admin can upload documents and assign to projects/investors
- [x] Admin has inbox to receive and reply to investor messages
- [x] Admin can edit project KPIs from project detail view
- [x] Admin can update project status and construction progress
- [x] IDOR protection on all investor-scoped endpoints
- [x] Automated security test suite (57 tests covering auth, IDOR, RBAC)
- [x] Prisma migrations set up (no more db push in production)

---

## MVP Sprint 7 — Threaded Messaging (Both Sides)

**Goal**: Real bidirectional messaging. Investors message staff. Staff replies. Proper UI.

| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| M7.1 | Mount thread routes in Express server (`/api/v1/threads`) | P0 | ● |
| M7.2 | Migrate seed data: convert 5 existing messages into threads | P0 | ● |
| M7.3 | Add thread API functions to frontend `api.js` | P0 | ● |
| M7.4 | **Investor MessagesPage**: thread list → thread detail → reply | P0 | ● |
| M7.5 | **Investor compose**: "New Message" → subject + body (auto-targets staff) | P0 | ● |
| M7.6 | **Admin Inbox page**: thread list with unread badges, filter by status | P0 | ● |
| M7.7 | **Admin compose**: searchable recipient picker (search bar + investor table modal) | P0 | ● |
| M7.8 | **Admin thread detail**: view conversation, reply inline | P0 | ● |
| M7.9 | Investor constraint: can only message STAFF, not other investors | P0 | ● |

---

## MVP Sprint 8 — Admin Investor CRM

**Goal**: Full investor profile pages with CRM-quality management. Not a flat list.

| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| M8.1 | **Investor profile page**: click investor name → full detail view | P0 | ● |
| M8.2 | Profile sections: contact info, project assignments with KPIs, documents they access, message history | P0 | ● |
| M8.3 | **Edit KPIs inline**: from profile page, edit committed/called/value/IRR/MOIC per project | P0 | ● |
| M8.4 | **Document access matrix**: per investor, show all docs they can see + view/download status | P0 | ● |
| M8.5 | **Message history**: show all threads with this investor on their profile page | P1 | ● |
| M8.6 | **User management**: invite, approve, deactivate, reset password, edit role (INVESTOR/ADMIN/GP) | P0 | ● |
| M8.7 | **Company staff management**: add/edit ADMIN and GP users, not just investors | P0 | ● |
| M8.8 | **Investor segments/groups**: create custom groups ("Class A LPs", "Porthaven Investors", "2024 Cohort"), assign investors to groups | P0 | ● |
| M8.9 | **Group CRUD API**: create/edit/delete groups, add/remove members, list groups with member counts | P0 | ● |
| M8.10 | **Use groups everywhere**: messaging targets groups, doc distribution targets groups, filter investor list by group | P0 | ● |

---

## MVP Sprint 9 — Document Management (Admin + Investor)

**Goal**: Full document lifecycle — admin uploads, targets, tracks access. Investor downloads with audit trail. Based on DOCUMENT-FLOW.md.

| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| M9.1 | **Admin document dashboard**: table with name, project, category, investor count, view/download stats | P0 | ● |
| M9.2 | **Document detail view (admin)**: metadata, file preview thumbnail, access list with view/download timestamps | P0 | ● |
| M9.3 | **Upload with targeting**: upload → assign to project, investor group, specific investors, or general (all) | P0 | ● |
| M9.4 | **Enhance DocumentAssignment**: add viewedAt, downloadedAt, acknowledgedAt columns | P0 | ● |
| M9.5 | **Track downloads**: when investor clicks download, record timestamp in DocumentAssignment | P0 | ● |
| M9.6 | **Investor document center**: two tabs (General / Signature docs), filter by project + category | P1 | ● |
| M9.7 | **Documents within investment detail page**: project-specific docs appear inline on project detail | P1 | ● |
| M9.8 | **Action required workflow**: investor acknowledges "Action Required" docs, admin sees who acknowledged | P1 | ● |
| M9.9 | **Bulk upload**: upload multiple files at once with batch assignment | P2 | ● |

---

## MVP Sprint 10 — Project KPI Dashboard (Admin)

**Goal**: Admin can manage project financials and investor returns from a proper project detail view.

| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| M10.1 | **Project detail page (admin)**: click project → full dashboard | P0 | ● |
| M10.2 | Project KPI section: edit totalRaise, status, completion%, description | P0 | ● |
| M10.3 | **Investor table within project**: all LPs in this project with their KPIs, editable inline | P0 | ● |
| M10.4 | **Waterfall config editor**: edit prefReturn, catchUp, carry; manage tiers | P1 | ● |
| M10.5 | **Documents tab within project**: all docs assigned to this project, upload new | P0 | ● |
| M10.6 | **Construction updates tab**: post updates, view history | P0 | ● |
| M10.7 | **Cap table view within project**: same as investor view but editable | P1 | ● |

---

## MVP Sprint 11 — Investor Portal Enhancements

**Goal**: Bring investor-side experience up to industry standard.

| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| M11.1 | **Portfolio summary dashboard**: total contributions, total distributions, total value chart | P0 | ● |
| M11.2 | **Capital account statement**: per project — contributions, distributions, ending balance | P0 | ● |
| M11.3 | **Investment detail page**: click project → full detail with photos, map placeholder, description, docs, updates, transaction history | P1 | ● |
| M11.4 | **Self-service profile**: investor can update name, email, phone, entity info | P1 | ● |
| M11.5 | **Notification center**: in-app notifications for new docs, messages, distributions | P1 | ● |
| M11.6 | **Recent activity feed** on dashboard: "New document uploaded", "Distribution received", "Message from GP" | P2 | ● |

---

## Post-MVP Backlog

### Phase A — Prospective Investor Portal

| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| A.1 | Company landing page: about, investment approach, leadership, track record | P1 | ● |
| A.2 | Active opportunities listing with project summary cards | P1 | ● |
| A.3 | Project detail / deal page with data room | P1 | ● |
| A.4 | Investor interest form + lead capture | P1 | ● |
| A.5 | Self-service subscription workflow (invest online) | P2 | ○ |
| A.6 | Accreditation verification (Parallel Markets / Verify Investor) | P2 | ○ |
| A.7 | KYC/AML identity verification | P3 | ○ |

### Phase B — Documents & Signatures (Advanced)

| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| B.1 | E-signature integration (DocuSign / HelloSign) | P1 | ● |
| B.2 | K-1 mass upload with auto-matching to investors | P1 | ● |
| B.3 | Document view tracking (who opened, when, how long) | P1 | ● |
| B.4 | Watermarked document viewing | P2 | ○ |
| B.5 | Capital call notice PDF generation | P2 | ● |
| B.6 | Quarterly report PDF generation | P2 | ● |

### Phase C — Financial Engine

| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| C.1 | IRR calculation from actual cash flows | P1 | ● |
| C.2 | MOIC calculation | P1 | ● |
| C.3 | Waterfall distribution calculator | P2 | ● |
| C.4 | Capital account tracking (automated) | P2 | ● |
| C.5 | Distribution payment processing (ACH/wire) | P3 | ○ |

### Phase D — Notifications & Integrations

| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| D.1 | Email notifications (SendGrid/Resend): new docs, messages, distributions, capital calls | P1 | ● |
| D.2 | Read receipts and engagement tracking | P2 | ● |
| D.3 | Slack/Teams integration for admin alerts | P3 | ○ |
| D.4 | Accounting integration (QuickBooks/Xero) | P3 | ○ |

### Phase E — Polish & Production

| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| E.1 | Loading states and error handling for all API calls | P1 | ● |
| E.2 | Empty states ("No distributions yet", etc.) | P1 | ● |
| E.3 | Table sorting and search on all data tables | P1 | ● |
| E.4 | PDF/CSV export for distributions, cap table | P2 | ● |
| E.5 | Two-factor authentication | P2 | ● |
| E.6 | Audit logging for compliance | P2 | ● |
| E.7 | Multi-entity support (Individual, LLC, Trust, IRA) | P2 | ● |
| E.8 | White-label branding configuration | P3 | ○ |
| E.9 | Docker deployment + HTTPS | P0 | ● |

---

## Completed

| ID | Description | Date |
|----|-------------|------|
| — | Initial portal prototype (6 pages, dark theme) | 2026-03 |
| — | Light/dark theme toggle with persistence | 2026-03 |
| — | Login page with branded splash | 2026-03 |
| — | Data model restructure: fund → project-level investing | 2026-03-17 |
| — | Default to light theme | 2026-03-17 |
| — | Rebrand to match northstardevelopment.ca (logo, colors, layout) | 2026-03-17 |
| — | Responsive nav: two-row header + mobile scroll nav | 2026-03-17 |
| M1 | Sprint 1: Database & API (Prisma + Express + 7 endpoints + seed) | 2026-03-17 |
| M2 | Sprint 2: Auth & Security (JWT + bcrypt + role guards) | 2026-03-17 |
| M3 | Sprint 3: Frontend API Integration (all pages fetch from DB) | 2026-03-17 |
| M4 | Sprint 4: File Storage (local disk + S3 adapter, upload/download) | 2026-03-17 |
| M5 | Sprint 5: Admin Panel (dashboard, projects, investors, doc upload, messaging) | 2026-03-17 |
| — | Message targeting (ALL/PROJECT/INDIVIDUAL) | 2026-03-17 |
| — | Investor management (invite, approve, deactivate, KPI editing) | 2026-03-17 |
| M6 | Sprint 6: E-signature integration, notification system, prospect forms | 2026-03-17 |
| M7 | Sprint 7: Threaded Messaging (backend + frontend, bidirectional) | 2026-03-17 |
| M8 | Sprint 8: Admin Investor CRM (profile pages, groups, staff management) | 2026-03-17 |
| M9 | Sprint 9: Document Management (upload/download tracking, access audit) | 2026-03-17 |
| M10 | Sprint 10: Project KPI Dashboard (admin project detail, waterfall config) | 2026-03-17 |
| M11 | Sprint 11: Investor Portal Enhancements (capital accounts, self-service profile) | 2026-03-17 |
| — | Financial engine: XIRR, MOIC, waterfall calculator, scenario modeling | 2026-03-17 |
| — | IDOR protection on all investor-scoped routes | 2026-03-17 |
| — | Automated security test suite (57 tests: auth, IDOR, RBAC) | 2026-03-17 |
| — | Prisma migrations (proper migration history, no more db push) | 2026-03-17 |
| — | Docker deployment (Dockerfile + docker-compose) | 2026-03-17 |
| — | Audit logging for all sensitive operations | 2026-03-17 |
| — | Email notification templates (document, signature, message, capital call) | 2026-03-17 |
| — | MFA/TOTP with QR code setup, backup codes, login verification | 2026-03-17 |
| — | PostgreSQL migration support (prisma schema ready) | 2026-03-17 |
| — | CI/CD pipeline (GitHub Actions) | 2026-03-17 |
| — | Account lockout after 5 failed login attempts | 2026-03-17 |
| — | Zod input validation on critical API routes | 2026-03-17 |
| — | Sentry error tracking integration (adapter) | 2026-03-17 |
| — | Caddy reverse proxy SSL config | 2026-03-17 |
| — | Inbound email reply-to-thread system | 2026-03-17 |
| — | Workflow integration tests (136 total across 11 suites) | 2026-03-17 |
| — | Bundle splitting: lazy load Admin + ProspectPortal, vendor chunks | 2026-03-17 |
| — | Elevated Minimal design system applied across portal | 2026-03-17 |
| — | Vercel deployment config (SPA rewrites, cache headers, demo mode 405 fix) | 2026-03-18 |
| — | SKILLS.md comprehensive agent working guide | 2026-03-18 |
| — | Feature flags system | 2026-03-18 |
| — | Statement generation system with approval workflow | 2026-03-18 |
| — | Staff permission groups UI | 2026-03-18 |
| — | Comprehensive mobile/responsive fixes (investor + admin) | 2026-03-18 |
| — | Dashboard cards clickable, unread highlights, table sorting + search | 2026-03-18 |
| — | Read receipts (readAt timestamp on ThreadRecipient) | 2026-03-18 |
| — | Activity timeline on investor profiles + userId filter on audit log | 2026-03-18 |
| — | Bulk K-1 upload with auto-matching to investors by filename | 2026-03-18 |
| — | Capital call + quarterly report PDF generation with Northstar letterhead | 2026-03-18 |
| — | PostgreSQL production (Supabase) + Railway backend deployment | 2026-03-18 |
| — | Vercel → Railway API proxy | 2026-03-18 |
| — | DocuSign production fixes (graceful fallback, env var private key) | 2026-03-18 |
| — | Resend email adapter fix (graceful fallback if no API key) | 2026-03-18 |
| — | PostgreSQL sequence fixes for seeding | 2026-03-18 |
| — | Welcome/reset emails for new users + persistent credential dialog | 2026-03-18 |
| — | Admin nav consolidation: People tab + Documents tab | 2026-03-18 |
