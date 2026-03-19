# Northstar Investor Portal — Roadmap

> Last updated: 2026-03-18
> Honest assessment after comprehensive QA audit

## Current State

**Architecture**: React 18 + Vite 5 (Vercel) → Express 4 + Prisma ORM (Railway) → PostgreSQL (Supabase)
**Backend quality**: 7.5/10 — proper auth, service layer, 136 tests, adapter patterns
**Frontend quality**: 3/10 — two monolithic files (8,132 lines), no component reuse, no tests
**Overall**: 5/10 — strong foundation, poorly packaged frontend, 107 unfixed issues

### What Actually Works
- JWT auth with bcrypt, MFA/TOTP, account lockout, role-based access
- Express API with 40+ endpoints, Prisma ORM with 22 models
- Document upload/download with access control
- E-signature adapters (DocuSign/HelloSign) with demo fallback
- Threaded bidirectional messaging
- Capital account calculations (XIRR/MOIC) from real cash flows
- Financial modeler with scenario analysis
- Entity management (LLC, Trust, IRA, Individual)
- Investor segments/groups
- Statement generation with approval workflow
- Email adapters (Resend/SendGrid) with demo fallback
- 136 backend tests across 11 suites
- Demo mode with static data fallback (82% coverage)
- Vercel → Railway deployment pipeline

### What's Broken or Missing (107 issues)

**Critical (9):**
- Investor onboarding trap (PENDING users get "invalid credentials")
- 22 admin write functions crash in demo mode (no fallback)
- Document downloads bypass tracking
- No email notifications on new messages
- Tax IDs stored/displayed in plain text

**Blocker (4):**
- No empty states — new investors see all zeros
- Cap table and waterfall tiers are read-only (no CRUD)
- Bulk distribution/capital call recording doesn't update investor records

**Broken (14):**
- Document assignment destroys tracking history
- Read receipts visible to investors (privacy violation)
- Password validation doesn't match strength bar
- 20+ admin actions have no audit trail

**Missing (69) + UX (18):**
- See `docs/WORKFLOW-AUDIT.md` (57 items) and `docs/DEEP-AUDIT.md` (57 items)

**Frontend architecture:**
- Admin.jsx: 4,796 lines, ~160 useState, 15 managers in one file
- App.jsx: 3,336 lines, ~100 useState, 10 pages in one file
- 14 shared components exist in src/components/ but are NOT imported
- Zero frontend tests
- No router — navigation via useState

Full issue details: `docs/WORKFLOW-AUDIT.md`, `docs/DEEP-AUDIT.md`, `docs/UI-REVIEW.md`

---

## The Path Forward

### Step 1: Frontend Extraction (~35 commits)
> Plan: `docs/FRONTEND-PLAN.md`

| Phase | Commits | What happens |
|-------|---------|-------------|
| 0: Wire components | 2 | Import existing dead components, shrink monoliths ~35% |
| 1: State & context | 1 | AdminDataContext, InvestorDataContext, eliminate redundant fetches |
| 2: Extract App.jsx | 12 | One page per commit → 150-line shell |
| 3: Extract Admin.jsx | 17 | One manager per commit → 120-line shell |
| 4: Demo mode fixes | 1 | 22 missing fallbacks |
| 5: Smoke tests | 1 | Vitest render tests for every page |
| 6: Update docs | 1 | Fix stale file paths |

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

### After all steps: estimated 7.5-8/10 overall

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
