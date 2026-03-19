# Northstar Investor Portal — Project Directives

These rules apply to ALL agents working on this project.

## Critical Rules

- **No `Co-Authored-By` in commits.** Vercel Hobby plan blocks deploys.
- **Demo mode must always work.** Production connects Vercel → Railway, but demo mode (no backend) must still function for demos and testing. Every feature needs a static data fallback in `src/api.js`.
- **Don't change the visual design.** "Elevated Minimal" look is approved: white backgrounds, subtle shadows, #EA2028 red, Cormorant Garamond + DM Sans.
- **Don't change git config.** Never modify the user's git identity.
- **Push after every commit.** Auto-deploy via GitHub → Vercel.

## Project State (as of 2026-03-18)

- **Overall: 5/10** — strong backend (7.5), broken frontend (3)
- **Deploy:** Vercel (frontend) → Railway (backend) → Supabase (PostgreSQL)
- **Backend:** Express 4 + Prisma ORM, 22 models, 136 tests, adapter patterns for email/storage/e-sign
- **Frontend:** React 18 + Vite 5, two monolithic files (Admin.jsx: 4,796 lines, App.jsx: 3,336 lines), 14 shared components exist but aren't imported
- **Auth:** JWT + bcrypt + TOTP MFA, roles: INVESTOR, ADMIN, GP
- **Issues:** 114 found, 107 unfixed (9 critical, 4 blockers, 14 broken, 69 missing, 18 UX)
- **Priority:** Frontend extraction first, then functional fixes

## Key Docs

| Document | Purpose |
|----------|---------|
| `SKILLS.md` | Brand guidelines, Peter's workflow preferences |
| `docs/FRONTEND-PLAN.md` | **Primary plan** — incremental frontend extraction (~35 commits) |
| `docs/FEATURE-FIX-PLAN.md` | Sprint A-L functional fix tasks (67 tasks, 12 sprints) |
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
