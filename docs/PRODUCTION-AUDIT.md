# Northstar Portal — Production Audit

> Date: 2026-03-19 (updated after fixes)
> Backend: https://northstar-portal-production.up.railway.app
> Frontend: https://northstar-portal-roan.vercel.app
> Method: Live API testing against Railway backend through both direct and Vercel proxy

---

## Status: MOSTLY WORKING — 11 of 18 issues fixed, 7 remaining

### What Works (Verified Live After Reseed)

| Feature | Status | Details |
|---------|--------|---------|
| **Health check** | ✅ | `/api/v1/health` returns `{"status":"ok"}` |
| **Investor login** | ✅ | `j.chen@pacificventures.ca` / `northstar2025` |
| **Admin login** | ✅ | `admin@northstardevelopment.ca` / `admin2025` |
| **Vercel → Railway proxy** | ✅ | All API calls work through Vercel |
| **SPA routing** | ✅ | Deep links `/documents`, `/admin` serve index.html |
| **JS chunks load** | ✅ | Frontend JS loads (200) |
| **Project list (investor)** | ✅ | 4 projects returned with full data |
| **Project detail** | ✅ | Porthaven: totalRaise $6M, 3 updates, 6 cap table entries, 4 waterfall tiers |
| **Documents list** | ✅ | 8 documents with storageKeys and correct statuses |
| **Document download** | ✅ | All 8 documents return real PDFs (200, application/pdf) |
| **Document preview** | ✅ | Inline PDF preview works with ?token= auth |
| **Acknowledge endpoint** | ✅ | `POST /documents/4/acknowledge` works |
| **Signature requests** | ✅ | 2 requests returned (1 signed, 1 pending) |
| **Admin document detail** | ✅ | Includes signatureRequests with signer status |
| **Group assignment** | ✅ | `POST /admin/documents/1/assign` with groupIds resolves members |
| **Threads (investor)** | ✅ | Threads returned with proper recipients |
| **Thread recipients** | ✅ | Recipients populated based on targeting (ALL, PROJECT) |
| **Send message** | ✅ | `POST /threads` creates thread successfully |
| **Thread detail** | ✅ | Messages and recipients returned |
| **Capital account** | ✅ | `/finance/capital-account/1/1` — committed/called/distributions/IRR/MOIC |
| **Cash flows** | ✅ | 23 cash flows across all investors |
| **IRR calculation** | ✅ | `POST /finance/calculate-irr` returns correct IRR |
| **Admin dashboard** | ✅ | 4 projects, 4 investors, 8 docs, 2 unread |
| **Admin investors** | ✅ | 4 investors (James Chen, Sarah Whitfield, Michael Rodriguez, Lisa Park) |
| **Admin projects** | ✅ | 4 projects listed |
| **Admin groups** | ✅ | 3 groups (Class A LPs: 3 members, West Coast: 2, Class B: 1) |
| **Investor profile** | ✅ | Profile data with entities |
| **Profile update** | ✅ | PUT /auth/profile works |
| **Investor entities** | ✅ | 5 entities across 4 investors |
| **MFA status** | ✅ | `mfaEnabled` returned in /auth/me response |
| **Notification preferences** | ✅ | All 5 email prefs returned for all users |
| **Audit log** | ✅ | Working, captures login/download/acknowledge |
| **Prospects** | ✅ | 5 prospects, form submit works without auth |
| **Prospect projects (public)** | ✅ | `GET /prospects/projects` returns 4 projects without auth |
| **Statements endpoint** | ✅ | Returns empty array (no statements yet) |
| **Feature flags** | ✅ | `/features/my-flags` returns full flag set |
| **IDOR protection** | ✅ | Project access properly scoped to investor |
| **Password reset** | ✅ | `POST /auth/forgot-password` returns success |
| **Distributions** | ✅ | 4 distributions returned |
| **Waterfall tiers** | ✅ | 4 tiers per project (8 total), correct statuses |
| **Document assignments** | ✅ | 28 assignments across 4 investors based on project access |

---

## Issues Fixed (11 of 18)

| # | Issue | Status | Fix Applied |
|---|-------|--------|-------------|
| P1 | README wrong credentials | ✅ FIXED | README updated with correct credentials |
| P2 | All documents have no storageKey | ✅ FIXED | Seed generates real branded PDFs via pdfkit, uploads to storage adapter |
| P4 | Only 1 investor in DB | ✅ FIXED | Added 3 more investors (Sarah Whitfield, Michael Rodriguez, Lisa Park) with entities, cash flows, group memberships |
| P5 | Waterfall tiers empty | ✅ FIXED | Seed creates 4 waterfall tiers per project (8 total) |
| P8 | MFA status not in /auth/me | ✅ FIXED | Added `mfaEnabled: !!user.mfaSecret` to response |
| P9 | Duplicate "Class A" group | ✅ FIXED | Clean groups: Class A LPs (3), West Coast sub-group (2), Class B (1) |
| P10 | Thread recipients empty | ✅ FIXED | Recipients now populated based on targetType (ALL → all investors, PROJECT → project investors) |
| P13 | Only 1 investor in admin view | ✅ FIXED | 4 investors visible in admin |
| P17 | Prospect projects route requires auth | ✅ FIXED | Added public `GET /prospects/projects` route |
| P18 | Two nearly-identical groups | ✅ FIXED | Groups restructured with hierarchy |
| P12 | Waterfall config empty | ✅ FIXED | Waterfall tiers created in seed with proper statuses |

## Issues Remaining (7)

### CRITICAL (1)

| # | Issue | Impact | Action Needed |
|---|-------|--------|---------------|
| P3 | **Resend API key invalid** | No emails can be sent | User must verify/update RESEND_API_KEY env var on Railway |

### HIGH (2)

| # | Issue | Impact | Action Needed |
|---|-------|--------|---------------|
| P6 | **Email from address is `onboarding@resend.dev`** | Emails look unprofessional | Verify custom domain in Resend, or set fromName env var |
| P7 | **portalUrl and companyName not configured** | Email templates missing branding | Set PORTAL_URL, COMPANY_NAME env vars on Railway |

### MEDIUM (1)

| # | Issue | Impact | Action Needed |
|---|-------|--------|---------------|
| P11 | **Distribution shape missing `id`** | Frontend may fail on certain operations | Add `id` to distribution query response |

### LOW (3)

| # | Issue | Impact | Action Needed |
|---|-------|--------|---------------|
| P14 | **Feature flags route mismatch** | Minor — frontend may call wrong path | Verify frontend calls `/features/my-flags` |
| P15 | **No CSS in initial HTML** | Flash of unstyled content possible | Vite default behavior, low priority |
| P16 | **Audit log userId shows as `?`** | Admin can't tell who did what | Include userId in audit log response |

---

## Production Data Summary (after reseed)

| Entity | Count | Details |
|--------|-------|---------|
| Users | 5 | 1 admin + 4 investors |
| Projects | 4 | Porthaven, Livy, Estrella, Panorama |
| Documents | 8 | All with real PDF files and storageKeys |
| Document Assignments | 28 | Distributed across investors by project |
| Investor-Project Links | 10 | Proper capital structure |
| Cap Table Entries | 11 | Porthaven (6) + Livy (5) |
| Waterfall Tiers | 8 | 4 per project (Porthaven + Livy) |
| Distributions | 4 | All from Porthaven |
| Cash Flows | 23 | Across all 4 investors |
| Message Threads | 5 | With proper recipient targeting |
| Investor Groups | 3 | Class A LPs (3), West Coast (2), Class B (1) |
| Investor Entities | 5 | Across all investors |
| Prospects | 5 | Various statuses |
| Signature Requests | 2 | 1 signed, 1 pending |

---

## Live Credentials (verified)

| Role | Email | Password |
|------|-------|----------|
| Investor (James Chen) | j.chen@pacificventures.ca | northstar2025 |
| Investor (Sarah Whitfield) | sarah.whitfield@coastalfamily.ca | northstar2025 |
| Investor (Michael Rodriguez) | m.rodriguez@westridgecapital.com | northstar2025 |
| Investor (Lisa Park) | lisa.park@pacificpension.ca | northstar2025 |
| Admin | admin@northstardevelopment.ca | admin2025 |
