"""
Northstar Investor Portal — MVP Summary PDF v2
Generated: March 17, 2026
"""

from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable, KeepTogether
)

RED = HexColor("#EA2028")
DARK = HexColor("#231F20")
GRAY = HexColor("#666666")
LIGHT_GRAY = HexColor("#F5F3EF")
LIGHT_RED = HexColor("#FFF0F0")
GREEN = HexColor("#3D7A54")
LIGHT_GREEN = HexColor("#E8F5E9")

styles = getSampleStyleSheet()

# Custom styles
styles.add(ParagraphStyle("DocTitle", parent=styles["Title"], fontSize=24, textColor=DARK, spaceAfter=4, fontName="Helvetica-Bold"))
styles.add(ParagraphStyle("DocSubtitle", parent=styles["Normal"], fontSize=11, textColor=GRAY, spaceAfter=20, alignment=TA_CENTER))
styles.add(ParagraphStyle("SectionTitle", parent=styles["Heading1"], fontSize=16, textColor=RED, spaceBefore=20, spaceAfter=8, fontName="Helvetica-Bold"))
styles.add(ParagraphStyle("SubSection", parent=styles["Heading2"], fontSize=13, textColor=DARK, spaceBefore=14, spaceAfter=6, fontName="Helvetica-Bold"))
styles.add(ParagraphStyle("Body", parent=styles["Normal"], fontSize=10, textColor=DARK, spaceAfter=6, leading=14))
styles.add(ParagraphStyle("BodySmall", parent=styles["Normal"], fontSize=9, textColor=GRAY, spaceAfter=4, leading=12))
styles.add(ParagraphStyle("BulletItem", parent=styles["Normal"], fontSize=10, textColor=DARK, spaceAfter=3, leading=13, leftIndent=16, bulletIndent=6))
styles.add(ParagraphStyle("TableHeader", parent=styles["Normal"], fontSize=9, textColor=white, fontName="Helvetica-Bold"))
styles.add(ParagraphStyle("TableCell", parent=styles["Normal"], fontSize=9, textColor=DARK, leading=12))
styles.add(ParagraphStyle("TableCellGray", parent=styles["Normal"], fontSize=9, textColor=GRAY, leading=12))
styles.add(ParagraphStyle("StatusDone", parent=styles["Normal"], fontSize=9, textColor=GREEN, fontName="Helvetica-Bold"))
styles.add(ParagraphStyle("StatusPending", parent=styles["Normal"], fontSize=9, textColor=HexColor("#CC8800"), fontName="Helvetica-Bold"))
styles.add(ParagraphStyle("Footer", parent=styles["Normal"], fontSize=8, textColor=GRAY, alignment=TA_CENTER))
styles.add(ParagraphStyle("MetricValue", parent=styles["Normal"], fontSize=22, textColor=RED, fontName="Helvetica-Bold", alignment=TA_CENTER))
styles.add(ParagraphStyle("MetricLabel", parent=styles["Normal"], fontSize=9, textColor=GRAY, alignment=TA_CENTER, spaceAfter=8))

def make_table(headers, rows, col_widths=None):
    data = [[Paragraph(h, styles["TableHeader"]) for h in headers]]
    for row in rows:
        data.append([Paragraph(str(c), styles["TableCell"]) for c in row])

    t = Table(data, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), RED),
        ("TEXTCOLOR", (0, 0), (-1, 0), white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
        ("TOPPADDING", (0, 0), (-1, 0), 6),
        ("BACKGROUND", (0, 1), (-1, -1), white),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [white, LIGHT_GRAY]),
        ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#DDDDDD")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 1), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 4),
    ]))
    return t

def build_pdf():
    doc = SimpleDocTemplate(
        "C:/Users/PeterChien/northstar-portal/docs/Northstar-Investor-Portal-MVP-Summary-v2.pdf",
        pagesize=letter,
        leftMargin=0.75*inch, rightMargin=0.75*inch,
        topMargin=0.75*inch, bottomMargin=0.75*inch,
    )

    story = []

    # ─── COVER ─────────────────────────────────────
    story.append(Spacer(1, 1.5*inch))
    story.append(Paragraph("NORTHSTAR", ParagraphStyle("BrandTitle", parent=styles["Title"], fontSize=36, textColor=RED, fontName="Helvetica-Bold", alignment=TA_CENTER, spaceAfter=4)))
    story.append(Paragraph("INVESTOR PORTAL", ParagraphStyle("BrandSub", parent=styles["Title"], fontSize=14, textColor=GRAY, fontName="Helvetica", alignment=TA_CENTER, letterSpacing=6, spaceAfter=30)))
    story.append(HRFlowable(width="40%", thickness=2, color=RED, spaceAfter=30))
    story.append(Paragraph("MVP Summary &amp; Production Readiness Report", styles["DocTitle"]))
    story.append(Paragraph("Version 2.0 — March 17, 2026", styles["DocSubtitle"]))
    story.append(Spacer(1, 0.5*inch))

    # Key metrics strip
    metrics_data = [
        [Paragraph("107", styles["MetricValue"]), Paragraph("17", styles["MetricValue"]), Paragraph("22", styles["MetricValue"]), Paragraph("~80%", styles["MetricValue"])],
        [Paragraph("Tests Passing", styles["MetricLabel"]), Paragraph("Sprints Completed", styles["MetricLabel"]), Paragraph("DB Models", styles["MetricLabel"]), Paragraph("Production Ready", styles["MetricLabel"])],
    ]
    metrics_table = Table(metrics_data, colWidths=[1.7*inch]*4)
    metrics_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), LIGHT_GRAY),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, 0), 12),
        ("BOTTOMPADDING", (0, 1), (-1, 1), 12),
        ("BOX", (0, 0), (-1, -1), 1, HexColor("#E2DFD8")),
    ]))
    story.append(metrics_table)

    story.append(Spacer(1, 0.5*inch))
    story.append(Paragraph("Prepared for: Northstar Pacific Development Group", styles["BodySmall"]))
    story.append(Paragraph("710 - 1199 W Pender St, Vancouver BC V6E 2R1", styles["BodySmall"]))

    story.append(PageBreak())

    # ─── TABLE OF CONTENTS ──────────────────────────
    story.append(Paragraph("Table of Contents", styles["SectionTitle"]))
    story.append(Spacer(1, 8))
    toc_items = [
        "1. Executive Summary",
        "2. Architecture & Tech Stack",
        "3. Feature Inventory (Complete)",
        "4. Security & Access Control",
        "5. Testing Coverage",
        "6. Production Readiness Assessment",
        "7. Remaining Work & Recommendations",
        "8. Tech Stack Pricing & Recommendations",
        "9. Competitive Positioning",
    ]
    for item in toc_items:
        story.append(Paragraph(item, styles["Body"]))
    story.append(PageBreak())

    # ─── 1. EXECUTIVE SUMMARY ──────────────────────
    story.append(Paragraph("1. Executive Summary", styles["SectionTitle"]))
    story.append(Paragraph(
        "The Northstar Investor Portal is a full-stack web application providing existing and prospective investors "
        "with secure access to their real estate investments. The portal serves three user types: Investors (Limited Partners), "
        "Admin staff, and General Partners. Built across 17 development sprints, the application includes 25+ API endpoints, "
        "22 database models, 107 automated tests, and comprehensive role-based access control.",
        styles["Body"]
    ))
    story.append(Spacer(1, 8))

    story.append(Paragraph("Key Achievements Since v1", styles["SubSection"]))
    achievements = [
        "107 automated tests (up from 57) including 4 workflow/integration test suites",
        "Bundle splitting: initial load reduced from 730KB to 151KB (79% reduction)",
        "MFA/TOTP authentication with QR code setup and backup codes",
        "PostgreSQL migration support (production-ready, SQLite for dev)",
        "CI/CD pipeline via GitHub Actions",
        "Account lockout, Zod input validation, Sentry error tracking config",
        "Caddy reverse proxy with automatic HTTPS",
        "Elevated Minimal design system matching northstardevelopment.ca branding",
        "Accessibility improvements: ARIA labels, keyboard nav, focus management",
    ]
    for a in achievements:
        story.append(Paragraph(f"<bullet>&bull;</bullet> {a}", styles["BulletItem"]))

    story.append(PageBreak())

    # ─── 2. ARCHITECTURE ──────────────────────────
    story.append(Paragraph("2. Architecture &amp; Tech Stack", styles["SectionTitle"]))

    story.append(make_table(
        ["Layer", "Technology", "Notes"],
        [
            ["Frontend", "React 18 + Vite 5", "Single-page app, lazy-loaded routes, Recharts for visualizations"],
            ["API", "Express 4 (Node.js)", "25+ REST endpoints, Zod validation, rate limiting"],
            ["ORM", "Prisma 6", "22 models, migration history, SQLite (dev) / PostgreSQL (prod)"],
            ["Auth", "JWT + bcrypt + TOTP", "Role-based (INVESTOR/ADMIN/GP), MFA, account lockout"],
            ["Storage", "Local disk + S3 adapter", "Abstraction layer, swap providers via env var"],
            ["Email", "Demo mode + SendGrid/Resend", "Adapters built, templates ready, inbound reply parsing"],
            ["E-Sign", "Demo mode + DocuSign/HelloSign", "Adapters built, signature request lifecycle"],
            ["Testing", "Jest + Supertest", "107 tests: auth, IDOR, RBAC, workflow e2e"],
            ["CI/CD", "GitHub Actions", "Lint, test, build on every push"],
            ["Deploy", "Docker + Caddy + Vercel", "Containerized backend, static frontend on Vercel"],
        ],
        col_widths=[1.2*inch, 1.8*inch, 4*inch]
    ))

    story.append(PageBreak())

    # ─── 3. FEATURE INVENTORY ──────────────────────
    story.append(Paragraph("3. Feature Inventory", styles["SectionTitle"]))

    story.append(Paragraph("Investor Portal", styles["SubSection"]))
    story.append(make_table(
        ["Feature", "Status", "Details"],
        [
            ["Dashboard / Overview", "Complete", "KPI strip, action center, project cards, recent activity, charts"],
            ["Portfolio View", "Complete", "Project list with metrics, detail view with construction updates"],
            ["Capital Account", "Complete", "Per-project: contributions, distributions, ending balance, IRR/MOIC"],
            ["Cap Table", "Complete", "Per-project ownership visualization, waterfall structure"],
            ["Documents", "Complete", "Filter by project/category, download with audit trail, signature status"],
            ["Threaded Messaging", "Complete", "Inbox, thread detail, reply, compose to staff, read/unread"],
            ["Distributions", "Complete", "Distribution history, summary metrics, per-project breakdown"],
            ["Profile / Settings", "Complete", "Edit name/email/phone, password change, entity management"],
            ["MFA Setup", "Complete", "TOTP with QR code, backup codes, enable/disable"],
            ["Notification Preferences", "Complete", "Per-category email notification toggles"],
            ["Login History", "Complete", "Device, IP, timestamp of recent logins"],
            ["Financial Modeler", "Complete", "What-if scenario modeling for investments"],
        ],
        col_widths=[1.8*inch, 0.8*inch, 4.4*inch]
    ))

    story.append(Spacer(1, 12))
    story.append(Paragraph("Admin Panel", styles["SubSection"]))
    story.append(make_table(
        ["Feature", "Status", "Details"],
        [
            ["Dashboard", "Complete", "Total investors, projects, AUM, pending actions summary"],
            ["Investor CRM", "Complete", "Profile pages, search/filter, groups, KPI editing, message history"],
            ["Project Management", "Complete", "Create/edit projects, KPI dashboard, waterfall config, updates"],
            ["Document Management", "Complete", "Upload, target to project/group/individual, access audit trail"],
            ["Messaging Inbox", "Complete", "Thread list, compose with searchable recipient picker, reply"],
            ["Staff Management", "Complete", "Add/edit admin and GP users, role assignment"],
            ["Investor Groups", "Complete", "Create segments, assign members, use in messaging/docs"],
            ["Cash Flow CRUD", "Complete", "Record capital calls/distributions, edit/delete, recalculate IRR"],
            ["Audit Log", "Complete", "All sensitive operations logged with user, action, timestamp"],
            ["Signature Requests", "Complete", "Create requests, track signer status, demo + provider ready"],
        ],
        col_widths=[1.8*inch, 0.8*inch, 4.4*inch]
    ))

    story.append(PageBreak())

    story.append(Paragraph("Prospective Investor Portal", styles["SubSection"]))
    story.append(make_table(
        ["Feature", "Status", "Details"],
        [
            ["Company Landing", "Complete", "Mission, stats, leadership, investment approach"],
            ["Opportunities", "Complete", "Filterable project grid with Northstar images, status badges"],
            ["Project Detail / Deal Page", "Complete", "Metrics, structure, timeline, 'Request Data Room Access' form"],
            ["Interest Capture", "Complete", "Lead form with entity type, accreditation, investment range"],
            ["About Page", "Complete", "Company overview, team, track record"],
        ],
        col_widths=[2*inch, 0.8*inch, 4.2*inch]
    ))

    story.append(Spacer(1, 12))
    story.append(Paragraph("Infrastructure &amp; DevOps", styles["SubSection"]))
    story.append(make_table(
        ["Feature", "Status", "Details"],
        [
            ["JWT Authentication", "Complete", "Login, token refresh, password change, forgot/reset flow"],
            ["MFA / Two-Factor", "Complete", "TOTP setup, QR code, backup codes, login verification"],
            ["Account Lockout", "Complete", "5 failed attempts locks for 15 minutes"],
            ["Input Validation", "Complete", "Zod schemas on all critical routes"],
            ["IDOR Protection", "Complete", "All investor-scoped endpoints enforce req.user.id"],
            ["Rate Limiting", "Complete", "Per-IP on auth routes, configurable"],
            ["CORS", "Complete", "Environment-driven allowed origins"],
            ["Audit Logging", "Complete", "All sensitive operations logged to database"],
            ["Docker Deployment", "Complete", "Dockerfile + docker-compose + Caddy reverse proxy"],
            ["CI/CD Pipeline", "Complete", "GitHub Actions: lint, test, build"],
            ["Bundle Splitting", "Complete", "Lazy loading, vendor chunks, 151KB initial load"],
            ["Error Tracking", "Ready", "Sentry DSN config, middleware wired, needs API key"],
        ],
        col_widths=[1.8*inch, 0.8*inch, 4.4*inch]
    ))

    story.append(PageBreak())

    # ─── 4. SECURITY ──────────────────────────────
    story.append(Paragraph("4. Security &amp; Access Control", styles["SectionTitle"]))

    story.append(Paragraph("Authentication", styles["SubSection"]))
    security_auth = [
        "JWT tokens with configurable expiration (default 24h)",
        "bcrypt password hashing (10 rounds)",
        "TOTP-based MFA with QR code enrollment and backup codes",
        "Account lockout after 5 failed login attempts (15-minute cooldown)",
        "Login history tracking (IP, user agent, timestamp)",
        "Password strength validation (min 8 chars, upper, lower, number, special)",
        "JWT secret hard-fails in production if not set (no fallback)",
    ]
    for item in security_auth:
        story.append(Paragraph(f"<bullet>&bull;</bullet> {item}", styles["BulletItem"]))

    story.append(Paragraph("Authorization (RBAC)", styles["SubSection"]))
    story.append(make_table(
        ["Resource", "INVESTOR", "ADMIN/GP", "Unauthenticated"],
        [
            ["Own profile", "Read/Edit", "Read/Edit all", "Denied"],
            ["Other investor profiles", "Denied (403)", "Read/Edit", "Denied"],
            ["Own project data", "Read", "Read/Edit", "Denied"],
            ["Other investor's project data", "Denied (403)", "Read/Edit", "Denied"],
            ["Documents (own projects)", "Read/Download", "Full CRUD", "Denied"],
            ["Documents (other projects)", "Denied", "Full CRUD", "Denied"],
            ["Threads (own)", "Read/Reply", "Read/Reply/Create", "Denied"],
            ["Threads (others' private)", "Denied (403)", "Read/Reply", "Denied"],
            ["Cash flows", "Read own", "Full CRUD", "Denied"],
            ["Signature requests", "Sign own", "Create/Manage", "Denied"],
            ["Admin panel", "Denied", "Full access", "Denied"],
        ],
        col_widths=[2*inch, 1.3*inch, 1.5*inch, 1.5*inch]
    ))

    story.append(Spacer(1, 12))
    story.append(Paragraph("IDOR Protection", styles["SubSection"]))
    story.append(Paragraph(
        "All investor-scoped endpoints enforce ownership verification. Investors cannot access other investors' data "
        "by manipulating URL parameters or query strings. Verified with dedicated IDOR test suites covering threads, "
        "documents, investor profiles, and finance routes.",
        styles["Body"]
    ))

    story.append(PageBreak())

    # ─── 5. TESTING ────────────────────────────────
    story.append(Paragraph("5. Testing Coverage", styles["SectionTitle"]))

    story.append(make_table(
        ["Test Suite", "Tests", "Coverage Area"],
        [
            ["auth.test.js", "7", "Login, token validation, password change"],
            ["auth-roles.test.js", "6", "Role guards (admin vs investor vs unauthenticated)"],
            ["idor-threads.test.js", "10", "Thread access control across users"],
            ["idor-documents.test.js", "8", "Document access scoping per investor"],
            ["idor-investors.test.js", "8", "Investor profile access control"],
            ["idor-finance.test.js", "12", "Finance data isolation (capital accounts, cash flows)"],
            ["workflow-auth.test.js", "11", "Full login -> profile -> password change -> re-login lifecycle"],
            ["workflow-threads.test.js", "15", "Thread create -> reply -> IDOR block -> mark read -> broadcast"],
            ["workflow-documents.test.js", "8", "Doc scoping, cross-investor isolation, signature requests"],
            ["workflow-projects.test.js", "15", "Project access, finance IDOR, cash flow CRUD permissions"],
            ["provider tests", "7", "SendGrid/Resend/DocuSign/HelloSign graceful fallbacks"],
            ["TOTAL", "107", "All passing"],
        ],
        col_widths=[2.2*inch, 0.6*inch, 4.2*inch]
    ))

    story.append(Spacer(1, 12))
    story.append(Paragraph("Test Categories", styles["SubSection"]))
    test_cats = [
        "Unit tests: Auth guards, role checks, token validation",
        "IDOR regression: Every investor endpoint tested for cross-user access",
        "Workflow/integration: End-to-end flows covering complete user journeys",
        "Provider fallback: External service adapters fail gracefully when unconfigured",
    ]
    for t in test_cats:
        story.append(Paragraph(f"<bullet>&bull;</bullet> {t}", styles["BulletItem"]))

    story.append(PageBreak())

    # ─── 6. PRODUCTION READINESS ──────────────────
    story.append(Paragraph("6. Production Readiness Assessment", styles["SectionTitle"]))

    story.append(make_table(
        ["Category", "Status", "Score", "Notes"],
        [
            ["Core Features", "Complete", "95%", "All investor + admin + prospect features built"],
            ["Authentication", "Complete", "90%", "JWT + MFA + lockout. Missing: IP allowlisting"],
            ["Database", "Ready", "85%", "Schema complete, PostgreSQL ready. Need backup scripts"],
            ["API Security", "Strong", "85%", "107 tests, IDOR patched, audit logging. Need pen test"],
            ["Integrations", "Stubbed", "40%", "Adapters wired but untested with real API keys"],
            ["Deployment", "Ready", "75%", "Docker + CI/CD. Need monitoring/alerting"],
            ["Input Validation", "Good", "70%", "Zod on critical routes. Need broader coverage"],
            ["Email System", "Scaffolded", "50%", "Templates built, no real emails sent yet"],
            ["E-Signatures", "Demo", "35%", "Lifecycle works in demo. Need real provider testing"],
            ["Observability", "Basic", "25%", "Console logging only. Need Sentry + structured logs"],
            ["Performance", "Improved", "70%", "Bundle split done. Need CDN + API caching"],
        ],
        col_widths=[1.5*inch, 0.8*inch, 0.6*inch, 4.1*inch]
    ))

    story.append(Spacer(1, 16))
    story.append(Paragraph("Readiness by Launch Type", styles["SubSection"]))

    readiness_data = [
        [Paragraph("<b>Internal Pilot</b><br/>(5-10 known investors)", styles["TableCell"]),
         Paragraph("<b>~85%</b>", styles["StatusDone"]),
         Paragraph("Need: real SendGrid API key, SSL cert, basic monitoring. ~1 week.", styles["TableCell"])],
        [Paragraph("<b>Soft Launch</b><br/>(public portal, real capital)", styles["TableCell"]),
         Paragraph("<b>~65%</b>", styles["StatusPending"]),
         Paragraph("Need: real integrations tested, compliance review, pen test, monitoring stack, backup strategy. ~4-6 weeks.", styles["TableCell"])],
        [Paragraph("<b>Enterprise / SaaS Parity</b><br/>(match Juniper Square)", styles["TableCell"]),
         Paragraph("<b>~40%</b>", styles["TableCellGray"]),
         Paragraph("Need: KYC/AML, automated distributions, multi-entity accounting, investor onboarding flow, mobile app. ~3-6 months.", styles["TableCell"])],
    ]
    readiness_table = Table(readiness_data, colWidths=[2*inch, 0.7*inch, 4.3*inch])
    readiness_table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#DDDDDD")),
        ("BACKGROUND", (0, 0), (-1, -1), white),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [white, LIGHT_GRAY]),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(readiness_table)

    story.append(PageBreak())

    # ─── 7. REMAINING WORK ─────────────────────────
    story.append(Paragraph("7. Remaining Work &amp; Recommendations", styles["SectionTitle"]))

    story.append(Paragraph("Immediate (Soft Launch Blockers)", styles["SubSection"]))
    story.append(make_table(
        ["Task", "Effort", "Impact"],
        [
            ["Connect SendGrid with real API key", "1 hour", "Emails actually send to investors"],
            ["SSL via Caddy reverse proxy", "2 hours", "HTTPS required for any real use"],
            ["Sentry error tracking (add DSN)", "1 hour", "Know when things break in production"],
            ["Test DocuSign with sandbox API key", "Half day", "Verify signature flow end-to-end"],
            ["PostgreSQL setup for production", "Half day", "Concurrent user support"],
            ["Database backup/restore scripts", "Half day", "Data safety for production"],
        ],
        col_widths=[2.5*inch, 1*inch, 3.5*inch]
    ))

    story.append(Spacer(1, 12))
    story.append(Paragraph("Post-MVP Phases (Prioritized)", styles["SubSection"]))
    story.append(make_table(
        ["Phase", "Focus", "Key Items", "Est. Effort"],
        [
            ["A", "Prospect Funnel", "Accreditation/KYC, subscription workflow, data rooms", "4-6 weeks"],
            ["B", "Advanced Docs", "K-1 bulk upload, watermarked viewing, PDF generation", "2-3 weeks"],
            ["C", "Financial Automation", "Payment rails (ACH/wire), tax withholding", "3-4 weeks"],
            ["D", "Integrations", "Read receipts, Slack/Teams, accounting (QB/Xero)", "2-3 weeks"],
            ["E", "Production Polish", "Table sorting/search, CSV export, white-label branding", "2-3 weeks"],
        ],
        col_widths=[0.6*inch, 1.4*inch, 3.2*inch, 1.2*inch]
    ))

    story.append(PageBreak())

    # ─── 8. TECH STACK PRICING ─────────────────────
    story.append(Paragraph("8. Tech Stack Pricing &amp; Recommendations", styles["SectionTitle"]))

    story.append(Paragraph("Required Services", styles["SubSection"]))
    story.append(make_table(
        ["Service", "Provider", "Free Tier", "Paid Tier", "Recommendation"],
        [
            ["Hosting (frontend)", "Vercel", "100GB/mo bandwidth", "$20/mo Pro", "Free tier sufficient initially"],
            ["Hosting (API)", "Railway / Fly.io", "$5/mo credit", "$5-20/mo", "Railway for simplicity"],
            ["Database", "Supabase / Neon", "500MB free", "$25/mo", "Supabase (storage included)"],
            ["Email", "SendGrid", "100/day free", "$15/mo (50K)", "SendGrid for reliability"],
            ["E-Signatures", "DocuSign", "5 free envelopes", "$10-25/mo", "DocuSign (industry standard)"],
            ["Error Tracking", "Sentry", "5K events/mo", "$26/mo", "Free tier sufficient"],
            ["File Storage", "S3 / R2", "10GB free (R2)", "$0.015/GB", "Cloudflare R2 (no egress fees)"],
            ["SSL", "Caddy / Let's Encrypt", "Free", "Free", "Automatic with Caddy"],
            ["MFA", "Built-in TOTP", "Free", "Free", "No external service needed"],
        ],
        col_widths=[1.2*inch, 1.2*inch, 1.2*inch, 1.2*inch, 2.2*inch]
    ))

    story.append(Spacer(1, 12))
    story.append(Paragraph("Estimated Monthly Cost", styles["SubSection"]))

    cost_data = [
        [Paragraph("<b>Scenario</b>", styles["TableHeader"]),
         Paragraph("<b>Monthly Cost</b>", styles["TableHeader"]),
         Paragraph("<b>What You Get</b>", styles["TableHeader"])],
        [Paragraph("Internal pilot (free tiers)", styles["TableCell"]),
         Paragraph("<b>$0-5/mo</b>", styles["StatusDone"]),
         Paragraph("Vercel free + Railway $5 credit + Supabase free + SendGrid free", styles["TableCell"])],
        [Paragraph("Soft launch (10-50 investors)", styles["TableCell"]),
         Paragraph("<b>$50-75/mo</b>", styles["StatusPending"]),
         Paragraph("Vercel Pro + Railway + Supabase + SendGrid + DocuSign + Sentry", styles["TableCell"])],
        [Paragraph("Growth (100+ investors)", styles["TableCell"]),
         Paragraph("<b>$150-250/mo</b>", styles["TableCellGray"]),
         Paragraph("Scaled hosting + dedicated DB + higher email volume + monitoring", styles["TableCell"])],
    ]
    cost_table = Table(cost_data, colWidths=[2.2*inch, 1.3*inch, 3.5*inch])
    cost_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), RED),
        ("TEXTCOLOR", (0, 0), (-1, 0), white),
        ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#DDDDDD")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [white, LIGHT_GRAY]),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(cost_table)

    story.append(Spacer(1, 12))
    story.append(Paragraph(
        "Compared to SaaS alternatives: Juniper Square charges $15K-50K/year. InvestNext charges $500-2,000/mo. "
        "Agora charges $1,000-3,000/mo. The custom portal approach costs 95% less at current scale while providing "
        "full data ownership and brand control.",
        styles["Body"]
    ))

    story.append(PageBreak())

    # ─── 9. COMPETITIVE POSITIONING ────────────────
    story.append(Paragraph("9. Competitive Positioning", styles["SectionTitle"]))

    story.append(make_table(
        ["Feature", "Northstar Portal", "Juniper Square", "InvestNext", "Agora"],
        [
            ["Investor Dashboard", "Yes", "Yes", "Yes", "Yes"],
            ["Capital Accounts", "Yes", "Yes", "Yes", "Yes"],
            ["Threaded Messaging", "Yes", "Yes", "Limited", "Yes"],
            ["Document Management", "Yes", "Yes", "Yes", "Yes"],
            ["E-Signatures", "Demo + adapter", "DocuSign built-in", "HelloSign", "DocuSign"],
            ["Financial Modeling", "Yes (XIRR/MOIC)", "Yes", "Yes", "Yes"],
            ["Admin CRM", "Yes", "Yes", "Yes", "Limited"],
            ["Prospect Portal", "Yes", "Yes", "Yes", "Yes"],
            ["KYC/AML", "Not yet", "Yes", "Yes", "Yes"],
            ["Payment Processing", "Not yet", "Yes", "Yes", "Yes"],
            ["Mobile App", "Responsive web", "iOS/Android", "Responsive", "iOS/Android"],
            ["Pricing", "$0-75/mo", "$15K-50K/yr", "$500-2K/mo", "$1K-3K/mo"],
            ["Data Ownership", "Full", "Vendor-held", "Vendor-held", "Vendor-held"],
            ["Custom Branding", "Full control", "Limited", "Limited", "Limited"],
        ],
        col_widths=[1.6*inch, 1.4*inch, 1.3*inch, 1.3*inch, 1.1*inch]
    ))

    story.append(Spacer(1, 16))
    story.append(Paragraph("Advantages of Custom Portal", styles["SubSection"]))
    advantages = [
        "Full data ownership — investor data stays on your infrastructure",
        "No per-investor SaaS fees — costs don't scale linearly with LP count",
        "Complete brand control — matches northstardevelopment.ca exactly",
        "Custom business logic — waterfall calculations, reporting specific to Northstar's deal structure",
        "No vendor lock-in — can migrate hosting, add features, integrate any service",
    ]
    for a in advantages:
        story.append(Paragraph(f"<bullet>&bull;</bullet> {a}", styles["BulletItem"]))

    story.append(Spacer(1, 12))
    story.append(Paragraph("Tradeoffs", styles["SubSection"]))
    tradeoffs = [
        "Development and maintenance cost (engineering time vs. subscription)",
        "Missing KYC/AML and payment processing (requires integration work)",
        "No native mobile apps (responsive web covers most use cases)",
        "Single-developer dependency for ongoing maintenance",
    ]
    for t in tradeoffs:
        story.append(Paragraph(f"<bullet>&bull;</bullet> {t}", styles["BulletItem"]))

    # Footer
    story.append(Spacer(1, 0.5*inch))
    story.append(HRFlowable(width="100%", thickness=1, color=HexColor("#E2DFD8"), spaceAfter=8))
    story.append(Paragraph("Northstar Pacific Development Group — Investor Portal MVP Summary v2.0 — Confidential", styles["Footer"]))

    doc.build(story)
    print("PDF generated: Northstar-Investor-Portal-MVP-Summary-v2.pdf")

if __name__ == "__main__":
    build_pdf()
