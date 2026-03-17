# Northstar Investor Portal — Backlog

> Last updated: 2026-03-17
> Priority: P0 = must-have, P1 = should-have, P2 = nice-to-have, P3 = future
> Status: ○ not started, ◐ in progress, ● done

---

## Bugs (Fix First)

| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| B1 | Document iframe preview 404s — mock file paths don't resolve | P1 | ○ |
| B2 | Signed documents lost on page refresh (no persistence) | P1 | ○ |
| B3 | Message replies lost on page refresh (no persistence) | P1 | ○ |
| B4 | Cap table ownership bar overflows if holder has >35% | P2 | ○ |
| B5 | "Next Estimated" distribution date hardcoded as "Oct 2025" | P2 | ○ |
| B6 | CapTablePage crashes if investor has zero projects | P2 | ○ |
| B7 | Download button opens 404 instead of actual file download | P1 | ○ |

---

## Phase 1 — Backend & Auth

| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| 1.1 | Design database schema (investors, projects, cap_tables, distributions, documents, messages, users) | P0 | ○ |
| 1.2 | Set up API layer (Express/Fastify or Next.js API routes) | P0 | ○ |
| 1.3 | Implement JWT or session-based authentication (login, logout, token refresh) | P0 | ○ |
| 1.4 | Role-based access control: Investor, Admin, GP | P0 | ○ |
| 1.5 | Seed database from current data.js mock data | P0 | ○ |
| 1.6 | Replace static imports in React with API fetch hooks | P0 | ○ |
| 1.7 | Password reset flow via email | P1 | ○ |
| 1.8 | Session timeout / idle logout | P1 | ○ |
| 1.9 | Environment variable configuration (.env for API URL, secrets) | P1 | ○ |

---

## Phase 2 — Admin Panel

| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| 2.1 | Admin dashboard: project count, investor count, pending actions summary | P0 | ○ |
| 2.2 | Project CRUD: create/edit projects, update status, completion %, construction updates | P0 | ○ |
| 2.3 | Investor CRUD: add/edit/deactivate investors, assign to projects | P0 | ○ |
| 2.4 | Cap table editor: add/remove holders, adjust commitments & ownership | P0 | ○ |
| 2.5 | Document upload: upload PDFs, assign to project or investor, set status | P0 | ○ |
| 2.6 | Distribution management: create distributions, calculate amounts, mark paid | P1 | ○ |
| 2.7 | Capital call workflow: create call, auto-generate notices, track funding | P1 | ○ |
| 2.8 | Message composer: send to individual investors or broadcast to project LPs | P1 | ○ |
| 2.9 | Construction update posting with photo upload | P1 | ○ |
| 2.10 | Waterfall configuration UI per project | P2 | ○ |
| 2.11 | Investor activity log (portal logins, doc views) | P2 | ○ |

---

## Phase 3 — Prospective Investor Portal

| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| 3.1 | Company landing page: about, investment approach, leadership team, track record | P0 | ○ |
| 3.2 | Active opportunities listing: project cards with target returns, hold period, min investment | P0 | ○ |
| 3.3 | Project detail / deal page: photos, maps, projections, timeline, raise progress | P0 | ○ |
| 3.4 | Investor interest form: name, email, entity type, accredited status, investment range | P0 | ○ |
| 3.5 | Gated data room: PPM, operating agreement behind registration (watermarked PDFs) | P1 | ○ |
| 3.6 | Accreditation verification (Parallel Markets / Verify Investor integration) | P1 | ○ |
| 3.7 | Subscription workflow: pre-populated docs with embedded e-signature | P1 | ○ |
| 3.8 | KYC/AML identity verification integration | P2 | ○ |
| 3.9 | W-9 / W-8BEN tax form collection | P2 | ○ |
| 3.10 | ACH/wire funding instructions after subscription | P2 | ○ |

---

## Phase 4 — Documents & Signatures

| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| 4.1 | File storage backend (S3 / Supabase Storage / R2) | P0 | ○ |
| 4.2 | Secure document download with per-investor access control | P0 | ○ |
| 4.3 | E-signature integration (DocuSign / HelloSign / PandaDoc) | P1 | ○ |
| 4.4 | K-1 tax document delivery center with electronic consent | P1 | ○ |
| 4.5 | Capital call notice PDF generation (per investor) | P1 | ○ |
| 4.6 | Quarterly report PDF generation (narrative + financials) | P2 | ○ |
| 4.7 | Document version control and audit trail | P2 | ○ |
| 4.8 | Watermarked document viewing | P2 | ○ |

---

## Phase 5 — Financial Engine

| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| 5.1 | IRR calculation engine (from actual cash flows) | P1 | ○ |
| 5.2 | MOIC calculation (current value / invested capital) | P1 | ○ |
| 5.3 | Waterfall distribution calculator (pref → catch-up → carry) | P1 | ○ |
| 5.4 | Capital account tracking (contributions, distributions, ending balance) | P1 | ○ |
| 5.5 | Distribution payment processing (ACH/wire via Stripe or banking API) | P2 | ○ |
| 5.6 | Tax withholding calculations | P2 | ○ |

---

## Phase 6 — Polish & Production

| ID | Description | Priority | Status |
|----|-------------|----------|--------|
| 6.1 | Responsive design: mobile + tablet layouts | P1 | ○ |
| 6.2 | Accessibility: ARIA labels, keyboard nav, focus management, contrast | P1 | ○ |
| 6.3 | Loading states and error handling for all API calls | P1 | ○ |
| 6.4 | Empty states ("No distributions yet", "No documents") | P1 | ○ |
| 6.5 | Table sorting, column headers, search | P2 | ○ |
| 6.6 | PDF/CSV export for distributions, cap table, reports | P2 | ○ |
| 6.7 | Email notifications (new docs, distributions, messages) | P2 | ○ |
| 6.8 | Multi-entity support (Individual, LLC, Trust, IRA views) | P2 | ○ |
| 6.9 | Two-factor authentication | P2 | ○ |
| 6.10 | Audit logging for compliance | P2 | ○ |
| 6.11 | CPA/advisor read-only access sharing | P3 | ○ |
| 6.12 | White-label branding configuration | P3 | ○ |

---

## Completed

| ID | Description | Date |
|----|-------------|------|
| — | Initial portal prototype (6 pages, dark theme) | 2026-03 |
| — | Light/dark theme toggle with persistence | 2026-03 |
| — | Login page with branded splash | 2026-03 |
| — | Data model restructure: fund → project-level investing | 2026-03-17 |
| — | Default to light theme | 2026-03-17 |
