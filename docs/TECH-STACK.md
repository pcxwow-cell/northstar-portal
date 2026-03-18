# Northstar Investor Portal — Tech Stack & Services

> Last updated: 2026-03-17

## Current Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React 18 + Vite 5 | Single-page app, inline styles |
| Charts | Recharts | AreaChart, BarChart |
| Styling | Inline styles, CSS-in-JS objects | Dark/light theme via React Context |
| Backend | Express 4 (REST API) | 25+ endpoints, port 3003 |
| Database | SQLite + Prisma ORM | 22 models, proper migration history |
| Auth | JWT + bcrypt | Role-based (INVESTOR/ADMIN/GP), password validation, login history |
| File Storage | Local disk + S3 adapter | Abstraction layer, signed URL ready |
| Email | Demo logger (dev mode) | SendGrid-ready templates for all notification types |
| Testing | Jest + Supertest | 57 automated security tests (auth, IDOR, RBAC) |
| Deployment | Docker + docker-compose | Multi-stage build, production-ready |
| Financial Engine | Custom JS (XIRR, MOIC, waterfall) | Newton-Raphson IRR, scenario modeling |

---

## Production Scaling (Future)

### Core Infrastructure

| Layer | Current | Production Upgrade | Cost |
|-------|---------|-------------------|------|
| **Database** | SQLite + Prisma ORM | PostgreSQL (Railway/Supabase) | Free–$25/mo |
| **Backend API** | Express 4 (REST) | Same (already production-grade) | Free |
| **Hosting** | Docker (local/any host) | Railway, Fly.io, or AWS ECS | $5–20/mo |
| **Frontend** | Vite build → static | Vercel/Netlify or served from Express | Free–$20/mo |
| **Domain + SSL** | Local dev | Custom domain via registrar | ~$12/yr |

### Authentication & Security (Built)

| Service | Status | Notes | Cost |
|---------|--------|-------|------|
| **Auth** | Built — Custom JWT + bcrypt | Password validation, login history, audit logging | Free |
| **RBAC** | Built — Custom middleware | INVESTOR/ADMIN/GP roles, IDOR protection on all routes | Free |
| **Security Tests** | Built — 57 automated tests | Auth, IDOR, role-based access regression tests | Free |
| **2FA** | Planned | Twilio Verify or TOTP via `speakeasy` | $0.05/verification |

### Document Storage & E-Signature

| Service | Recommended | Alternatives | Cost |
|---------|------------|-------------|------|
| **File storage** | AWS S3 | Cloudflare R2 (free egress), Supabase Storage | $0–10/mo |
| **Secure access** | S3 signed URLs (time-limited) | Supabase Storage policies | Free (built into S3) |
| **E-signature** | DocuSign | HelloSign ($15/mo), PandaDoc ($19/mo) | $10–25/mo |
| **PDF generation** | Puppeteer or React-PDF | PDFKit, jsPDF | Free |
| **Watermarking** | Custom (pdf-lib overlay) | PandaDoc built-in | Free |

### Email & Messaging

| Service | Recommended | Alternatives | Cost |
|---------|------------|-------------|------|
| **Portal inbox** | Custom (database tables + API) | — | Free |
| **Transactional email** | SendGrid (100/day free) | Resend (3K/mo free), Postmark ($15/mo), AWS SES | Free–$15/mo |
| **Real-time updates** | API polling (30s interval) | Pusher (free tier 200K msg/day), WebSockets | Free |

### Prospective Investor Services

| Service | Recommended | Alternatives | Cost |
|---------|------------|-------------|------|
| **Accreditation verification** | Parallel Markets | Verify Investor | Per-verification pricing |
| **KYC/AML** | Persona | Jumio, Sumsub | $1–5/verification |
| **Tax form collection (W-9/W-8BEN)** | Docusign or custom PDF form | Tax1099.com | Included with e-sig provider |

### Financial & Payments

| Service | Recommended | Alternatives | Cost |
|---------|------------|-------------|------|
| **IRR / MOIC calculations** | Custom engine (JS/TS) | — | Free |
| **Waterfall calculator** | Custom engine | — | Free |
| **Distribution payments (ACH)** | Stripe ($0.80/ACH) | Dwolla (0.5%/transfer), Covercy (RE-specific) | Per-transaction |

---

## Cost Summary

### Phase 1–2 (Backend + Admin) — Minimum Viable

| Item | Monthly Cost |
|------|-------------|
| PostgreSQL hosting (Railway/Supabase free tier) | $0 |
| API hosting (Railway/Fly.io) | $5 |
| Frontend hosting (Vercel free tier) | $0 |
| Email (SendGrid free tier) | $0 |
| **Total** | **~$5/mo** |

### Phase 3–4 (Full Portal + Documents) — Production

| Item | Monthly Cost |
|------|-------------|
| Everything above | $5 |
| S3 storage | $5 |
| DocuSign e-signature | $10–25 |
| Accreditation/KYC (per deal) | Variable |
| **Total** | **~$25–40/mo + per-verification fees** |

### Phase 5–6 (Full Platform) — Scale

| Item | Monthly Cost |
|------|-------------|
| Everything above | $25–40 |
| Upgraded hosting (more traffic) | $20 |
| Payment processing (per distribution) | Per-transaction |
| Email (higher volume) | $15 |
| **Total** | **~$60–80/mo + transaction fees** |

---

## Build vs. Buy Decisions

| Feature | Build Custom | Buy/Integrate | Recommendation |
|---------|-------------|---------------|----------------|
| Auth & RBAC | Full control, no per-user fees | Clerk/Auth0: faster setup, managed | **Build** — investor count is low, save ongoing cost |
| Document storage | S3 + signed URLs + metadata DB | PandaDoc/Anvil: full doc platform | **Build** — simpler, cheaper, full control |
| E-signatures | Not practical to build | DocuSign/HelloSign: legally binding | **Buy** — legal compliance requires established provider |
| Portal messaging | Database + API CRUD | Intercom/Zendesk: full support suite | **Build** — this is internal LP messaging, not customer support |
| Email notifications | Templates + SendGrid API | — | **Build** with SendGrid/Resend as transport |
| Financial calcs (IRR, waterfall) | Custom JS engine | Covercy/InvestNext SaaS | **Build** — core differentiator, formulas are known |
| KYC/AML | Not practical to build | Persona/Sumsub: regulated process | **Buy** — regulatory requirement |
| Payment processing | Not practical to build | Stripe/Dwolla: licensed money movement | **Buy** — requires money transmitter license |

---

## Environment Variables Needed

```env
# Database
DATABASE_URL=postgresql://...

# Auth
JWT_SECRET=...
JWT_REFRESH_SECRET=...

# Storage
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=northstar-documents
AWS_REGION=us-west-2

# Email
SENDGRID_API_KEY=...
SENDGRID_FROM_EMAIL=portal@northstardevelopment.ca

# E-Signature
DOCUSIGN_INTEGRATION_KEY=...
DOCUSIGN_SECRET_KEY=...
DOCUSIGN_ACCOUNT_ID=...

# Payments (Phase 5)
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...

# App
FRONTEND_URL=https://portal.northstardevelopment.ca
API_URL=https://api.northstardevelopment.ca
NODE_ENV=production
```
