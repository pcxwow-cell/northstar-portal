# Northstar — Investor Portal

A full-stack investor portal for Northstar Pacific Development Group, built with React + Vite (frontend) and Express + Prisma (backend). Deployed on Vercel (frontend) + Railway (API + PostgreSQL).

## Live Demo

- **Portal**: https://northstar-portal-roan.vercel.app/
- Demo mode: when no backend is reachable, the frontend falls back to static data from `src/data.js`

## Quick Start (Local Development)

```bash
# 1. Install dependencies
npm install
cd server && npm install && cd ..

# 2. Generate Prisma client + push schema to SQLite
npx prisma generate
npx prisma db push

# 3. Seed demo data
cd server && node seed.js && cd ..

# 4. Start API server (Terminal 1)
cd server && npm run dev    # Port 3003

# 5. Start frontend (Terminal 2)
npm run dev                  # Port 3000, proxies /api to 3003
```

### Demo Credentials (after seeding)
| Role | Email | Password |
|------|-------|----------|
| Investor | james@chen.com | password123 |
| Admin | admin@northstar.com | admin123 |

## Architecture

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React 18 + Vite 5 | Single-file components, inline styles, Recharts |
| Backend | Express 4 (REST API) | 40+ endpoints, port 3003 |
| ORM | Prisma | 22 models, SQLite (dev) / PostgreSQL (prod) |
| Auth | JWT + bcrypt | Role-based: INVESTOR, ADMIN, GP |
| MFA | TOTP | QR code setup, backup codes |
| Email | Resend / SendGrid | Adapter pattern with demo fallback |
| E-Sign | DocuSign / HelloSign | Adapter pattern with demo fallback |
| Storage | Local disk / S3 | Adapter pattern in server/storage/ |
| Testing | Jest + Supertest | 136 tests across 11 suites |
| Frontend Deploy | Vercel | Auto-deploys from GitHub master |
| Backend Deploy | Railway | PostgreSQL + Express API |

## What's Included

### Investor Portal
| Page | Features |
|------|----------|
| **Overview** | KPI strip, action center, performance chart, distribution chart, project cards, activity feed |
| **Portfolio** | Project table with IRR, MOIC, progress. Click any row for detail view with construction updates, docs, cap table |
| **Cap Table** | LP/GP breakdown, commitment vs called, ownership bars, waterfall structure |
| **Documents** | Filter by project/category, download tracking, signature status, action-required badges |
| **Distributions** | Full history table, YTD summary, capital account statements |
| **Messages** | Threaded LP-GP messaging with read receipts, compose new |
| **Profile** | Self-service editing, entity management, password change, MFA setup |

### Admin Panel
| Section | Features |
|---------|----------|
| **Dashboard** | KPI summary, pending actions, project overview |
| **People** | Investor CRM (profiles, activity timeline, groups, staff management) |
| **Projects** | CRUD, KPI editing, waterfall config, construction updates, cap table |
| **Documents** | Upload with targeting, bulk K-1 upload, access audit, view/download tracking |
| **Messages** | Inbox, compose with recipient picker, threaded replies, read receipts |
| **Finance** | XIRR/MOIC calculations, waterfall calculator, scenario modeling, cash flow CRUD |
| **Statements** | Capital call + quarterly report PDF generation with approval workflow |

### Prospective Investor Portal
- Company landing page, active opportunities, project detail pages
- Investor interest form + lead capture

## File Structure

```
northstar-portal/
├── src/
│   ├── App.jsx              # Main investor portal (~2900 lines)
│   ├── Admin.jsx             # Admin panel (~2600 lines)
│   ├── ProspectPortal.jsx    # Public prospect intake (~830 lines)
│   ├── api.js                # API client + demo mode fallback (~1500 lines)
│   ├── data.js               # Static demo data (~300 lines)
│   └── main.jsx              # React entry point
├── server/
│   ├── index.js              # Express app setup
│   ├── prisma.js             # Prisma client singleton
│   ├── seed.js               # Database seeding
│   ├── routes/               # 16 route files
│   ├── middleware/            # auth.js, security.js, validate.js
│   ├── services/             # email/, esign/, audit, finance, mfa, notifications, pdf
│   ├── storage/              # local.js, s3.js file storage adapters
│   └── tests/                # 13 test files (136 tests)
├── prisma/
│   └── schema.prisma         # 22 models
├── docs/                     # ROADMAP, BACKLOG, TECH-STACK, flows
├── public/                   # Static assets, northstar-logo.svg
├── Dockerfile                # Multi-stage production build
├── docker-compose.yml        # PostgreSQL + app
├── Caddyfile                 # Reverse proxy SSL config
├── vercel.json               # Vercel SPA rewrites + API proxy
└── vite.config.js            # Vite build config with proxy + code splitting
```

## Deployment

### Current Production Setup
- **Frontend**: Vercel (auto-deploys from `master` branch)
- **Backend**: Railway (Express API + PostgreSQL via Supabase)
- **Proxy**: Vercel rewrites `/api/*` requests to Railway backend

### Alternative: Docker
```bash
docker-compose up -d --build    # PostgreSQL + app on port 3003
docker-compose exec app sh -c "cd server && node seed.js"  # seed first time
```

See `docs/DEPLOYMENT.md` for full deployment guide.

## Testing

```bash
npm test    # Runs all 136 tests (auth, IDOR, RBAC, workflow e2e)
```

## Build for Production

```bash
npm run build    # outputs to /dist
npm run preview  # preview production build locally
```

## Environment Variables

See `docs/DEPLOYMENT.md` for the full list. Key variables:

```env
DATABASE_URL=postgresql://...
JWT_SECRET=<random-64-char-string>
API_PORT=3003
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_...
ESIGN_PROVIDER=docusign
```

## License

Proprietary — Northstar Pacific Development Group.
