# Northstar Portal — Agent Working Guide

This document captures everything a future AI agent needs to work effectively on this project with Peter.

---

## How Peter Works

### Communication Style
- **Direct and fast-paced.** Peter sends multiple messages in rapid succession, often while work is in progress.
- **Expects autonomous execution.** Don't ask permission for every step — just do it.
- **Prefers visual proof.** Show screenshots or live previews, don't just describe what changed.
- **Values honest assessments.** Give real percentages and timelines, not optimistic estimates.
- **Runs multiple AI agents.** Peter uses ChatGPT/Codex for code review and cross-checks Claude's work. Expect to receive their feedback and respond to it honestly.

### Workflow Preferences
- **Commit frequently.** Commit after each sprint/feature, not in bulk at the end.
- **Push immediately after committing.** Peter deploys from GitHub → Vercel auto-deploy.
- **No `Co-Authored-By` trailers.** Vercel Hobby plan blocks deploys when it sees unfamiliar co-authors. Do NOT add co-author lines to commits.
- **Don't change git config.** Never modify the user's git identity.
- **Sprint-based development.** Peter thinks in sprints. Number them, track progress, commit per sprint.
- **Document as you go.** Update BACKLOG.md and ROADMAP.md after each sprint.
- **Demo mode is critical.** The Vercel deployment has no backend — the frontend must work in demo mode with static data fallback.

### Design Preferences
- **The "Elevated Minimal" design is the approved look.** White backgrounds, subtle shadows, colored left borders on KPI cards, clean sans-serif typography.
- **Do NOT change the UI/UX without explicit approval.** The design was iterated multiple times and Peter has a specific version he likes (commit `268152e`). Modifications to visual design require showing mockups first.
- **Use Northstar's actual branding.** Red `#EA2028`, dark text `#231F20`, "N" parallelogram icon, geometric wordmark. Assets come from northstardevelopment.ca.
- **Vite HMR is unreliable for full rewrites.** After large file changes, always stop and restart the dev server to verify. Don't trust that the preview is showing current code.

### Things to Avoid
- **Don't add features without asking.** Peter prefers focused, requested changes only.
- **Don't "improve" working code.** If it works and Peter approved it, don't refactor or "polish" it.
- **Don't batch multiple concerns into one commit.** Keep commits focused.
- **Don't over-engineer.** Simple CRUD is fine. Don't add abstractions for hypothetical future needs.
- **Don't add emojis to code or docs** unless Peter asks for them.

---

## Project Architecture

### Tech Stack
| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React 18 + Vite 5 | Single-file components (App.jsx ~2900 lines, Admin.jsx ~2600 lines) |
| Styling | Inline styles | No CSS files. Theme system via React Context. |
| Charts | Recharts | AreaChart, BarChart for performance/distribution views |
| Backend | Express.js | REST API on port 3003 |
| ORM | Prisma | 22 models, SQLite dev / PostgreSQL production |
| Auth | JWT + bcrypt | Role-based: INVESTOR, ADMIN, GP |
| MFA | TOTP | QR code setup, backup codes |
| Email | SendGrid / Resend | Adapter pattern with demo fallback |
| E-Sign | DocuSign / HelloSign | Adapter pattern with demo fallback |
| Storage | Local disk / S3 | Adapter pattern in server/storage/ |
| Testing | Jest + Supertest | 136 tests across 11 suites |
| Deployment | Vercel (frontend) | Auto-deploys from GitHub master branch |

### File Structure
```
northstar-portal/
├── src/
│   ├── App.jsx           # Main investor portal (2900 lines)
│   ├── Admin.jsx          # Admin panel (2600 lines)
│   ├── ProspectPortal.jsx # Public prospect intake (830 lines)
│   ├── api.js             # API client + demo mode (~1500 lines)
│   ├── data.js            # Static demo data (~300 lines)
│   └── main.jsx           # React entry point
├── server/
│   ├── index.js           # Express app setup
│   ├── prisma.js          # Prisma client singleton
│   ├── seed.js            # Database seeding
│   ├── routes/            # 14 route files
│   ├── middleware/         # auth.js, security.js, validate.js
│   ├── services/          # email/, esign/, audit, finance, mfa, notifications
│   ├── storage/           # local.js, s3.js file storage adapters
│   └── tests/             # 13 test files
├── prisma/
│   └── schema.prisma      # 22 models
├── docs/                  # ROADMAP, BACKLOG, TECH-STACK, flows, summaries
├── public/                # Static assets, northstar-logo.svg
├── vercel.json            # Vercel deployment config
└── vite.config.js         # Vite build config with proxy + code splitting
```

### Key Design Patterns
1. **Demo mode fallback**: When API is unreachable (Vercel), the frontend falls back to static data from `data.js`. Detection handles 404, 405, 500, and network errors.
2. **Provider adapters**: Email, e-sign, and storage use a factory pattern — set `EMAIL_PROVIDER=sendgrid` env var, get SendGrid. Default is `demo` which logs to console.
3. **Theme system**: `ThemeContext` provides `{ bg, surface, line, t1, t2, t3, hover, headerBg, avatarGrad }`. Default is light. User preference stored in `localStorage("northstar_theme")`.
4. **Auth flow**: Login → JWT token stored in memory → `Authorization: Bearer` header on all API calls. Demo mode stores role in `localStorage("northstar_demo_role")`.
5. **IDOR protection**: All investor-scoped routes verify `req.user.id` matches the requested resource. Tests confirm this.

---

## Critical Business Context

### Northstar Business Model
- Northstar Pacific Development Group is a **real estate developer**, NOT a fund.
- Investors invest at the **project level**, not into a pooled fund.
- Each project has its own cap table, waterfall, distributions, and documents.
- There is no "fund IRR" — metrics are per-project, aggregated for display.
- Investors can only communicate with **Northstar staff**, not other investors.

### Northstar Brand
| Element | Value |
|---------|-------|
| Primary Red | `#EA2028` |
| Dark Text | `#231F20` |
| Cream | `#FDFAF2` |
| Logo | Geometric "N" icon (two parallelogram shapes) |
| Wordmark | Custom geometric sans-serif "NORTHSTAR" (SVG paths) |
| Tagline | "Enlivening Communities Through Mindful Development" |
| Address | 710 – 1199 W Pender St, Vancouver BC V6E 2R1 |
| Website | northstardevelopment.ca |
| Actual Projects | Porthaven, Livy, Estrella, Panorama |

### Project Image Sources
```
https://northstardevelopment.ca/public/images/porthaven-1.jpg
https://northstardevelopment.ca/public/images/livy-2.jpeg
https://northstardevelopment.ca/public/images/estrella-1.jpg
https://northstardevelopment.ca/public/images/panorama-1.jpg
```

---

## Development Setup

### Prerequisites
- Node.js 18+
- npm

### Quick Start
```bash
cd northstar-portal
npm install
cd server && npm install && cd ..
npx prisma generate
npx prisma db push
node server/seed.js
```

### Running Dev
```bash
# Terminal 1: API server
cd server && npm run dev   # Port 3003

# Terminal 2: Frontend
npm run dev                 # Port 3000, proxies /api to 3003
```

### Running Tests
```bash
npm test                    # Delegates to server/tests, runs all 136 tests
```

### Building for Production
```bash
npm run build               # Outputs to dist/
```

### Deploying to Vercel
```bash
npx vercel login
npx vercel --prod           # Deploys from dist/
```
Or push to `master` branch — Vercel auto-deploys.

### Environment Variables (Production)
```
DATABASE_URL=postgresql://user:pass@host:5432/northstar_portal
JWT_SECRET=<random-64-char-string>
API_PORT=3003
NODE_ENV=production
CORS_ORIGINS=https://portal.northstardevelopment.ca
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.xxx
EMAIL_FROM_ADDRESS=noreply@northstardevelopment.ca
ESIGN_PROVIDER=docusign
DOCUSIGN_INTEGRATION_KEY=xxx
DOCUSIGN_USER_ID=xxx
DOCUSIGN_ACCOUNT_ID=xxx
DOCUSIGN_PRIVATE_KEY_PATH=./docusign-private.pem
SENTRY_DSN=https://key@sentry.io/project
REPLY_DOMAIN=mail.northstardevelopment.ca
REPLY_SECRET=<random-string>
```

---

## GitHub & Deployment

| Item | Value |
|------|-------|
| Repo | `https://github.com/pcxwow-cell/northstar-portal.git` |
| Branch | `master` |
| Vercel URL | `https://northstar-portal-roan.vercel.app/` |
| Vercel Project | northstar-portal (Hobby plan) |
| Auto-deploy | Yes, from GitHub push to master |
| gh CLI | Not installed — use Vercel CLI or manual GitHub |

---

## Known Issues & Gotchas

1. **Vite HMR breaks on large file rewrites.** Always restart the dev server after editing App.jsx or Admin.jsx extensively.
2. **Vercel Hobby plan blocks co-authored commits.** Never add `Co-Authored-By` to commit messages.
3. **Demo mode detection must handle 404, 405, and 500.** Vercel returns different error codes than local Vite proxy.
4. **`db push` is used in dev, not migrations.** Production should use `prisma migrate deploy`.
5. **Bundle size warning.** Recharts vendor chunk is 517KB. Acceptable for now but should consider alternatives (Victory, lightweight charts) for production optimization.
6. **SQLite for dev only.** Cannot handle concurrent users. Production must use PostgreSQL.
7. **No real integration testing.** DocuSign, SendGrid, etc. have never been tested with real API keys.
8. **The good UI commit is `268152e`.** If the design looks wrong, diff against this commit.

---

## Competitive Landscape

Northstar's portal competes with:
| Platform | Strength | Gap vs Northstar |
|----------|----------|-----------------|
| Juniper Square | Institutional-grade, strong admin workflows | Full ops suite, investor onboarding |
| InvestNext | Fundraising + CRM + investor portal | Fundraising pipeline, CRM depth |
| Agora | Investor relations + communications | Notification center sophistication |
| AppFolio IM | PM + IM integration | Property management integration |

### Missing vs Market Standard
1. KYC/AML/accreditation onboarding (VerifyInvestor, Parallel Markets)
2. Automated distribution processing (ACH/wire payment rails)
3. Investor onboarding wizard (guided setup flow)
4. Advanced audit/compliance trail (document view duration, watermarks)
5. Mobile app (responsive web is current approach)

---

## Sprint History

| Sprint | What | Commit |
|--------|------|--------|
| 1-5 | Core backend, auth, admin panel, API routes | Various |
| 6 | Investor groups, targeted messaging | Various |
| 7 | Threaded messaging, admin inbox, recipient picker | `778c894` |
| 8 | Admin CRM, groups, staff management | `c0878f8` |
| 9 | Document management dashboard | `8250a9f` |
| 10 | Admin project KPI dashboard | `9520df3` |
| 11 | Investor portal enhancements | `3bb1219` |
| 12 | E-signature + email notifications | `b48ff7d` |
| 13 | Prospective investor portal | `dc8d2f0` |
| 14 | Financial engine (IRR, waterfall, cash flows) | `b595c09` |
| 15 | Production polish | `e01ca35` |
| 16 | Project creation, entities, financial modeler | `eecc07b` |
| 17 | Security features, cash flow management | `5c6f715` |
| Security | IDOR fixes, regression tests, CORS hardening | `c04db90`, `6aa9464` |
| Design | Elevated Minimal design system | `45476c8` |
| MVP Summary | PDF report, updated backlog | `268152e` |
| Production | MFA, PostgreSQL, CI/CD, Zod validation | `052d30e`, `f170579` |
| Tests | Workflow integration tests (136 total) | `821f595` |
| Bundle | Code splitting, lazy loading | `ad2149d` |
| Vercel Fix | SPA rewrites, 405 handling, UI restore | `48ce702` |

---

## Lessons Learned

1. **Commit the good version before polishing.** The "polish sprint" broke the approved design. Always tag/branch before making visual changes.
2. **Don't change what works without showing mockups first.** Peter approves designs visually, not through descriptions.
3. **Vercel demo mode needs aggressive error detection.** Handle every possible HTTP status code the proxy/CDN might return.
4. **Keep sprint scope small.** Large sprints with 20+ changes are hard to debug when something breaks.
5. **The preview tool has viewport limitations.** Don't rely on narrow preview screenshots to verify layout — check the actual DOM.
6. **Cross-check with user's preferred deployment URL.** Always ask "does it look right on Vercel?" — local dev can differ significantly.
7. **Business context matters more than technical elegance.** Peter cares about investor-facing quality, not code architecture debates.
