# Northstar Portal — Production Audit

> Date: 2026-03-19
> Backend: https://northstar-portal-production.up.railway.app
> Frontend: https://northstar-portal-roan.vercel.app
> Method: Live API testing against Railway backend through both direct and Vercel proxy

---

## Status: PARTIAL — Core flows work, 18 issues found

### What Works (Verified Live)

| Feature | Status | Details |
|---------|--------|---------|
| **Health check** | ✅ | `/api/v1/health` returns `{"status":"ok"}` |
| **Investor login** | ✅ | `j.chen@pacificventures.ca` / `northstar2025` |
| **Admin login** | ✅ | `admin@northstardevelopment.ca` / `admin2025` |
| **Vercel → Railway proxy** | ✅ | All API calls work through Vercel |
| **SPA routing** | ✅ | Deep links `/documents`, `/admin` serve index.html |
| **JS chunks load** | ✅ | `index-COc9C24l.js` loads (200) |
| **Project list (investor)** | ✅ | 2 projects returned with full data |
| **Project detail** | ✅ | Porthaven: totalRaise $6M, 3 updates, 6 cap table entries |
| **Documents list** | ✅ | 8 documents with correct statuses |
| **Acknowledge endpoint** | ✅ | `POST /documents/4/acknowledge` works |
| **Signature requests** | ✅ | 2 requests returned, both signed |
| **Admin document detail** | ✅ | Includes signatureRequests with signer status |
| **Group assignment** | ✅ | `POST /admin/documents/1/assign` with groupIds resolves members |
| **Threads (investor)** | ✅ | 7 threads returned |
| **Send message** | ✅ | `POST /threads` creates thread successfully |
| **Thread detail** | ✅ | Messages and recipients returned |
| **Capital account** | ✅ | `/finance/capital-account/1/1` — committed/called/distributions/IRR/MOIC |
| **Cash flows** | ✅ | 5 cash flows for project 1 |
| **IRR calculation** | ✅ | `POST /finance/calculate-irr` returns correct IRR |
| **Admin dashboard** | ✅ | 4 projects, 1 investor, 8 docs, 2 unread |
| **Admin investors** | ✅ | 1 investor (James Chen) |
| **Admin projects** | ✅ | 4 projects listed |
| **Admin groups** | ✅ | 2 groups (Class A, Class A LPs) |
| **Investor profile** | ✅ | 2 projects, 3 docs, 1 group, 7 threads |
| **Profile update** | ✅ | PUT /auth/profile works |
| **Login history** | ✅ | 13 entries |
| **Investor entities** | ✅ | 1 entity |
| **Notification preferences** | ✅ | All 5 email prefs returned |
| **Notifications** | ✅ | 7 notifications |
| **Audit log** | ✅ | Working, captures login/download/acknowledge |
| **Prospects** | ✅ | 5 prospects, form submit works without auth |
| **Statements endpoint** | ✅ | Returns empty array (no statements yet) |
| **Feature flags** | ✅ | `/features/my-flags` returns full flag set |
| **IDOR protection** | ✅ | Project 3 access denied for investor, admin endpoint returns 403 |
| **Password reset** | ✅ | `POST /auth/forgot-password` returns success |
| **Distributions** | ✅ | 4 distributions returned |

---

## Issues Found (18)

### CRITICAL (4) — Broken for users

| # | Issue | Impact | Fix |
|---|-------|--------|-----|
| P1 | **README has wrong credentials** | Nobody can log in following README | README says `james@chen.com` / `password123` and `admin@northstar.com` / `admin123`. Actual: `j.chen@pacificventures.ca` / `northstar2025` and `admin@northstardevelopment.ca` / `admin2025` |
| P2 | **All documents have no storageKey** | Downloads return 404, preview returns 404 | All 8 seed documents have `storageKey: null` — no actual files uploaded to storage. Seed creates file path references (`/docs/...`) but never uploads to storage adapter |
| P3 | **Resend API key invalid** | No emails can be sent | `POST /settings/email/test` returns `"API key is invalid"`. Email provider shows configured=true but the key doesn't work |
| P4 | **Only 1 investor in production DB** | Can't demo multi-investor features | Seed only creates 1 investor (James Chen). Need at least 3-5 to demo group assignment, messaging, comparison |

### HIGH (5) — Functional gaps

| # | Issue | Impact | Fix |
|---|-------|--------|-----|
| P5 | **Waterfall tiers empty** | Waterfall tab shows nothing | Project 1 has 0 waterfall tiers. Seed needs to create WaterfallTier records |
| P6 | **Email from address is `onboarding@resend.dev`** | Emails look unprofessional, Resend sandbox only allows this sender | Need custom domain verified in Resend, or at minimum `fromName` set |
| P7 | **portalUrl and companyName not configured** | Email templates missing branding | `/settings/email` shows `portalUrl: null`, `companyName: null`, `fromName: null` |
| P8 | **MFA status not in /auth/me response** | Frontend can't show MFA status | `mfaEnabled` field missing from user response |
| P9 | **Class A group has 0 members** | Duplicate/orphaned group | Two groups: "Class A" (0 members) and "Class A LPs" (1 member). First is likely an error |

### MEDIUM (5) — UX/data issues

| # | Issue | Impact | Fix |
|---|-------|--------|-----|
| P10 | **Thread recipients empty** | Thread detail shows 0 recipients even though messages exist | Thread 19 has 1 message but 0 recipients returned — possible seed/query issue |
| P11 | **Distribution shape missing `id`** | Frontend may fail on certain operations | Distribution objects use `quarter`/`date`/`amount` but no `id` field |
| P12 | **Waterfall config empty** | Admin project detail shows no waterfall configuration | `waterfallConfig: {}` for all projects |
| P13 | **Only 1 investor in admin view** | Admin features like group management, comparison feel empty | Need more seed data for realistic demo |
| P14 | **Feature flags route mismatch** | If frontend calls `/features` instead of `/features/my-flags` it 404s | Verify frontend calls correct path |

### LOW (4) — Polish

| # | Issue | Impact | Fix |
|---|-------|--------|-----|
| P15 | **No CSS in initial HTML** | Flash of unstyled content possible | CSS may be JS-injected rather than link tag (Vite default) |
| P16 | **Audit log userId shows as `?`** | Admin can't tell who did what | Audit entries don't include userId in JSON response or it's nested differently |
| P17 | **Prospect projects route requires auth** | ProspectPortal can't load projects without login | `GET /prospects/projects` returns 401 — needs to be public |
| P18 | **Two nearly-identical seed groups** | Confusing for admin | "Class A" and "Class A LPs" — clean up seed data |

---

## Priority Fix Order

1. **P2: Upload seed document files** — Documents are the core feature. Without actual PDFs, download and preview both 404.
2. **P1: Fix README credentials** — Anyone trying to demo gets stuck at login.
3. **P4+P5+P13: Enrich seed data** — Add 3-4 more investors, waterfall tiers, more realistic data.
4. **P3: Fix Resend API key** — Either get a valid key or configure Railway env var correctly.
5. **P6+P7: Configure email settings** — Set fromName, portalUrl, companyName via admin panel or env vars.
6. **P8: Add mfaEnabled to /auth/me** — Quick backend fix.
7. **P17: Make prospect project list public** — Route change.

---

## Live Credentials (actual, verified)

| Role | Email | Password |
|------|-------|----------|
| Investor | j.chen@pacificventures.ca | northstar2025 |
| Admin | admin@northstardevelopment.ca | admin2025 |
