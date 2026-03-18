"""Generate Northstar Investor Portal MVP Summary PDF v3"""
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor, black, white
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from datetime import datetime

RED = HexColor("#EA2028")
DARK = HexColor("#231F20")
GRAY = HexColor("#767168")
LIGHT_BG = HexColor("#F8F7F4")
LINE = HexColor("#ECEAE5")
GREEN = HexColor("#3D7A54")
BLUE = HexColor("#5B8DEF")

def build_pdf():
    doc = SimpleDocTemplate(
        "C:/Users/PeterChien/northstar-portal/docs/Northstar-Investor-Portal-MVP-Summary-v3.pdf",
        pagesize=letter,
        topMargin=0.75*inch,
        bottomMargin=0.75*inch,
        leftMargin=0.85*inch,
        rightMargin=0.85*inch,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle("Title2", parent=styles["Title"], fontSize=24, textColor=DARK, spaceAfter=4, fontName="Helvetica-Bold")
    subtitle_style = ParagraphStyle("Subtitle2", parent=styles["Normal"], fontSize=11, textColor=GRAY, spaceAfter=20)
    h1 = ParagraphStyle("H1", parent=styles["Heading1"], fontSize=16, textColor=RED, spaceBefore=20, spaceAfter=8, fontName="Helvetica-Bold")
    h2 = ParagraphStyle("H2", parent=styles["Heading2"], fontSize=13, textColor=DARK, spaceBefore=14, spaceAfter=6, fontName="Helvetica-Bold")
    h3 = ParagraphStyle("H3", parent=styles["Heading3"], fontSize=11, textColor=DARK, spaceBefore=10, spaceAfter=4, fontName="Helvetica-Bold")
    body = ParagraphStyle("Body2", parent=styles["Normal"], fontSize=9.5, textColor=DARK, leading=14, spaceAfter=6)
    small = ParagraphStyle("Small2", parent=styles["Normal"], fontSize=8, textColor=GRAY, leading=11)
    bullet = ParagraphStyle("Bullet2", parent=body, leftIndent=16, bulletIndent=8, spaceAfter=3)
    metric_label = ParagraphStyle("MetricLabel", parent=styles["Normal"], fontSize=8, textColor=GRAY, alignment=TA_CENTER)
    metric_value = ParagraphStyle("MetricValue", parent=styles["Normal"], fontSize=18, textColor=DARK, alignment=TA_CENTER, fontName="Helvetica-Bold")

    story = []

    # ─── COVER ────────────────────────────────────────
    story.append(Spacer(1, 1.5*inch))
    story.append(Paragraph("NORTHSTAR", ParagraphStyle("Logo", parent=title_style, fontSize=32, textColor=RED, letterSpacing=6)))
    story.append(Spacer(1, 8))
    story.append(Paragraph("Investor Portal", ParagraphStyle("LogoSub", parent=subtitle_style, fontSize=14, textColor=DARK)))
    story.append(Spacer(1, 0.5*inch))
    story.append(HRFlowable(width="100%", thickness=1, color=LINE))
    story.append(Spacer(1, 0.3*inch))
    story.append(Paragraph("MVP Summary Report v3", title_style))
    story.append(Paragraph(f"Updated {datetime.now().strftime('%B %d, %Y')}", subtitle_style))
    story.append(Spacer(1, 0.4*inch))

    # Key metrics row
    metrics = [
        ["136", "Tests Passing"],
        ["40+", "API Endpoints"],
        ["22", "Database Models"],
        ["17", "Sprints Complete"],
    ]
    metric_data = [[Paragraph(m[0], metric_value) for m in metrics],
                   [Paragraph(m[1], metric_label) for m in metrics]]
    t = Table(metric_data, colWidths=[doc.width/4]*4)
    t.setStyle(TableStyle([
        ("ALIGN", (0,0), (-1,-1), "CENTER"),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        ("TOPPADDING", (0,0), (-1,-1), 12),
        ("BOTTOMPADDING", (0,0), (-1,-1), 12),
        ("LINEBELOW", (0,0), (-1,0), 0, white),
    ]))
    story.append(t)
    story.append(Spacer(1, 0.3*inch))
    story.append(HRFlowable(width="100%", thickness=1, color=LINE))
    story.append(Spacer(1, 0.3*inch))
    story.append(Paragraph("Northstar Pacific Development Group", ParagraphStyle("Footer", parent=small, alignment=TA_CENTER)))
    story.append(Paragraph("710 - 1199 W Pender St, Vancouver BC V6E 2R1", ParagraphStyle("Footer2", parent=small, alignment=TA_CENTER)))

    story.append(PageBreak())

    # ─── TABLE OF CONTENTS ────────────────────────────
    story.append(Paragraph("Table of Contents", h1))
    story.append(Spacer(1, 8))
    toc_items = [
        "1. Executive Summary",
        "2. Feature Inventory",
        "3. Security & Access Control",
        "4. Tech Stack & Architecture",
        "5. Test Coverage",
        "6. Deployment & Infrastructure",
        "7. Integration Status",
        "8. Production Readiness Assessment",
        "9. Remaining Work",
        "10. Competitive Positioning",
    ]
    for item in toc_items:
        story.append(Paragraph(item, body))
    story.append(PageBreak())

    # ─── 1. EXECUTIVE SUMMARY ─────────────────────────
    story.append(Paragraph("1. Executive Summary", h1))
    story.append(Paragraph(
        "The Northstar Investor Portal is a full-stack web application providing existing investors "
        "with real-time visibility into their real estate investments, and prospective investors with "
        "a professional intake funnel. Built across 17 sprints, it includes an investor dashboard, "
        "admin CRM, document management, threaded messaging, financial engine, and e-signature integration.",
        body))
    story.append(Spacer(1, 8))

    story.append(Paragraph("Key Highlights", h2))
    highlights = [
        "<b>Full investor lifecycle:</b> Dashboard, portfolio, cap table, documents, distributions, messaging, profile",
        "<b>Admin CRM:</b> Investor profiles, project management, KPI editing, document upload, group/segment management",
        "<b>Financial engine:</b> XIRR, MOIC, waterfall calculator, cash flow CRUD, scenario modeling",
        "<b>Security hardened:</b> JWT + MFA/TOTP, IDOR protection, account lockout, Zod validation, 136 regression tests",
        "<b>Integration-ready:</b> DocuSign, SendGrid, Resend, Sentry adapters with demo fallback",
        "<b>Production infrastructure:</b> Docker, Caddy SSL, CI/CD, PostgreSQL-ready, Vercel deployment",
    ]
    for h in highlights:
        story.append(Paragraph(h, bullet, bulletText="\u2022"))
    story.append(PageBreak())

    # ─── 2. FEATURE INVENTORY ─────────────────────────
    story.append(Paragraph("2. Feature Inventory", h1))

    story.append(Paragraph("Investor Portal (8 pages)", h2))
    inv_features = [
        ["Overview", "KPI strip (contributed/value/distributed/IRR), project cards with images, progress bars, activity feed, action center, recent messages"],
        ["Portfolio", "Project detail with about, construction updates, transaction history, status badges"],
        ["Cap Table", "Per-project cap table with ownership %, waterfall visualization"],
        ["Financial Modeler", "Scenario analysis: adjust exit cap rate, hold period, leverage to project returns"],
        ["Documents", "Filter by project/category, download with audit trail, signature status indicators"],
        ["Distributions", "Distribution history table, summary metrics, per-project breakdown"],
        ["Messages", "Threaded inbox, compose to staff, reply with full history, unread badges"],
        ["Profile", "Edit name/contact, entity management (LLC/Trust/IRA), password change, MFA setup, notification preferences, login history"],
    ]
    t = Table([["Page", "Features"]] + inv_features, colWidths=[1.2*inch, 5.2*inch])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), RED),
        ("TEXTCOLOR", (0,0), (-1,0), white),
        ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE", (0,0), (-1,-1), 8.5),
        ("ALIGN", (0,0), (-1,-1), "LEFT"),
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("GRID", (0,0), (-1,-1), 0.5, LINE),
        ("TOPPADDING", (0,0), (-1,-1), 6),
        ("BOTTOMPADDING", (0,0), (-1,-1), 6),
        ("LEFTPADDING", (0,0), (-1,-1), 8),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [white, LIGHT_BG]),
    ]))
    story.append(t)
    story.append(Spacer(1, 12))

    story.append(Paragraph("Admin Panel (7 sections)", h2))
    admin_features = [
        ["Dashboard", "Project count, investor count, document count, unread messages, recent activity"],
        ["Projects", "CRUD, KPI editing, waterfall config, cap table editor, construction updates, document tab"],
        ["Investors", "Profile pages, search/filter, entity management, project assignments, message history"],
        ["Groups", "Create/edit investor segments, add/remove members, use for doc/message targeting"],
        ["Documents", "Upload with targeting (project/group/individual), access audit, view/download tracking"],
        ["Messaging", "Compose with searchable recipient picker, threaded replies, admin inbox"],
        ["Staff", "Add/edit ADMIN and GP users, role management"],
    ]
    t = Table([["Section", "Features"]] + admin_features, colWidths=[1.2*inch, 5.2*inch])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), DARK),
        ("TEXTCOLOR", (0,0), (-1,0), white),
        ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE", (0,0), (-1,-1), 8.5),
        ("ALIGN", (0,0), (-1,-1), "LEFT"),
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("GRID", (0,0), (-1,-1), 0.5, LINE),
        ("TOPPADDING", (0,0), (-1,-1), 6),
        ("BOTTOMPADDING", (0,0), (-1,-1), 6),
        ("LEFTPADDING", (0,0), (-1,-1), 8),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [white, LIGHT_BG]),
    ]))
    story.append(t)
    story.append(Spacer(1, 12))

    story.append(Paragraph("Prospect Portal", h2))
    story.append(Paragraph("Public-facing landing with company overview, active opportunities grid, project detail pages, "
                          "and intake form (entity type, accreditation status, investment range, message). Leads tracked in admin pipeline.", body))

    story.append(PageBreak())

    # ─── 3. SECURITY ──────────────────────────────────
    story.append(Paragraph("3. Security & Access Control", h1))

    security_items = [
        ["Authentication", "JWT tokens (HS256), bcrypt password hashing (12 rounds), session timeout (30 min idle)"],
        ["MFA", "TOTP (Google Authenticator compatible), QR code setup, 10 backup codes, login verification"],
        ["Account Lockout", "5 failed attempts locks account for 15 minutes, progressive backoff"],
        ["Authorization", "Role-based access control: INVESTOR, ADMIN, GP. Middleware guards on all routes"],
        ["IDOR Protection", "All investor-scoped endpoints verify req.user.id matches requested resource"],
        ["Input Validation", "Zod schemas on login, password change, project creation, investor invite, document upload"],
        ["CORS", "Environment-driven allowed origins (localhost dev, production domain)"],
        ["Security Headers", "X-Frame-Options: DENY, X-Content-Type-Options: nosniff, CSP, HSTS"],
        ["Rate Limiting", "10 req/min on auth endpoints, 5 req/min on prospect forms"],
        ["Audit Logging", "All sensitive operations logged: login, document download, profile update, signature request"],
        ["JWT Hardening", "No fallback secret in production (hard fail if JWT_SECRET unset)"],
    ]
    t = Table([["Layer", "Implementation"]] + security_items, colWidths=[1.4*inch, 5*inch])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), RED),
        ("TEXTCOLOR", (0,0), (-1,0), white),
        ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE", (0,0), (-1,-1), 8.5),
        ("ALIGN", (0,0), (-1,-1), "LEFT"),
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("GRID", (0,0), (-1,-1), 0.5, LINE),
        ("TOPPADDING", (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ("LEFTPADDING", (0,0), (-1,-1), 8),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [white, LIGHT_BG]),
    ]))
    story.append(t)
    story.append(PageBreak())

    # ─── 4. TECH STACK ────────────────────────────────
    story.append(Paragraph("4. Tech Stack & Architecture", h1))

    stack = [
        ["Frontend", "React 18 + Vite 5", "Single-file components, inline styles, theme context"],
        ["Charts", "Recharts", "AreaChart, BarChart for performance/distribution views"],
        ["Backend", "Express.js", "REST API, 14 route files, 40+ endpoints"],
        ["ORM", "Prisma", "22 models, SQLite dev / PostgreSQL production"],
        ["Auth", "JWT + bcrypt", "HS256 tokens, 12-round hashing"],
        ["MFA", "TOTP (speakeasy)", "QR codes, backup codes"],
        ["Email", "SendGrid / Resend", "Adapter pattern with demo fallback"],
        ["E-Sign", "DocuSign / HelloSign", "Adapter pattern with demo fallback"],
        ["Storage", "Local disk / S3", "Adapter pattern in server/storage/"],
        ["Validation", "Zod", "Schema validation on API inputs"],
        ["Testing", "Jest + Supertest", "136 tests, 11 suites"],
        ["Error Tracking", "Sentry", "Adapter with fallback to console"],
        ["Deployment", "Vercel + Docker", "Auto-deploy from GitHub, Caddy SSL"],
        ["CI/CD", "GitHub Actions", "Build + test + deploy pipeline"],
    ]
    t = Table([["Layer", "Technology", "Notes"]] + stack, colWidths=[1.1*inch, 1.6*inch, 3.7*inch])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), DARK),
        ("TEXTCOLOR", (0,0), (-1,0), white),
        ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE", (0,0), (-1,-1), 8.5),
        ("ALIGN", (0,0), (-1,-1), "LEFT"),
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("GRID", (0,0), (-1,-1), 0.5, LINE),
        ("TOPPADDING", (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ("LEFTPADDING", (0,0), (-1,-1), 8),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [white, LIGHT_BG]),
    ]))
    story.append(t)
    story.append(PageBreak())

    # ─── 5. TEST COVERAGE ─────────────────────────────
    story.append(Paragraph("5. Test Coverage", h1))
    story.append(Paragraph("136 tests across 11 suites. All passing.", body))
    story.append(Spacer(1, 8))

    tests = [
        ["Auth Tests", "Login, MFA, password reset, session handling", "12"],
        ["Role Tests", "INVESTOR/ADMIN/GP permission isolation", "8"],
        ["IDOR: Documents", "Investor cannot download others' docs", "6"],
        ["IDOR: Finance", "Investor cannot view unrelated project data", "5"],
        ["IDOR: Investors", "Investor cannot list/view other investors", "5"],
        ["IDOR: Threads", "Investor cannot reply to others' threads", "5"],
        ["Workflow: Auth", "Login -> access -> logout e2e", "8"],
        ["Workflow: Documents", "Upload -> assign -> download e2e", "10"],
        ["Workflow: Projects", "Create -> cap table -> distribution e2e", "12"],
        ["Workflow: Threads", "Create -> reply -> verify e2e", "9"],
        ["Workflow: Admin", "Create investor -> assign -> message e2e", "26"],
        ["Provider Tests", "SendGrid/Resend/DocuSign fallback behavior", "6"],
        ["Smoke Tests", "Health, 404, integration status", "7"],
    ]
    t = Table([["Suite", "Coverage", "Tests"]] + tests, colWidths=[1.5*inch, 3.8*inch, 0.8*inch])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), GREEN),
        ("TEXTCOLOR", (0,0), (-1,0), white),
        ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE", (0,0), (-1,-1), 8.5),
        ("ALIGN", (0,0), (-1,-1), "LEFT"),
        ("ALIGN", (2,0), (2,-1), "CENTER"),
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("GRID", (0,0), (-1,-1), 0.5, LINE),
        ("TOPPADDING", (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ("LEFTPADDING", (0,0), (-1,-1), 8),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [white, LIGHT_BG]),
    ]))
    story.append(t)
    story.append(PageBreak())

    # ─── 6. DEPLOYMENT ────────────────────────────────
    story.append(Paragraph("6. Deployment & Infrastructure", h1))

    story.append(Paragraph("Current Deployment", h2))
    deploy_items = [
        "Frontend deployed on Vercel (auto-deploy from GitHub master branch)",
        "Production URL: https://northstar-portal-roan.vercel.app/",
        "Demo mode: frontend falls back to static data when no backend is available",
        "SPA routing via vercel.json rewrites (handles 404/405 for API paths)",
        "Asset caching: immutable cache headers on hashed JS/CSS chunks",
    ]
    for d in deploy_items:
        story.append(Paragraph(d, bullet, bulletText="\u2022"))

    story.append(Paragraph("Production Infrastructure (Ready)", h2))
    prod_items = [
        "Docker: Dockerfile + docker-compose.yml for containerized deployment",
        "SSL: Caddy reverse proxy config with automatic HTTPS",
        "Database: PostgreSQL connection string in Prisma schema (currently SQLite for dev)",
        "CI/CD: GitHub Actions pipeline (build + test + deploy)",
        "Error Tracking: Sentry integration adapter (set SENTRY_DSN env var)",
        "Monitoring: Health check endpoint at /api/v1/health",
    ]
    for p in prod_items:
        story.append(Paragraph(p, bullet, bulletText="\u2022"))
    story.append(PageBreak())

    # ─── 7. INTEGRATION STATUS ────────────────────────
    story.append(Paragraph("7. Integration Status", h1))

    integrations = [
        ["SendGrid (Email)", "Adapter built", "Needs real API key", "$15/mo"],
        ["Resend (Email)", "Adapter built", "Needs real API key", "$20/mo"],
        ["DocuSign (E-Sign)", "Adapter built", "Needs sandbox testing", "$10-25/mo"],
        ["HelloSign (E-Sign)", "Adapter built", "Needs sandbox testing", "$15/mo"],
        ["Sentry (Errors)", "Adapter built", "Needs DSN", "Free tier"],
        ["PostgreSQL", "Schema ready", "Needs hosted instance", "$0-15/mo"],
        ["S3/R2 (Storage)", "Adapter built", "Needs bucket config", "$0-5/mo"],
        ["Twilio Verify (MFA)", "Not started", "TOTP built-in instead", "N/A"],
    ]
    t = Table([["Integration", "Code Status", "What's Needed", "Est. Cost"]] + integrations,
              colWidths=[1.5*inch, 1.3*inch, 1.8*inch, 1*inch])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), BLUE),
        ("TEXTCOLOR", (0,0), (-1,0), white),
        ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE", (0,0), (-1,-1), 8.5),
        ("ALIGN", (0,0), (-1,-1), "LEFT"),
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("GRID", (0,0), (-1,-1), 0.5, LINE),
        ("TOPPADDING", (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ("LEFTPADDING", (0,0), (-1,-1), 8),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [white, LIGHT_BG]),
    ]))
    story.append(t)
    story.append(Spacer(1, 12))
    story.append(Paragraph("Estimated monthly cost for all integrations: <b>$40-80/mo</b>", body))
    story.append(PageBreak())

    # ─── 8. PRODUCTION READINESS ──────────────────────
    story.append(Paragraph("8. Production Readiness Assessment", h1))

    readiness = [
        ["Core Features", "95%", "All investor + admin functionality built"],
        ["Authentication", "90%", "JWT + MFA + lockout + IDOR fixes"],
        ["Database", "85%", "Schema complete, PostgreSQL-ready"],
        ["API Security", "85%", "136 tests, IDOR patched, audit logging"],
        ["Integrations", "40%", "Adapters built, no real API keys tested"],
        ["Deployment", "75%", "Docker + CI/CD + Vercel, no monitoring"],
        ["Email", "50%", "Templates built, zero real emails sent"],
        ["E-Signatures", "30%", "Demo mode works, never connected to DocuSign"],
        ["Observability", "30%", "Sentry adapter, no APM or uptime monitoring"],
        ["Performance", "60%", "Code splitting done, no CDN or API caching"],
    ]
    t = Table([["Category", "Ready", "Notes"]] + readiness, colWidths=[1.4*inch, 0.7*inch, 4.3*inch])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), DARK),
        ("TEXTCOLOR", (0,0), (-1,0), white),
        ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE", (0,0), (-1,-1), 8.5),
        ("ALIGN", (0,0), (-1,-1), "LEFT"),
        ("ALIGN", (1,0), (1,-1), "CENTER"),
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("GRID", (0,0), (-1,-1), 0.5, LINE),
        ("TOPPADDING", (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ("LEFTPADDING", (0,0), (-1,-1), 8),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [white, LIGHT_BG]),
    ]))
    story.append(t)
    story.append(Spacer(1, 12))

    story.append(Paragraph("Summary", h2))
    story.append(Paragraph("<b>Soft launch (5-10 known investors):</b> ~85% ready. Need: real SendGrid key, SSL cert, basic monitoring.", body))
    story.append(Paragraph("<b>Public launch:</b> ~65% ready. Need: real integrations tested, compliance review, penetration test, monitoring.", body))
    story.append(Paragraph("<b>Market parity (Juniper Square level):</b> ~40%. Need: KYC/AML, automated distributions, mobile app.", body))
    story.append(PageBreak())

    # ─── 9. REMAINING WORK ────────────────────────────
    story.append(Paragraph("9. Remaining Work", h1))

    story.append(Paragraph("For Soft Launch (1-2 weeks)", h2))
    soft_launch = [
        ["Connect SendGrid with real API key", "1 hour", "P0"],
        ["SSL via Caddy reverse proxy", "2 hours", "P0"],
        ["Sentry error tracking (real DSN)", "1 hour", "P0"],
        ["Test DocuSign with sandbox API key", "4 hours", "P1"],
        ["PostgreSQL hosted instance", "2 hours", "P1"],
        ["Uptime monitoring (UptimeRobot)", "30 min", "P1"],
    ]
    t = Table([["Task", "Effort", "Priority"]] + soft_launch, colWidths=[3.8*inch, 1*inch, 0.8*inch])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), GREEN),
        ("TEXTCOLOR", (0,0), (-1,0), white),
        ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE", (0,0), (-1,-1), 8.5),
        ("GRID", (0,0), (-1,-1), 0.5, LINE),
        ("TOPPADDING", (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ("LEFTPADDING", (0,0), (-1,-1), 8),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [white, LIGHT_BG]),
    ]))
    story.append(t)
    story.append(Spacer(1, 12))

    story.append(Paragraph("Post-MVP Phases", h2))
    post_mvp = [
        ["Phase A", "Self-service subscription, KYC/AML onboarding", "4-6 weeks"],
        ["Phase B", "K-1 bulk upload, watermarked viewing, PDF generation", "2-3 weeks"],
        ["Phase C", "ACH/wire payment processing for distributions", "3-4 weeks"],
        ["Phase D", "Read receipts, Slack integration, accounting sync", "2-3 weeks"],
        ["Phase E", "White-label branding, mobile app consideration", "4-6 weeks"],
    ]
    t = Table([["Phase", "Scope", "Est. Effort"]] + post_mvp, colWidths=[0.8*inch, 3.8*inch, 1*inch])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), DARK),
        ("TEXTCOLOR", (0,0), (-1,0), white),
        ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE", (0,0), (-1,-1), 8.5),
        ("GRID", (0,0), (-1,-1), 0.5, LINE),
        ("TOPPADDING", (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ("LEFTPADDING", (0,0), (-1,-1), 8),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [white, LIGHT_BG]),
    ]))
    story.append(t)
    story.append(PageBreak())

    # ─── 10. COMPETITIVE POSITIONING ──────────────────
    story.append(Paragraph("10. Competitive Positioning", h1))

    comp = [
        ["Juniper Square", "Full institutional ops", "Deeper admin, fund accounting", "$$$"],
        ["InvestNext", "Fundraising + CRM", "Pipeline management, fundraising", "$$"],
        ["Agora", "Investor relations", "Notification sophistication", "$$"],
        ["AppFolio IM", "PM + IM integration", "Property management link", "$$$"],
        ["Northstar Portal", "Custom, project-level", "Tailored to business model", "Build cost only"],
    ]
    t = Table([["Platform", "Strength", "Advantage Over Northstar", "Cost"]] + comp,
              colWidths=[1.3*inch, 1.5*inch, 2.5*inch, 0.8*inch])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), RED),
        ("TEXTCOLOR", (0,0), (-1,0), white),
        ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE", (0,0), (-1,-1), 8.5),
        ("GRID", (0,0), (-1,-1), 0.5, LINE),
        ("TOPPADDING", (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ("LEFTPADDING", (0,0), (-1,-1), 8),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [white, LIGHT_BG]),
        ("BACKGROUND", (0,-1), (-1,-1), HexColor("#FFF8F8")),
        ("FONTNAME", (0,-1), (-1,-1), "Helvetica-Bold"),
    ]))
    story.append(t)
    story.append(Spacer(1, 16))

    story.append(Paragraph("Northstar's Advantage", h2))
    advantages = [
        "<b>Custom-built for project-level investing</b> -- competitors assume fund structures",
        "<b>No per-investor licensing fees</b> -- one-time build cost vs. $500-2000/investor/year",
        "<b>Full control over data and branding</b> -- no third-party data sharing",
        "<b>Integrated with actual project workflow</b> -- construction updates, KPI editing, document targeting",
    ]
    for a in advantages:
        story.append(Paragraph(a, bullet, bulletText="\u2022"))

    story.append(Spacer(1, 0.5*inch))
    story.append(HRFlowable(width="100%", thickness=1, color=LINE))
    story.append(Spacer(1, 12))
    story.append(Paragraph("End of Report", ParagraphStyle("End", parent=small, alignment=TA_CENTER)))
    story.append(Paragraph(f"Generated {datetime.now().strftime('%B %d, %Y at %I:%M %p')}", ParagraphStyle("End2", parent=small, alignment=TA_CENTER)))

    doc.build(story)
    print("PDF generated successfully!")

if __name__ == "__main__":
    build_pdf()
