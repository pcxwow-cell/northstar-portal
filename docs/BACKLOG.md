# Northstar Investor Portal — Backlog

> Last updated: 2026-03-17
> Priority: P0 = must-have, P1 = should-have, P2 = nice-to-have, P3 = future
> Status: ○ not started, ◐ in progress, ● done

---

## MVP Scope

The MVP lets **real investors log in, view their projects, download documents, and receive messages** — and lets **Northstar staff upload documents and send updates** via an admin panel.

### MVP Definition of Done
- [ ] An investor can log in with real credentials
- [ ] Investor sees only their projects with real data from a database
- [ ] Investor can download real PDF documents (K-1s, reports, subscription docs)
- [ ] Investor can read messages from Northstar
- [ ] Northstar staff can log in as admin
- [ ] Admin can upload documents and assign to projects/investors
- [ ] Admin can send messages to investors
- [ ] Admin can update project status and construction progress

### What's Explicitly NOT in MVP
- Prospective investor portal / public deal pages
- E-signature integration
- Financial calculations (IRR, MOIC, waterfall — use manually entered values)
- Payment processing
- Email notifications
- Multi-entity support
- KYC/AML, accreditation verification
- PDF generation

---

## MVP Sprint 1 — Database & API Foundation

**Goal**: Get real data flowing. Replace mock data with a database.

| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| M1.1 | Finalize Prisma schema: users, investors, projects, investor_projects, cap_table_entries, distributions, documents, messages | P0 | ○ |
| M1.2 | Set up Express API server with Prisma client | P0 | ○ |
| M1.3 | Seed database from current data.js mock data | P0 | ○ |
| M1.4 | API routes: GET /projects, /projects/:id, /investors/:id, /investors/:id/projects | P0 | ○ |
| M1.5 | API routes: GET /documents, /distributions, /messages (filtered by investor) | P0 | ○ |
| M1.6 | Environment config: .env for DATABASE_URL, JWT_SECRET, API_PORT | P0 | ○ |

---

## MVP Sprint 2 — Auth & Security

**Goal**: Real login. Investors see only their data.

| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| M2.1 | JWT authentication: /auth/login, /auth/logout, /auth/me endpoints | P0 | ○ |
| M2.2 | Password hashing with bcrypt | P0 | ○ |
| M2.3 | Auth middleware: verify JWT on all protected routes | P0 | ○ |
| M2.4 | Role-based access: investor vs admin middleware guards | P0 | ○ |
| M2.5 | Connect React frontend to auth API (replace sessionStorage hack) | P0 | ○ |
| M2.6 | Session timeout / token refresh | P1 | ○ |

---

## MVP Sprint 3 — Frontend API Integration

**Goal**: Frontend fetches real data instead of importing static files.

| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| M3.1 | Create useApi hook (fetch with JWT header, error handling, loading states) | P0 | ○ |
| M3.2 | Overview page: fetch investor's projects, distributions, messages from API | P0 | ○ |
| M3.3 | Portfolio page: fetch from API | P0 | ○ |
| M3.4 | Cap Table page: fetch per-project cap table from API | P0 | ○ |
| M3.5 | Documents page: fetch documents list, download via signed URLs | P0 | ○ |
| M3.6 | Distributions page: fetch from API | P0 | ○ |
| M3.7 | Messages page: fetch + POST replies to API | P0 | ○ |
| M3.8 | Loading spinners and error states for all pages | P1 | ○ |

---

## MVP Sprint 4 — File Storage & Documents

**Goal**: Real document upload, storage, and secure download.

| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| M4.1 | Set up S3 or R2 bucket for document storage | P0 | ○ |
| M4.2 | API: POST /documents/upload (admin only, multipart file upload) | P0 | ○ |
| M4.3 | API: GET /documents/:id/download (signed URL, investor access check) | P0 | ○ |
| M4.4 | Frontend: real document download (replace 404 mock links) | P0 | ○ |
| M4.5 | Document metadata: project, category, investor assignment, upload date | P0 | ○ |

---

## MVP Sprint 5 — Admin Panel (Basic)

**Goal**: Northstar staff can manage data through a UI.

| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| M5.1 | Admin layout: separate admin route/view with admin nav | P0 | ○ |
| M5.2 | Admin dashboard: project summary, investor count, recent activity | P0 | ○ |
| M5.3 | Project management: edit project status, completion %, description | P0 | ○ |
| M5.4 | Investor management: view investor list, add/edit investor, assign to projects | P0 | ○ |
| M5.5 | Document upload UI: drag-and-drop upload, assign to project/investor, set category | P0 | ○ |
| M5.6 | Message composer: send message to investor or broadcast to project LPs | P0 | ○ |
| M5.7 | Construction update posting: text + status update per project | P1 | ○ |

---

## MVP Sprint 6 — Bug Fixes & Deploy

**Goal**: Fix prototype bugs, deploy to production.

| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| M6.1 | Fix: document download (was 404) — now uses signed S3 URLs | P0 | ○ |
| M6.2 | Fix: signed documents persist in database | P0 | ○ |
| M6.3 | Fix: message replies persist in database | P0 | ○ |
| M6.4 | Fix: cap table ownership bar overflow >35% | P1 | ○ |
| M6.5 | Fix: hardcoded "Oct 2025" distribution date — pull from data | P1 | ○ |
| M6.6 | Fix: CapTablePage crash on zero projects | P1 | ○ |
| M6.7 | Deploy: Docker Compose (frontend + API + Postgres) | P0 | ○ |
| M6.8 | Deploy: HTTPS / reverse proxy (Caddy or nginx) | P0 | ○ |
| M6.9 | Deploy: production environment variables and secrets | P0 | ○ |

---

## Post-MVP Backlog

### Phase A — Prospective Investor Portal

| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| A.1 | Company landing page: about, investment approach, leadership, track record | P1 | ○ |
| A.2 | Active opportunities listing with project summary cards | P1 | ○ |
| A.3 | Project detail / deal page: photos, projections, timeline, raise progress | P1 | ○ |
| A.4 | Investor interest form: name, email, entity type, accredited status | P1 | ○ |
| A.5 | Gated data room: PPM, operating agreement behind registration | P2 | ○ |
| A.6 | Accreditation verification (Parallel Markets / Verify Investor) | P2 | ○ |
| A.7 | Subscription workflow with embedded e-signature | P2 | ○ |
| A.8 | KYC/AML identity verification | P3 | ○ |
| A.9 | W-9 / W-8BEN tax form collection | P3 | ○ |
| A.10 | ACH/wire funding instructions post-subscription | P3 | ○ |

### Phase B — Documents & Signatures (Advanced)

| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| B.1 | E-signature integration (DocuSign / HelloSign) | P1 | ○ |
| B.2 | K-1 tax document delivery center | P1 | ○ |
| B.3 | Capital call notice PDF generation | P2 | ○ |
| B.4 | Quarterly report PDF generation | P2 | ○ |
| B.5 | Document version control and audit trail | P2 | ○ |
| B.6 | Watermarked document viewing | P3 | ○ |

### Phase C — Financial Engine

| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| C.1 | IRR calculation from actual cash flows | P1 | ○ |
| C.2 | MOIC calculation | P1 | ○ |
| C.3 | Waterfall distribution calculator | P2 | ○ |
| C.4 | Capital account tracking | P2 | ○ |
| C.5 | Distribution payment processing (ACH/wire) | P3 | ○ |
| C.6 | Tax withholding calculations | P3 | ○ |

### Phase D — Polish & Production

| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| D.1 | Loading states and error handling for all API calls | P1 | ○ |
| D.2 | Empty states ("No distributions yet", etc.) | P1 | ○ |
| D.3 | Table sorting and search | P2 | ○ |
| D.4 | PDF/CSV export for distributions, cap table | P2 | ○ |
| D.5 | Email notifications (SendGrid/Resend) | P2 | ○ |
| D.6 | Multi-entity support (Individual, LLC, Trust, IRA) | P2 | ○ |
| D.7 | Two-factor authentication | P2 | ○ |
| D.8 | Audit logging for compliance | P2 | ○ |
| D.9 | CPA/advisor read-only access | P3 | ○ |
| D.10 | White-label branding configuration | P3 | ○ |

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
