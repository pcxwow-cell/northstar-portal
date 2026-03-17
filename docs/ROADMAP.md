# Northstar Investor Portal — Roadmap

> Last updated: 2026-03-17

## Current State

The portal is a **frontend prototype** built with React 18 + Vite 5. It demonstrates 6 investor-facing pages (Overview, Portfolio, Cap Table, Documents, Distributions, Messages) with dark/light theme support, Recharts visualizations, and a branded login page. All data is static mock data — no backend, no database, no APIs.

### What Works Today
- Login with hardcoded demo credentials (sessionStorage)
- Project-level data model: each project has its own cap table, waterfall, distributions, docs
- Investor scoped to their projects only (Porthaven + Livy)
- Document signing (client-side state only)
- Message inbox with reply (client-side state only)
- Dark/light theme toggle (localStorage)
- Per-project value tracking charts and distribution bar charts

### What's Missing
- Real authentication & authorization
- Backend API / database
- Admin panel for GP/staff
- Prospective investor portal
- Real document storage & e-signature
- Real messaging system
- Responsive / mobile layout
- Accessibility

---

## Phase 1 — Foundation (Backend + Auth)

**Goal**: Replace mock data with a real backend. Secure the portal.

| # | Item | Priority |
|---|------|----------|
| 1.1 | Database schema: investors, projects, cap_tables, distributions, documents, messages | P0 |
| 1.2 | API layer (REST or tRPC) with CRUD for all entities | P0 |
| 1.3 | Authentication: JWT or session-based, bcrypt passwords, login/logout endpoints | P0 |
| 1.4 | Role-based access: Investor, Admin, GP roles with permission guards | P0 |
| 1.5 | Seed database from current mock data (data.js → SQL/Prisma seed) | P0 |
| 1.6 | Connect React frontend to API (replace static imports with fetch/hooks) | P0 |
| 1.7 | Password reset flow (email link) | P1 |
| 1.8 | Session management (token refresh, idle timeout) | P1 |
| 1.9 | Environment variables for API URL, secrets | P1 |

---

## Phase 2 — Admin Panel (GP/Staff Tools)

**Goal**: Give Northstar staff the ability to manage data without touching code.

| # | Item | Priority |
|---|------|----------|
| 2.1 | Admin dashboard: summary of all projects, investors, pending actions | P0 |
| 2.2 | Project management: create/edit projects, update status, completion %, descriptions | P0 |
| 2.3 | Investor management: add/edit/deactivate investors, assign to projects | P0 |
| 2.4 | Cap table editor: add/remove holders, adjust commitments & ownership per project | P0 |
| 2.5 | Document upload & distribution: upload PDFs, assign to projects/investors, set status | P0 |
| 2.6 | Distribution management: create distributions, calculate amounts, mark as paid | P1 |
| 2.7 | Capital call workflow: create capital call, generate notices, track funding status | P1 |
| 2.8 | Message composer: send messages to individual investors or broadcast to project LPs | P1 |
| 2.9 | Construction update posting: add updates with photos per project | P1 |
| 2.10 | Waterfall configuration: set pref return, carry, catch-up per project | P2 |
| 2.11 | Investor activity log: track portal logins, document views, message reads | P2 |

---

## Phase 3 — Prospective Investor Portal

**Goal**: A public-facing or gated section for potential investors to learn about Northstar and express interest.

### Industry Standard Features (RE Developer Portals)
Real estate developers typically provide prospective investors with:
- Company overview, investment thesis, and team bios
- Track record / case studies with realized returns
- Active investment opportunities with gated data rooms
- Interest/reservation forms before deals formally open
- Accreditation verification (required for 506(c) offerings)
- KYC/AML identity verification
- Entity/profile creation (Individual, LLC, Trust, IRA)
- Subscription document workflow with e-signature

### Implementation Plan

| # | Item | Priority |
|---|------|----------|
| 3.1 | **Company landing page**: About Northstar, investment approach, leadership team, track record | P0 |
| 3.2 | **Active opportunities page**: List projects accepting investment with summary cards (target returns, hold period, location, asset type, minimum investment) | P0 |
| 3.3 | **Project detail / deal page**: Photos, maps, financial projections, project timeline, total raise vs. funded progress bar | P0 |
| 3.4 | **Investor interest form**: Name, email, entity type, accredited status, investment range, preferred asset classes | P0 |
| 3.5 | **Gated data room**: PPM, operating agreement, proformas behind registration wall. Watermarked PDFs. | P1 |
| 3.6 | **Accreditation verification**: Integration with Parallel Markets or Verify Investor | P1 |
| 3.7 | **Subscription workflow**: Pre-populated subscription docs with embedded e-signature | P1 |
| 3.8 | **KYC/AML verification**: Identity verification integration | P2 |
| 3.9 | **W-9 / W-8BEN collection**: Tax form capture during onboarding | P2 |
| 3.10 | **ACH/wire funding instructions**: Displayed after subscription execution | P2 |

### Content Needed from Northstar
- Leadership team bios + headshots
- Investment thesis / strategy copy
- Completed project case studies with realized returns
- High-quality project photos and renderings
- Proforma / financial projection templates
- Legal review of online subscription workflow

---

## Phase 4 — Document & Signature Infrastructure

**Goal**: Real document storage, delivery, and legally binding e-signatures.

| # | Item | Priority |
|---|------|----------|
| 4.1 | File storage (S3 or equivalent) for document uploads | P0 |
| 4.2 | Secure document download with access control (investor can only see their docs) | P0 |
| 4.3 | E-signature integration (DocuSign, HelloSign, or similar) | P1 |
| 4.4 | K-1 tax document delivery center with electronic consent | P1 |
| 4.5 | Capital call notice generation (PDF templating per investor) | P1 |
| 4.6 | Quarterly report generation (narrative + financials PDF) | P2 |
| 4.7 | Document version control and audit trail | P2 |
| 4.8 | Watermarked document viewing (prevent unauthorized distribution) | P2 |

---

## Phase 5 — Financial Engine

**Goal**: Automate calculations that are currently hardcoded.

| # | Item | Priority |
|---|------|----------|
| 5.1 | IRR calculation engine (from cash flows: calls + distributions) | P1 |
| 5.2 | MOIC calculation (current value / invested capital) | P1 |
| 5.3 | Waterfall distribution calculator (pref return → catch-up → carry) | P1 |
| 5.4 | Capital account tracking (contributions, distributions, ending balance) | P1 |
| 5.5 | Distribution payment processing (ACH/wire integration via Stripe or banking API) | P2 |
| 5.6 | Tax withholding calculations | P2 |

---

## Phase 6 — Polish & Production

**Goal**: Make the portal production-ready.

| # | Item | Priority |
|---|------|----------|
| 6.1 | Responsive design: mobile + tablet layouts for all pages | P1 |
| 6.2 | Accessibility: ARIA labels, keyboard navigation, focus management, contrast | P1 |
| 6.3 | Loading states and error handling for all API calls | P1 |
| 6.4 | Empty states ("No distributions yet", "No documents") | P1 |
| 6.5 | Table sorting and search | P2 |
| 6.6 | PDF/CSV export for distributions, cap table, reports | P2 |
| 6.7 | Email notifications (new documents, distributions, messages) | P2 |
| 6.8 | Multi-entity support (investor views holdings across Individual, LLC, Trust) | P2 |
| 6.9 | CPA/advisor access (investor grants read-only access to their accountant) | P3 |
| 6.10 | Two-factor authentication | P2 |
| 6.11 | Audit logging for compliance | P2 |
| 6.12 | White-label branding (custom domain, colors, logo configuration) | P3 |

---

## Known Bugs (Current Prototype)

| # | Bug | Severity |
|---|-----|----------|
| B1 | Document iframe preview 404s (mock file paths don't exist) | Medium |
| B2 | Signed documents not persisted (lost on page refresh) | Medium |
| B3 | Message replies not persisted (lost on page refresh) | Medium |
| B4 | Cap table ownership bar assumes max 35% — overflows if higher | Low |
| B5 | "Next Estimated" distribution date is hardcoded "Oct 2025" | Low |
| B6 | Cap table page crashes if investor has zero projects | Low |
| B7 | Download button opens 404 page instead of downloading | Medium |

---

## Technology Decisions (TBD)

| Decision | Options | Notes |
|----------|---------|-------|
| Backend framework | Express, Fastify, Next.js API routes | Currently Vite SPA — could migrate to Next.js for SSR + API |
| Database | PostgreSQL + Prisma, Supabase | Prisma schema already exists in server/ directory |
| Auth provider | Custom JWT, Auth0, Clerk, Supabase Auth | Depends on complexity needs |
| File storage | AWS S3, Supabase Storage, Cloudflare R2 | Need signed URLs for secure doc access |
| E-signature | DocuSign, HelloSign, PandaDoc, built-in | Legal requirements drive this choice |
| Payments | Stripe, Dwolla, Covercy | For distribution ACH payments |
| Email | SendGrid, Postmark, SES | Transactional email for notifications |
| Hosting | Vercel, AWS, Railway, Fly.io | Depends on backend choice |

---

## Competitive Reference

Platforms like **Juniper Square**, **InvestNext**, **Covercy**, and **Agora** provide similar functionality as SaaS products for RE developers. Northstar's custom portal differentiates by:
- Direct brand control and custom design
- No per-investor SaaS fees
- Full data ownership
- Custom waterfall and reporting logic
- Integrated prospective investor pipeline

The tradeoff is development and maintenance cost vs. SaaS subscription.
