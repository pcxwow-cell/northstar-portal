# Northstar Investor Portal — Backlog

> Last updated: 2026-03-17
> Priority: P0 = must-have, P1 = should-have, P2 = nice-to-have, P3 = future
> Status: ○ not started, ◐ in progress, ● done
> Research baseline: Juniper Square, Agora, InvestNext, Covercy, CashFlow Portal

---

## Industry Gap Analysis

### What We Have vs. Industry Standard

| Feature | Northstar (Current) | Industry Standard (JS/Agora/IN) | Gap |
|---------|--------------------|---------------------------------|-----|
| **Investor Dashboard** | Project cards with basic metrics | Card-style portfolio overview with charts, total contributions/distributions, live offerings banner | Missing: portfolio summary charts, total contribution/distribution visuals |
| **Investment Detail** | Project page with cap table, waterfall, docs | Click-through to full investment detail: contributions, ownership %, outstanding capital, property photos, map, transaction history | Missing: transaction history, map, photo gallery |
| **Capital Account** | IRR/MOIC shown per project (manually entered) | Per-investor capital account statement: contributions, distributions, ending balance, gain/loss | Missing: capital account view entirely |
| **Documents** | Flat list with project/category filter | Two-tab layout (General / Signature docs), filter by investment/date/profile, docs appear within investment pages too | Missing: signature tab, docs within project detail, view tracking |
| **Messaging** | One-way broadcasts, fake replies | Threaded communication tied to investor profile, email notifications, engagement tracking | Missing: real threads (WIP), email notifications, read receipts |
| **Self-Service** | Login only | Update profile, banking details, contact info, entity management | Missing: profile editing, entity management |
| **Onboarding** | None (admin creates accounts) | Self-guided subscription: profile → investment amount → payment → doc signing → KYC | Missing: entire onboarding flow |
| **Live Offerings** | None | Data rooms with "Invest Now" button, offering cards on dashboard | Missing: prospective investor features |
| **Notifications** | None | Email alerts for new docs, distributions, capital calls, messages | Missing: email notification system |
| **Mobile** | Responsive CSS | Dedicated mobile app or fully responsive portal | Partial — basic responsive |
| **Admin CRM** | Flat investor list with search/filter | Full CRM: investor profile pages, activity timeline, segment/tags, pipeline management | Missing: profile pages, activity log, segments |
| **Admin Docs** | Upload with project assignment | Bulk upload, auto-match K-1s to investors, access audit trail, view tracking | Missing: bulk upload, view tracking, audit |
| **Admin Messaging** | Send-only composer | Inbox + sent, threaded replies, segment targeting, email integration, engagement metrics | Missing: admin inbox (WIP), engagement tracking |
| **Admin KPIs** | Edit via investor expand panel | Per-project dashboard with editable KPIs, waterfall config UI, capital account management | Missing: project KPI dashboard, waterfall editor |

---

## Updated MVP Definition of Done

- [x] Investor can log in with real credentials (JWT + bcrypt)
- [x] Investor sees only their projects with real data from database
- [x] Investor can download real documents (local storage + S3-ready)
- [ ] Investor can send/receive threaded messages with Northstar staff
- [ ] Investor can view capital account statement per project
- [ ] Investor can update own profile/contact info
- [x] Admin can log in and see admin dashboard
- [ ] Admin has full investor CRM (profile pages, search, filter, segments)
- [x] Admin can upload documents and assign to projects/investors
- [ ] Admin has inbox to receive and reply to investor messages
- [ ] Admin can edit project KPIs from project detail view
- [x] Admin can update project status and construction progress

---

## MVP Sprint 7 — Threaded Messaging (Both Sides)

**Goal**: Real bidirectional messaging. Investors message staff. Staff replies. Proper UI.

| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| M7.1 | Mount thread routes in Express server (`/api/v1/threads`) | P0 | ○ |
| M7.2 | Migrate seed data: convert 5 existing messages into threads | P0 | ○ |
| M7.3 | Add thread API functions to frontend `api.js` | P0 | ○ |
| M7.4 | **Investor MessagesPage**: thread list → thread detail → reply | P0 | ○ |
| M7.5 | **Investor compose**: "New Message" → subject + body (auto-targets staff) | P0 | ○ |
| M7.6 | **Admin Inbox page**: thread list with unread badges, filter by status | P0 | ○ |
| M7.7 | **Admin compose**: searchable recipient picker (search bar + investor table modal) | P0 | ○ |
| M7.8 | **Admin thread detail**: view conversation, reply inline | P0 | ○ |
| M7.9 | Investor constraint: can only message STAFF, not other investors | P0 | ○ |

---

## MVP Sprint 8 — Admin Investor CRM

**Goal**: Full investor profile pages with CRM-quality management. Not a flat list.

| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| M8.1 | **Investor profile page**: click investor name → full detail view | P0 | ○ |
| M8.2 | Profile sections: contact info, project assignments with KPIs, documents they access, message history | P0 | ○ |
| M8.3 | **Edit KPIs inline**: from profile page, edit committed/called/value/IRR/MOIC per project | P0 | ○ |
| M8.4 | **Document access matrix**: per investor, show all docs they can see + view/download status | P0 | ○ |
| M8.5 | **Message history**: show all threads with this investor on their profile page | P1 | ○ |
| M8.6 | **User management**: invite, approve, deactivate, reset password, edit role (INVESTOR/ADMIN/GP) | P0 | ○ |
| M8.7 | **Company staff management**: add/edit ADMIN and GP users, not just investors | P0 | ○ |
| M8.8 | **Investor segments/groups**: create custom groups ("Class A LPs", "Porthaven Investors", "2024 Cohort"), assign investors to groups | P0 | ○ |
| M8.9 | **Group CRUD API**: create/edit/delete groups, add/remove members, list groups with member counts | P0 | ○ |
| M8.10 | **Use groups everywhere**: messaging targets groups, doc distribution targets groups, filter investor list by group | P0 | ○ |

---

## MVP Sprint 9 — Document Management (Admin + Investor)

**Goal**: Full document lifecycle — admin uploads, targets, tracks access. Investor downloads with audit trail. Based on DOCUMENT-FLOW.md.

| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| M9.1 | **Admin document dashboard**: table with name, project, category, investor count, view/download stats | P0 | ○ |
| M9.2 | **Document detail view (admin)**: metadata, file preview thumbnail, access list with view/download timestamps | P0 | ○ |
| M9.3 | **Upload with targeting**: upload → assign to project, investor group, specific investors, or general (all) | P0 | ○ |
| M9.4 | **Enhance DocumentAssignment**: add viewedAt, downloadedAt, acknowledgedAt columns | P0 | ○ |
| M9.5 | **Track downloads**: when investor clicks download, record timestamp in DocumentAssignment | P0 | ○ |
| M9.6 | **Investor document center**: two tabs (General / Signature docs), filter by project + category | P1 | ○ |
| M9.7 | **Documents within investment detail page**: project-specific docs appear inline on project detail | P1 | ○ |
| M9.8 | **Action required workflow**: investor acknowledges "Action Required" docs, admin sees who acknowledged | P1 | ○ |
| M9.9 | **Bulk upload**: upload multiple files at once with batch assignment | P2 | ○ |

---

## MVP Sprint 10 — Project KPI Dashboard (Admin)

**Goal**: Admin can manage project financials and investor returns from a proper project detail view.

| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| M10.1 | **Project detail page (admin)**: click project → full dashboard | P0 | ○ |
| M10.2 | Project KPI section: edit totalRaise, status, completion%, description | P0 | ○ |
| M10.3 | **Investor table within project**: all LPs in this project with their KPIs, editable inline | P0 | ○ |
| M10.4 | **Waterfall config editor**: edit prefReturn, catchUp, carry; manage tiers | P1 | ○ |
| M10.5 | **Documents tab within project**: all docs assigned to this project, upload new | P0 | ○ |
| M10.6 | **Construction updates tab**: post updates, view history | P0 | ○ |
| M10.7 | **Cap table view within project**: same as investor view but editable | P1 | ○ |

---

## MVP Sprint 11 — Investor Portal Enhancements

**Goal**: Bring investor-side experience up to industry standard.

| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| M11.1 | **Portfolio summary dashboard**: total contributions, total distributions, total value chart | P0 | ○ |
| M11.2 | **Capital account statement**: per project — contributions, distributions, ending balance | P0 | ○ |
| M11.3 | **Investment detail page**: click project → full detail with photos, map placeholder, description, docs, updates, transaction history | P1 | ○ |
| M11.4 | **Self-service profile**: investor can update name, email, phone, entity info | P1 | ○ |
| M11.5 | **Notification center**: in-app notifications for new docs, messages, distributions | P1 | ○ |
| M11.6 | **Recent activity feed** on dashboard: "New document uploaded", "Distribution received", "Message from GP" | P2 | ○ |

---

## Post-MVP Backlog

### Phase A — Prospective Investor Portal

| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| A.1 | Company landing page: about, investment approach, leadership, track record | P1 | ○ |
| A.2 | Active opportunities listing with project summary cards | P1 | ○ |
| A.3 | Project detail / deal page with data room | P1 | ○ |
| A.4 | Investor interest form + lead capture | P1 | ○ |
| A.5 | Self-service subscription workflow (invest online) | P2 | ○ |
| A.6 | Accreditation verification (Parallel Markets / Verify Investor) | P2 | ○ |
| A.7 | KYC/AML identity verification | P3 | ○ |

### Phase B — Documents & Signatures (Advanced)

| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| B.1 | E-signature integration (DocuSign / HelloSign) | P1 | ○ |
| B.2 | K-1 mass upload with auto-matching to investors | P1 | ○ |
| B.3 | Document view tracking (who opened, when, how long) | P1 | ○ |
| B.4 | Watermarked document viewing | P2 | ○ |
| B.5 | Capital call notice PDF generation | P2 | ○ |
| B.6 | Quarterly report PDF generation | P2 | ○ |

### Phase C — Financial Engine

| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| C.1 | IRR calculation from actual cash flows | P1 | ○ |
| C.2 | MOIC calculation | P1 | ○ |
| C.3 | Waterfall distribution calculator | P2 | ○ |
| C.4 | Capital account tracking (automated) | P2 | ○ |
| C.5 | Distribution payment processing (ACH/wire) | P3 | ○ |

### Phase D — Notifications & Integrations

| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| D.1 | Email notifications (SendGrid/Resend): new docs, messages, distributions, capital calls | P1 | ○ |
| D.2 | Read receipts and engagement tracking | P2 | ○ |
| D.3 | Slack/Teams integration for admin alerts | P3 | ○ |
| D.4 | Accounting integration (QuickBooks/Xero) | P3 | ○ |

### Phase E — Polish & Production

| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| E.1 | Loading states and error handling for all API calls | P1 | ○ |
| E.2 | Empty states ("No distributions yet", etc.) | P1 | ○ |
| E.3 | Table sorting and search on all data tables | P1 | ○ |
| E.4 | PDF/CSV export for distributions, cap table | P2 | ○ |
| E.5 | Two-factor authentication | P2 | ○ |
| E.6 | Audit logging for compliance | P2 | ○ |
| E.7 | Multi-entity support (Individual, LLC, Trust, IRA) | P2 | ○ |
| E.8 | White-label branding configuration | P3 | ○ |
| E.9 | Docker deployment + HTTPS | P0 | ○ |

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
| — | Thread models + routes (WIP — backend only) | 2026-03-17 |
