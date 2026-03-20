# Northstar Investor Portal — Project Directives

These rules apply to ALL agents working on this project.

## Critical Rules

- **No `Co-Authored-By` in commits.** Vercel Hobby plan blocks deploys.
- **Demo mode must always work.** Production connects Vercel → Railway, but demo mode (no backend) must still function for demos and testing. Every feature needs a static data fallback in `src/api.js`.
- **Don't change the visual design.** "Elevated Minimal" look is approved: white backgrounds, subtle shadows, #EA2028 red, Cormorant Garamond + DM Sans.
- **Don't change git config.** Never modify the user's git identity.
- **Push after every commit.** Auto-deploy via GitHub → Vercel.

## Project State (as of 2026-03-19)

- **Overall: 8/10** — strong backend (8.5), improving frontend (7), Sprint 1 critical fixes done
- **Deploy:** Vercel (frontend) → Railway (backend) → Supabase (PostgreSQL)
- **Backend:** Express 4 + Prisma ORM, 22 models, 136 tests, adapter patterns for email/storage/e-sign
- **Frontend:** React 18 + Vite 5, fully extracted: App.jsx (724 lines), Admin.jsx (226 lines), 12 pages, 14 admin managers, 15 shared components
- **Auth:** JWT + bcrypt + TOTP MFA, roles: INVESTOR, ADMIN, GP
- **Production seed:** 5 users (1 admin + 4 investors, pw: northstar2025), 8 docs with real branded PDFs (pdfkit), 28 assignments, 23 cash flows, 8 waterfall tiers, 3 groups, 5 entities
- **Issues:** 14 of 18 production issues fixed. 4 remaining (low priority): P11 (distribution id), P14 (feature flags path), P15 (FOUC), P16 (audit userId)
- **Email:** Resend configured and working. Branding set via settings API (companyName, portalUrl, brandColor, footerText). Sender still `onboarding@resend.dev` (needs custom domain)
- **Priority:** FULL-AUDIT Sprint 1 complete (5 critical fixes). Next: Sprint 2+ from FULL-AUDIT.md
- **Live URLs:** Frontend: https://northstar-portal-roan.vercel.app/ | API: https://northstar-portal-production.up.railway.app/

## Key Docs

| Document | Purpose |
|----------|---------|
| `SKILLS.md` | Brand guidelines, Peter's workflow preferences |
| `docs/FRONTEND-PLAN.md` | Frontend extraction results — COMPLETE (33 commits) |
| `docs/FEATURE-FIX-PLAN.md` | **Primary plan** — Sprint A-L functional fix tasks (67 tasks, 12 sprints). Sprint B done |
| `docs/WORKFLOW-AUDIT.md` | 57 workflow audit issues |
| `docs/DEEP-AUDIT.md` | 57 deep-dive audit issues |
| `docs/UI-REVIEW.md` | View-by-view UI/UX review with competitor benchmarks |
| `docs/COMPETITIVE-ANALYSIS.md` | Industry benchmark comparison |
| `docs/BACKLOG.md` | Product backlog (update after each sprint) |
| `docs/ROADMAP.md` | Honest project roadmap with current state |
| `docs/BUG-AUDIT.md` | Code-level bug audit (from building agent, reference only) |
| `docs/DATABASE-SCHEMA.md` | Prisma schema documentation |
| `docs/TECH-STACK.md` | Technology stack details |
| `docs/DEPLOYMENT.md` | Deployment architecture |

## Agent Commands

- `/audit` — QA/PM Auditor: analyzes code, traces workflows, documents issues. Never writes production code.
- `/build` — Build Agent (Sonnet): writes production code following architectural rules. Executes the frontend plan.
- `/review` — Project Manager (Opus): reviews Sonnet's work, updates the plan, generates the next build command.

### Workflow

**Autopilot (walk away):**
```
cd /home/pc/northstar-portal && ./scripts/autopilot.sh 10
```
Runs up to 10 cycles: Sonnet builds → Opus reviews → writes next instructions → repeat. Stops when all phases complete. Logs in `logs/`.

**Manual:**
1. Run Sonnet: `claude --dangerously-skip-permissions --model claude-sonnet-4-6 -p /home/pc/northstar-portal "/build [instructions]"`
2. Run Opus to review: `claude --dangerously-skip-permissions --model claude-opus-4-6 -p /home/pc/northstar-portal /review`
3. Opus writes next instructions to `.claude/next-build-instructions.md` and outputs a paste command.

## Design Tokens

All styling must reference `src/styles/theme.js`. Key values:
- Red: `#EA2028` | Green: `#3D7A54` | Dark: `#231F20` | Muted: `#767168`
- Serif: Cormorant Garamond | Sans: DM Sans
- Max 300 lines per component file
