# Northstar Investor Portal — Tech Stack & Services

> Last updated: 2026-03-18

## Current Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React 18 + Vite 5 | Single-page app, inline styles |
| Charts | Recharts | AreaChart, BarChart |
| Styling | Inline styles, CSS-in-JS objects | Dark/light theme via React Context |
| Backend | Express 4 (REST API) | 40+ endpoints, port 3003 |
| Database | PostgreSQL (prod) + SQLite (dev) + Prisma ORM | 22 models, proper migration history |
| Auth | JWT + bcrypt | Role-based (INVESTOR/ADMIN/GP), password validation, login history |
| MFA | TOTP (speakeasy) | QR code setup, backup codes, login verification |
| File Storage | Local disk + S3 adapter | Abstraction layer, signed URL ready |
| Email | Resend (primary) / SendGrid | Adapter pattern with demo fallback. Resend free tier (3K/mo) |
| E-Signature | DocuSign / HelloSign | Adapter pattern with demo fallback, graceful error handling |
| PDF Generation | Custom service (pdfGenerator.js) | Capital call notices, quarterly reports with Northstar letterhead |
| Testing | Jest + Supertest | 136 automated tests (auth, IDOR, RBAC, workflow e2e) |
| Frontend Deploy | Vercel (Hobby plan) | Auto-deploys from GitHub master, SPA rewrites |
| Backend Deploy | Railway | Express API, bound to 0.0.0.0 on $PORT |
| Database Host | Supabase | PostgreSQL, connected via DATABASE_URL |
| Reverse Proxy | Caddy (self-hosted) / Vercel rewrites | SSL termination, API proxying |
| Error Tracking | Sentry (adapter) | Middleware wired, needs DSN in production |
| CI/CD | GitHub Actions | Automated test runs on push |
| Financial Engine | Custom JS (XIRR, MOIC, waterfall) | Newton-Raphson IRR, scenario modeling |
| Feature Flags | Custom service (featureFlags.js) | Gradual feature rollout |

---

## Production Infrastructure (Current)

| Layer | Service | Cost |
|-------|---------|------|
| **Database** | Supabase PostgreSQL (free tier) | $0 |
| **Backend API** | Railway | ~$5/mo |
| **Frontend** | Vercel (Hobby plan, free tier) | $0 |
| **Email** | Resend (free tier, 3K/mo) | $0 |
| **Domain + SSL** | Vercel-managed | $0 |
| **Total** | | **~$5/mo** |

---

## Authentication & Security (Built)

| Service | Status | Notes | Cost |
|---------|--------|-------|------|
| **Auth** | Built — Custom JWT + bcrypt | Password validation, login history, audit logging | Free |
| **RBAC** | Built — Custom middleware | INVESTOR/ADMIN/GP roles, IDOR protection on all routes | Free |
| **MFA/2FA** | Built — TOTP | QR code setup, backup codes, login verification | Free |
| **Account Lockout** | Built | Locks after 5 failed login attempts | Free |
| **Security Tests** | Built — 136 automated tests | Auth, IDOR, RBAC, workflow regression tests | Free |
| **Input Validation** | Built — Zod | Critical API routes validated | Free |
| **Audit Logging** | Built | All sensitive operations logged with before/after data | Free |
| **Staff Permissions** | Built | Permission groups for admin/GP users | Free |

---

## Document Storage & E-Signature

| Service | Status | Notes | Cost |
|---------|--------|-------|------|
| **File storage** | Built — Local disk + S3 adapter | Ready for S3/R2 swap | Free (local) |
| **Secure access** | Built — Per-investor access control | Download tracking, audit trail | Free |
| **E-signature** | Built — DocuSign adapter | Graceful fallback if no API key, env var private key support | $10-25/mo (production) |
| **Bulk K-1 upload** | Built | Auto-matching to investors by filename | Free |
| **PDF generation** | Built | Capital call notices, quarterly reports with letterhead | Free |
| **Document audit** | Built | View/download tracking per investor | Free |
| **Watermarking** | Not built | pdf-lib overlay (future) | Free |

---

## Email & Messaging

| Service | Status | Notes | Cost |
|---------|--------|-------|------|
| **Portal inbox** | Built | Threaded bidirectional messaging, read receipts | Free |
| **Email notifications** | Built — Resend/SendGrid adapters | Templates for all event types, demo fallback | Free (Resend free tier) |
| **Inbound email** | Built | Reply-to-thread via HMAC-verified webhooks | Free |
| **Welcome emails** | Built | Sent on user creation with credentials | Free |
| **Read receipts** | Built | readAt timestamp on ThreadRecipient | Free |
| **Real-time updates** | Not built | API polling for now; WebSocket/Pusher future | — |

---

## Financial Engine

| Service | Status | Notes | Cost |
|---------|--------|-------|------|
| **IRR (XIRR)** | Built | Newton-Raphson method from actual cash flows | Free |
| **MOIC** | Built | Current value / invested capital | Free |
| **Waterfall calculator** | Built | Pref return → catch-up → carry, configurable per project | Free |
| **Capital accounts** | Built | Per-investor, per-project tracking | Free |
| **Scenario modeling** | Built | Financial modeler with what-if analysis | Free |
| **Statement generation** | Built | Approval workflow for capital account statements | Free |
| **Distribution payments (ACH)** | Not built | Stripe ($0.80/ACH) or Dwolla future | Per-transaction |

---

## Prospective Investor Services

| Service | Status | Notes | Cost |
|---------|--------|-------|------|
| **Prospect portal** | Built | Landing page, opportunities, project detail, interest forms | Free |
| **Lead capture** | Built | Interest form with entity type, investment range, accreditation | Free |
| **Accreditation verification** | Not built | Parallel Markets / Verify Investor (future) | Per-verification |
| **KYC/AML** | Not built | Persona / Sumsub (future) | $1-5/verification |
| **Subscription workflow** | Not built | DocuSign pre-populated docs (future) | Included with e-sig |

---

## Scaling Cost Estimates

### Current (MVP Production)

| Item | Monthly Cost |
|------|-------------|
| PostgreSQL (Supabase free tier) | $0 |
| API hosting (Railway) | $5 |
| Frontend hosting (Vercel free tier) | $0 |
| Email (Resend free tier) | $0 |
| **Total** | **~$5/mo** |

### With E-Signature + Storage (Next Phase)

| Item | Monthly Cost |
|------|-------------|
| Everything above | $5 |
| S3/R2 storage | $5 |
| DocuSign e-signature | $10-25 |
| **Total** | **~$20-35/mo** |

### Full Platform (Scale)

| Item | Monthly Cost |
|------|-------------|
| Everything above | $20-35 |
| Upgraded hosting (more traffic) | $20 |
| Payment processing (per distribution) | Per-transaction |
| Email (higher volume) | $15 |
| KYC/AML (per deal) | Variable |
| **Total** | **~$60-80/mo + transaction fees** |

---

## Build vs. Buy Decisions

| Feature | Build Custom | Buy/Integrate | Decision |
|---------|-------------|---------------|----------|
| Auth & RBAC | Full control, no per-user fees | Clerk/Auth0: faster setup, managed | **Built** — investor count is low, save ongoing cost |
| Document storage | S3 + signed URLs + metadata DB | PandaDoc/Anvil: full doc platform | **Built** — simpler, cheaper, full control |
| E-signatures | Not practical to build | DocuSign/HelloSign: legally binding | **Buy** — legal compliance requires established provider |
| Portal messaging | Database + API CRUD | Intercom/Zendesk: full support suite | **Built** — internal LP messaging, not customer support |
| Email notifications | Templates + Resend/SendGrid API | — | **Built** with Resend as primary transport |
| Financial calcs (IRR, waterfall) | Custom JS engine | Covercy/InvestNext SaaS | **Built** — core differentiator, formulas are known |
| KYC/AML | Not practical to build | Persona/Sumsub: regulated process | **Buy** — regulatory requirement (future) |
| Payment processing | Not practical to build | Stripe/Dwolla: licensed money movement | **Buy** — requires money transmitter license (future) |

---

## Environment Variables (Production)

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/northstar_portal

# Auth
JWT_SECRET=<random-64-char-string>

# Server
API_PORT=3003
NODE_ENV=production
CORS_ORIGINS=https://northstar-portal-roan.vercel.app

# Email (choose one)
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxx
# or
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.xxx
EMAIL_FROM_ADDRESS=noreply@northstardevelopment.ca

# E-Signature
ESIGN_PROVIDER=docusign
DOCUSIGN_INTEGRATION_KEY=xxx
DOCUSIGN_USER_ID=xxx
DOCUSIGN_ACCOUNT_ID=xxx
DOCUSIGN_PRIVATE_KEY=<private-key-contents>

# Error Tracking
SENTRY_DSN=https://key@sentry.io/project

# Inbound Email
REPLY_DOMAIN=mail.northstardevelopment.ca
REPLY_SECRET=<random-string>

# Storage (when using S3)
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_S3_BUCKET=northstar-documents
AWS_REGION=us-west-2
```
