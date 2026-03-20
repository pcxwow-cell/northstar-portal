# Northstar Investor Portal — Roadmap

> Last updated: 2026-03-19
> Honest assessment after production fixes + database reseed

## Current State

**Architecture**: React 18 + Vite 5 (Vercel) → Express 4 + Prisma ORM (Railway) → PostgreSQL (Supabase)
**Backend quality**: 8/10 — proper auth, service layer, 136 tests, adapter patterns, e-sign/email/storage adapters
**Frontend quality**: 6/10 — extracted to 12 pages + 14 admin managers + 15 shared components, no tests yet
**Overall**: 7.5/10 — 11 of 18 production issues fixed, production seed with real branded PDFs, 4 investors active
**Production seed**: 5 users (1 admin + 4 investors, password: northstar2025), 8 documents with real branded PDFs (pdfkit), 28 assignments, 23 cash flows, 8 waterfall tiers, 3 investor groups, 5 entities

### What Actually Works
- JWT auth with bcrypt, MFA/TOTP, account lockout, role-based access
- Express API with 40+ endpoints, Prisma ORM with 22 models
- Document upload/download with access control + PDF preview
- Document assignment to individual investors AND investor groups
- Document acknowledge workflow (investor marks as acknowledged)
- E-signature: DocuSign embedded signing, signed doc download, demo fallback
- Threaded bidirectional messaging
- Capital account calculations (XIRR/MOIC) from real cash flows
- Financial modeler with scenario analysis
- Entity management (LLC, Trust, IRA, Individual)
- Investor segments/groups with member management
- Statement generation with approval workflow
- Email adapters (Resend/SendGrid) with demo fallback
- 136 backend tests across 11 suites
- Demo mode with static data fallback (82% coverage)
- Vercel → Railway deployment pipeline
- Frontend fully extracted: 12 investor pages, 14 admin managers, 15 shared components

### What's Broken or Missing (~100 issues)

**Remaining (7 issues):**
- P3: Resend API key not configured (emails not sending)
- P6: Email from address needs updating
- P7: Portal branding polish needed
- P11: Distribution id field missing
- P14-P16: Low priority polish items

**Fixed (11 of 18 production issues — P1, P2, P4, P5, P8, P9, P10, P12, P13, P17, P18):**
- ~~Document downloads bypass tracking~~ → Fixed: uses secure endpoint with tracking
- ~~Document assignment destroys tracking history~~ → Fixed: upsert preserves timestamps
- ~~No PDF preview~~ → Fixed: inline preview modal for investors + admin
- ~~No group document assignment~~ → Fixed: assign to investor groups
- ~~Acknowledged field not wired~~ → Fixed: POST endpoint + investor UI
- ~~E-sign incomplete~~ → Fixed: embedded signing + signed doc download
- Production database reseeded with real branded PDFs generated via pdfkit

**Blocker (4):**
- No empty states — new investors see all zeros
- Cap table and waterfall tiers are read-only (no CRUD)
- Bulk distribution/capital call recording doesn't update investor records

**Broken (11 remaining):**
- Read receipts visible to investors (privacy violation)
- Password validation doesn't match strength bar
- 20+ admin actions have no audit trail

**Missing (~65) + UX (18):**
- See `docs/WORKFLOW-AUDIT.md` (57 items) and `docs/DEEP-AUDIT.md` (57 items)

**Frontend architecture (COMPLETE):**
- Admin.jsx: 226 lines (was 4,796) — fully extracted
- App.jsx: 724 lines (was 3,336) — fully extracted
- 12 investor pages in src/pages/, 14 admin managers in src/admin/
- 15 shared components in src/components/
- 3 context providers (Toast, AdminData, InvestorData)
- Zero frontend tests (Vitest setup pending)
- No router — navigation via useState

Full issue details: `docs/WORKFLOW-AUDIT.md`, `docs/DEEP-AUDIT.md`, `docs/UI-REVIEW.md`

---

## The Path Forward

### Step 1: Frontend Extraction (~35 commits) — COMPLETE
> Plan: `docs/FRONTEND-PLAN.md`

| Phase | Commits | Status |
|-------|---------|--------|
| 0: Wire components | 15 | ✅ All 14 components wired |
| 1: State & context | 2 | ✅ AdminDataContext + InvestorDataContext |
| 2: Extract App.jsx | 12 | ✅ 12 pages extracted to src/pages/ |
| 3: Extract Admin.jsx | 14 | ✅ 14 managers extracted to src/admin/ |
| 4: Demo mode fixes | — | ○ 22 missing fallbacks (Sprint I in fix plan) |
| 5: Smoke tests | — | ○ Vitest setup pending |
| 6: Update docs | — | ○ File path updates needed |

### Step 2: Functional Fixes (12 sprints, 67 tasks)
> Plan: `docs/FEATURE-FIX-PLAN.md`

| Sprint | Theme | Tasks |
|--------|-------|-------|
| A | Onboarding blockers | 7 |
| B | Document tracking & signing | 6 |
| C | Messaging fixes | 6 |
| D | Admin financial CRUD | 7 |
| E | Investor portal UX | 6 |
| F | Notifications & activity | 5 |
| G | Prospects & permissions | 4 |
| H | Security polish | 6 |
| I | Demo mode resilience | 3 |
| J | Data integrity & security | 6 |
| K | Audit logging | 5 |
| L | Admin lifecycle & reporting | 6 |

### Step 3: Accessibility & Responsive (2 sprints)
- Sprint M: ARIA attributes, focus management, semantic elements
- Sprint N: Mobile grids, stacking, breakpoints

### After all steps: estimated 8-8.5/10 overall

---

## Future (post-launch)

- TypeScript migration
- React Router
- KYC/AML integration (Parallel Markets)
- Payment processing (ACH/wire)
- Gated data rooms for prospective investors
- White-label branding
- CPA/advisor read-only access

---

## Technology Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Frontend | React 18 + Vite 5 | Deployed on Vercel |
| Backend | Express 4 | Deployed on Railway |
| Database | PostgreSQL (Supabase) | Prisma ORM, 22 models |
| Auth | JWT + bcrypt + TOTP | Role-based: INVESTOR/ADMIN/GP |
| Email | Resend / SendGrid | Adapter pattern with demo fallback |
| E-Sign | DocuSign / HelloSign | Adapter pattern with demo fallback |
| Storage | Local disk / S3 | Adapter pattern |
| Tests | Jest + Supertest | 136 backend tests, 0 frontend tests |

---

## Competitive Position

Custom portal vs. SaaS (Juniper Square, InvestNext, Carta):
- Direct brand control and custom design
- No per-investor SaaS fees ($15-50/investor/month saved)
- Full data ownership
- Custom waterfall and reporting logic
- Integrated prospective investor pipeline
- Tradeoff: development cost vs. subscription cost
