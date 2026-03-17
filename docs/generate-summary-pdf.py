"""
Generate Northstar Investor Portal MVP Summary PDF
"""
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable
)

RED = HexColor("#EA2028")
DARK = HexColor("#231F20")
GRAY = HexColor("#666666")
LIGHT_GRAY = HexColor("#F0EDE8")
GREEN = HexColor("#3D7A54")

def build_pdf():
    doc = SimpleDocTemplate(
        "Northstar-Investor-Portal-MVP-Summary.pdf",
        pagesize=letter,
        topMargin=0.75*inch,
        bottomMargin=0.75*inch,
        leftMargin=0.75*inch,
        rightMargin=0.75*inch,
    )

    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name='Title2', parent=styles['Title'], fontSize=24, textColor=DARK, spaceAfter=6))
    styles.add(ParagraphStyle(name='Subtitle', parent=styles['Normal'], fontSize=12, textColor=GRAY, spaceAfter=20))
    styles.add(ParagraphStyle(name='H1', parent=styles['Heading1'], fontSize=18, textColor=RED, spaceBefore=20, spaceAfter=10))
    styles.add(ParagraphStyle(name='H2', parent=styles['Heading2'], fontSize=14, textColor=DARK, spaceBefore=14, spaceAfter=8))
    styles.add(ParagraphStyle(name='H3', parent=styles['Heading3'], fontSize=12, textColor=DARK, spaceBefore=10, spaceAfter=6))
    styles.add(ParagraphStyle(name='Body', parent=styles['Normal'], fontSize=10, textColor=DARK, spaceAfter=6, leading=14))
    styles.add(ParagraphStyle(name='Small', parent=styles['Normal'], fontSize=8, textColor=GRAY, spaceAfter=4))
    styles.add(ParagraphStyle(name='BulletItem', parent=styles['Normal'], fontSize=10, textColor=DARK, leftIndent=20, spaceAfter=4, leading=13, bulletIndent=10))

    story = []

    # ─── COVER ───
    story.append(Spacer(1, 1.5*inch))
    story.append(Paragraph("NORTHSTAR", ParagraphStyle(name='Brand', parent=styles['Title'], fontSize=36, textColor=RED, spaceAfter=4)))
    story.append(Paragraph("Investor Portal", ParagraphStyle(name='BrandSub', parent=styles['Title'], fontSize=20, textColor=DARK, spaceAfter=4)))
    story.append(Paragraph("MVP Summary, Tech Stack & Roadmap", styles['Subtitle']))
    story.append(Spacer(1, 0.5*inch))
    story.append(HRFlowable(width="100%", thickness=2, color=RED))
    story.append(Spacer(1, 0.3*inch))
    story.append(Paragraph("Prepared for: Northstar Pacific Development Group", styles['Body']))
    story.append(Paragraph("Date: March 17, 2026", styles['Body']))
    story.append(Paragraph("Version: 1.0 (Sprints 1-11)", styles['Body']))
    story.append(PageBreak())

    # ─── TABLE OF CONTENTS ───
    story.append(Paragraph("Table of Contents", styles['H1']))
    toc = [
        "1. Portal Overview & Architecture",
        "2. Investor Portal Features",
        "3. Admin Panel Features",
        "4. Security & Permissions",
        "5. Tech Stack Comparison & Recommendations",
        "6. Pricing Summary",
        "7. Post-MVP Improvements",
        "8. Competitive Comparison",
    ]
    for item in toc:
        story.append(Paragraph(item, styles['Body']))
    story.append(PageBreak())

    # ─── 1. OVERVIEW ───
    story.append(Paragraph("1. Portal Overview & Architecture", styles['H1']))
    story.append(Paragraph("The Northstar Investor Portal is a custom-built platform for managing investor relations across Northstar Pacific Development Group's real estate projects. It provides two interfaces:", styles['Body']))
    story.append(Paragraph("<bullet>&bull;</bullet><b>Investor Portal</b> - LP-facing dashboard for viewing investments, documents, distributions, and messaging", styles['BulletItem']))
    story.append(Paragraph("<bullet>&bull;</bullet><b>Admin Panel</b> - GP/staff interface for managing projects, investors, documents, groups, and communications", styles['BulletItem']))
    story.append(Spacer(1, 10))
    story.append(Paragraph("Architecture", styles['H2']))
    arch_data = [
        ["Layer", "Technology", "Purpose"],
        ["Frontend", "React 18 + Vite 5", "Single-page application with dark/light theme"],
        ["API Server", "Express.js + Node.js", "REST API with JWT authentication"],
        ["ORM", "Prisma 6", "Database access with typed models"],
        ["Database", "SQLite (dev) / PostgreSQL (prod)", "15+ data models"],
        ["File Storage", "Local disk (dev) / S3-compatible (prod)", "Document upload + signed URL download"],
        ["Auth", "JWT + bcrypt", "Role-based access (INVESTOR / ADMIN / GP)"],
        ["Hosting", "Vercel (frontend) + Railway (API)", "Static SPA + Node.js server"],
    ]
    t = Table(arch_data, colWidths=[1.2*inch, 2.2*inch, 3.2*inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), RED),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 0.5, HexColor("#DDD")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_GRAY]),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(t)
    story.append(Spacer(1, 10))
    story.append(Paragraph("<b>Sprint Progress:</b> 10 of 11 MVP sprints complete. Sprints 1-10 are built and tested. Sprint 11 (investor portal enhancements) is planned.", styles['Body']))
    story.append(PageBreak())

    # ─── 2. INVESTOR FEATURES ───
    story.append(Paragraph("2. Investor Portal Features", styles['H1']))

    inv_features = [
        ("Dashboard / Overview", [
            "2 active projects (Porthaven, Livy) with investment metrics",
            "Per-project cards: invested amount, current value, IRR, MOIC, completion %",
            "Value tracking charts (Recharts area charts) trailing 12 months",
            "Recent distributions bar chart",
            "Recent messages preview with unread indicators",
        ]),
        ("Portfolio", [
            "Table view of all investor projects with sortable columns",
            "Click-through to project detail: about, construction updates, metrics",
            "Status badges (Under Construction, Pre-Development, Completed)",
        ]),
        ("Cap Table", [
            "Per-project cap table with LP/GP breakdown",
            "Project selector tabs (Porthaven | Livy)",
            "Ownership percentage bars, committed vs called vs unfunded",
            "Waterfall visualization: Return of Capital, Pref Return, GP Catch-Up, Carry",
        ]),
        ("Documents", [
            "8 documents across 7 categories (Reporting, Tax, Legal, Capital Call, etc.)",
            "Filter by project (All / General / Porthaven / Livy) and category",
            "Status badges: Published, Action Required, Pending Signature",
            "Download via API with signed URLs (tracked in DocumentAssignment)",
            "Sign/Review modals for action-required documents",
        ]),
        ("Distributions", [
            "Quarterly distribution history with amounts and types (Income / Capital Return)",
            "Project attribution column",
            "Summary metrics: total distributed, payment count",
        ]),
        ("Messages (Threaded)", [
            "Thread list with subject, sender, project tag, date, unread dot",
            "Thread detail: chronological messages with sender avatars",
            "Reply with real API persistence (not client-side)",
            "Compose new message (auto-targets Northstar staff only)",
            "Investors CANNOT message other investors",
        ]),
        ("Sprint 11 Planned", [
            "Portfolio summary dashboard: total contributions, distributions, value chart",
            "Capital account statement per project",
            "Self-service profile editing (name, email, entity info)",
            "In-app notification center",
            "Recent activity feed",
        ]),
    ]

    for title, items in inv_features:
        story.append(Paragraph(title, styles['H2']))
        for item in items:
            story.append(Paragraph(f"<bullet>&bull;</bullet>{item}", styles['BulletItem']))

    story.append(PageBreak())

    # ─── 3. ADMIN FEATURES ───
    story.append(Paragraph("3. Admin Panel Features", styles['H1']))

    admin_features = [
        ("Dashboard", [
            "Summary cards: project count, investor count, document count, unread messages",
            "Recent documents list with project attribution",
        ]),
        ("Project Management", [
            "Project list with investor count, doc count, status, completion %",
            "Project detail page with 5 tabs: Overview, Investors, Documents, Updates, Waterfall",
            "Inline editing: status dropdown, completion %, total raise",
            "Per-investor KPI editing within project (committed, called, value, IRR, MOIC)",
            "Cap table view with holder, class, ownership breakdown",
            "Post construction updates with date stamps",
            "Waterfall config editor: pref return %, catch-up %, carry %",
        ]),
        ("Investor CRM", [
            "Searchable investor table: filter by status, project, sort by name/email",
            "Investor profile page: avatar, contact info, groups, project investments, document access, message history",
            "Invite new investors (generates temp password)",
            "Approve pending investors, deactivate accounts",
            "Reset password, edit profile info",
            "Per-investor KPI editing across all their projects",
        ]),
        ("Investor Groups / Segments", [
            "Create groups with name + color coding (e.g., 'Class A LPs', 'Porthaven Investors')",
            "Two-panel UI: group list (left) + member management (right)",
            "Searchable member add/remove",
            "Groups used for messaging targeting and document distribution",
        ]),
        ("Document Management", [
            "Document dashboard: table with name, project, category, investor count, viewed/downloaded stats",
            "Search + filter by project and category",
            "Document detail view with access audit table",
            "Per-investor tracking: viewedAt, downloadedAt, acknowledgedAt timestamps",
            "Upload with targeting: project-scoped, individual, or general",
            "File storage: local disk (dev) with S3/R2 adapter ready for production",
        ]),
        ("Inbox / Messaging", [
            "Thread list with unread badges and filter (All / Unread / From Investors)",
            "Thread detail with chronological messages, investor vs staff styling",
            "Reply inline to any thread",
            "Compose new message with targeting: All Investors / Project / Specific Investors",
            "Searchable recipient picker: Gmail-style search bar + 'Browse all investors' table",
            "Chip tags for selected recipients with X to remove",
        ]),
        ("Staff Management", [
            "List all ADMIN/GP users with role dropdown",
            "Add new staff members with temp password generation",
            "Edit role (Admin / GP), activate/deactivate accounts",
        ]),
    ]

    for title, items in admin_features:
        story.append(Paragraph(title, styles['H2']))
        for item in items:
            story.append(Paragraph(f"<bullet>&bull;</bullet>{item}", styles['BulletItem']))

    story.append(PageBreak())

    # ─── 4. SECURITY ───
    story.append(Paragraph("4. Security & Permissions", styles['H1']))

    story.append(Paragraph("Authentication", styles['H2']))
    auth_items = [
        "JWT (JSON Web Token) with 7-day expiry",
        "Passwords hashed with bcrypt (10 rounds)",
        "Token stored in localStorage, sent via Authorization: Bearer header",
        "Auto-logout on token expiry (401 response clears token)",
        "Session-based auth middleware on all protected routes",
    ]
    for item in auth_items:
        story.append(Paragraph(f"<bullet>&bull;</bullet>{item}", styles['BulletItem']))

    story.append(Paragraph("Role-Based Access Control (RBAC)", styles['H2']))
    rbac_data = [
        ["Role", "Portal Access", "Admin Access", "Can Message", "Can Upload Docs"],
        ["INVESTOR", "Yes - own projects only", "No", "Staff only", "No"],
        ["ADMIN", "No (redirected to admin)", "Full access", "Any investor/group", "Yes"],
        ["GP", "No (redirected to admin)", "Full access", "Any investor/group", "Yes"],
    ]
    t = Table(rbac_data, colWidths=[1*inch, 1.6*inch, 1.2*inch, 1.4*inch, 1.2*inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), RED),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 0.5, HexColor("#DDD")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_GRAY]),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(t)

    story.append(Paragraph("Data Access Controls", styles['H2']))
    access_items = [
        "Investors see ONLY projects they are assigned to (via InvestorProject table)",
        "Documents scoped by: project membership, direct assignment (DocumentAssignment), or general (projectId=null)",
        "Messages filtered by targeting: ALL, PROJECT (membership check), INDIVIDUAL (ThreadRecipient), STAFF",
        "Document downloads tracked per-investor (viewedAt, downloadedAt timestamps)",
        "Admin routes protected by requireRole('ADMIN', 'GP') middleware",
        "File downloads check investor's project membership before serving",
    ]
    for item in access_items:
        story.append(Paragraph(f"<bullet>&bull;</bullet>{item}", styles['BulletItem']))

    story.append(Paragraph("Production Security (Recommended)", styles['H2']))
    prod_sec = [
        "HTTPS everywhere (Caddy/nginx reverse proxy or Vercel/Railway default)",
        "Environment variables for all secrets (JWT_SECRET, DATABASE_URL, S3 credentials)",
        "Rate limiting on auth endpoints (prevent brute force)",
        "CORS restricted to production domain only",
        "Two-factor authentication (post-MVP, Sprint E.5)",
        "Audit logging for compliance (post-MVP, Sprint E.6)",
        "SOC 2 compliance pathway via Supabase Team plan or self-hosted with proper controls",
    ]
    for item in prod_sec:
        story.append(Paragraph(f"<bullet>&bull;</bullet>{item}", styles['BulletItem']))

    story.append(PageBreak())

    # ─── 5. TECH STACK ───
    story.append(Paragraph("5. Tech Stack Comparison & Recommendations", styles['H1']))

    story.append(Paragraph("Hosting / Deployment", styles['H2']))
    hosting_data = [
        ["Service", "What", "Free Tier", "Paid", "Recommendation"],
        ["Vercel", "Frontend hosting", "100GB bandwidth", "$20/user/mo Pro", "Use for frontend (current)"],
        ["Railway", "API + DB hosting", "$5/mo credit", "$5-40/mo usage", "RECOMMENDED for API"],
        ["Render", "API + DB hosting", "750 hrs/mo", "$7-25/mo", "Alternative to Railway"],
        ["Fly.io", "Container hosting", "3 shared VMs free", "$5-30/mo", "Good for Docker"],
        ["AWS (ECS/RDS)", "Full stack", "12-month free tier", "$30-100+/mo", "Overkill for MVP"],
    ]
    t = Table(hosting_data, colWidths=[0.9*inch, 1.1*inch, 1.1*inch, 1.1*inch, 1.8*inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), RED),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 0.5, HexColor("#DDD")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_GRAY]),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t)

    story.append(Paragraph("Database", styles['H2']))
    db_data = [
        ["Service", "Type", "Free Tier", "Paid", "Recommendation"],
        ["Supabase", "Hosted PostgreSQL + Auth + Storage", "500MB, 50K MAU", "$25/mo Pro", "RECOMMENDED"],
        ["Railway Postgres", "Managed PostgreSQL", "Included in credits", "$5-18/mo", "Good alternative"],
        ["PlanetScale", "Serverless MySQL", "5GB free", "$29/mo", "MySQL only"],
        ["Neon", "Serverless PostgreSQL", "0.5GB free", "$19/mo", "Good for serverless"],
        ["Self-hosted", "Docker PostgreSQL", "Free", "Server cost only", "Full control"],
    ]
    t = Table(db_data, colWidths=[1*inch, 1.8*inch, 1.1*inch, 1*inch, 1.5*inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), RED),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 0.5, HexColor("#DDD")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_GRAY]),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t)

    story.append(Paragraph("Email / Notifications", styles['H2']))
    email_data = [
        ["Service", "Free Tier", "Paid", "Best For"],
        ["Resend", "3,000/mo forever", "$20/mo for 50K", "RECOMMENDED - clean API, React Email"],
        ["SendGrid", "100/day for 60 days", "$19.95/mo", "Higher volume, marketing + transactional"],
        ["Postmark", "100/mo", "$15/mo for 10K", "Best deliverability"],
        ["AWS SES", "3,000/mo from EC2", "$0.10/1,000", "Cheapest at scale"],
    ]
    t = Table(email_data, colWidths=[1*inch, 1.3*inch, 1.3*inch, 2.8*inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), RED),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 0.5, HexColor("#DDD")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_GRAY]),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t)

    story.append(Paragraph("E-Signatures", styles['H2']))
    esig_data = [
        ["Service", "API Pricing", "Best For"],
        ["Dropbox Sign (HelloSign)", "$20/mo for 20 envelopes", "RECOMMENDED - simple API, affordable"],
        ["DocuSign", "$50/mo (40 envelopes)", "Industry standard, RE-specific plans"],
        ["PandaDoc", "$19/mo", "Templates + storage + signatures"],
        ["Documenso (open source)", "Free self-hosted", "Full control, no per-envelope fees"],
    ]
    t = Table(esig_data, colWidths=[2*inch, 2*inch, 2.5*inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), RED),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 0.5, HexColor("#DDD")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_GRAY]),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t)

    story.append(PageBreak())

    # ─── 6. PRICING ───
    story.append(Paragraph("6. Pricing Summary", styles['H1']))
    story.append(Paragraph("Recommended MVP Production Stack", styles['H2']))

    pricing_data = [
        ["Service", "Plan", "Monthly Cost", "Annual Cost"],
        ["Vercel", "Pro (1 user)", "$20", "$240"],
        ["Railway", "API + PostgreSQL", "$25-40", "$300-480"],
        ["Resend", "Free tier (3K emails/mo)", "$0", "$0"],
        ["Cloudflare R2", "Document storage (10GB free)", "$0-5", "$0-60"],
        ["Domain + SSL", "Custom domain", "$12/yr", "$12"],
        ["", "", "", ""],
        ["TOTAL (MVP)", "", "$45-65/mo", "$552-792/yr"],
    ]
    t = Table(pricing_data, colWidths=[1.8*inch, 2*inch, 1.3*inch, 1.3*inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), RED),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 0.5, HexColor("#DDD")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -2), [white, LIGHT_GRAY]),
        ('BACKGROUND', (0, -1), (-1, -1), HexColor("#F0EDE8")),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(t)

    story.append(Spacer(1, 15))
    story.append(Paragraph("With Post-MVP Additions", styles['H2']))
    post_pricing = [
        ["Addition", "Service", "Cost"],
        ["E-signatures", "Dropbox Sign API", "$20-100/mo"],
        ["Email notifications", "Resend Pro (if >3K/mo)", "$20/mo"],
        ["Auth upgrade (optional)", "Clerk Pro", "$25/mo"],
        ["Supabase upgrade (if needed)", "Supabase Pro", "$25/mo"],
        ["", "", ""],
        ["TOTAL (Full Production)", "", "$135-275/mo"],
    ]
    t = Table(post_pricing, colWidths=[2*inch, 2.2*inch, 1.8*inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), RED),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 0.5, HexColor("#DDD")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -2), [white, LIGHT_GRAY]),
        ('BACKGROUND', (0, -1), (-1, -1), HexColor("#F0EDE8")),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(t)

    story.append(Spacer(1, 15))
    story.append(Paragraph("<b>vs. SaaS Competitor Pricing:</b>", styles['Body']))
    story.append(Paragraph("<bullet>&bull;</bullet>Juniper Square: $500-2,000+/mo (per-investor fees)", styles['BulletItem']))
    story.append(Paragraph("<bullet>&bull;</bullet>Agora: $500-1,500/mo (platform fees)", styles['BulletItem']))
    story.append(Paragraph("<bullet>&bull;</bullet>InvestNext: $400-1,200/mo (tiered)", styles['BulletItem']))
    story.append(Paragraph("<bullet>&bull;</bullet>CashFlow Portal: $200-800/mo", styles['BulletItem']))
    story.append(Paragraph("<b>Northstar custom portal saves $3,000-20,000+/year</b> vs. SaaS, with full data ownership and brand control.", styles['Body']))

    story.append(PageBreak())

    # ─── 7. IMPROVEMENTS ───
    story.append(Paragraph("7. Post-MVP Improvements (Prioritized)", styles['H1']))

    story.append(Paragraph("Priority 1 - High Impact (Next 3 months)", styles['H2']))
    p1_items = [
        "Email notifications: new documents, messages, distributions, capital calls (Resend integration)",
        "E-signature integration: Dropbox Sign for subscription agreements, capital call acknowledgments",
        "K-1 mass upload with OCR auto-matching to investors (tax season critical)",
        "Capital account tracking: automated contributions, distributions, ending balance calculations",
        "IRR/MOIC calculation engine from actual cash flows (replace manual entry)",
        "Prospective investor landing page with deal cards and interest forms",
        "Loading states and error handling for all API calls",
        "Docker deployment with HTTPS for production",
    ]
    for item in p1_items:
        story.append(Paragraph(f"<bullet>&bull;</bullet>{item}", styles['BulletItem']))

    story.append(Paragraph("Priority 2 - Important (3-6 months)", styles['H2']))
    p2_items = [
        "Document view tracking: page-by-page analytics (Papermark integration or custom)",
        "Waterfall distribution calculator with automated LP/GP splits",
        "Multi-entity support: Individual, LLC, Trust, IRA views per investor",
        "PDF/CSV export for distributions, cap table, capital account statements",
        "Two-factor authentication (TOTP/SMS)",
        "Audit logging for compliance (who did what, when)",
        "Table sorting, column customization, and global search",
        "Watermarked document viewing (prevent unauthorized distribution)",
        "Self-service subscription workflow: invest online with digital signing",
        "Read receipts and engagement tracking for messages",
    ]
    for item in p2_items:
        story.append(Paragraph(f"<bullet>&bull;</bullet>{item}", styles['BulletItem']))

    story.append(Paragraph("Priority 3 - Nice to Have (6-12 months)", styles['H2']))
    p3_items = [
        "Accreditation verification (Parallel Markets / Verify Investor integration)",
        "KYC/AML identity verification for new investor onboarding",
        "Distribution payment processing via ACH/wire (Stripe or Dwolla)",
        "CPA/advisor read-only access sharing",
        "Slack/Teams integration for admin alerts",
        "Accounting integration (QuickBooks/Xero)",
        "White-label branding configuration (custom domain, colors, logo)",
        "Mobile app (React Native) or PWA",
        "Data rooms with granular per-page access control",
        "Investor sentiment tracking and NPS surveys",
    ]
    for item in p3_items:
        story.append(Paragraph(f"<bullet>&bull;</bullet>{item}", styles['BulletItem']))

    story.append(PageBreak())

    # ─── 8. COMPETITIVE ───
    story.append(Paragraph("8. Competitive Comparison", styles['H1']))
    story.append(Paragraph("How Northstar's custom portal compares to leading investor portal SaaS platforms:", styles['Body']))

    comp_data = [
        ["Feature", "Northstar (Custom)", "Juniper Square", "Agora", "InvestNext"],
        ["Investor Dashboard", "Built (Sprint 1-3)", "Yes", "Yes", "Yes"],
        ["Cap Table + Waterfall", "Built (Sprint 1)", "Yes", "Yes", "Yes"],
        ["Document Management", "Built (Sprint 4, 9)", "Yes + analytics", "Yes + K-1 auto", "Yes + OCR"],
        ["Threaded Messaging", "Built (Sprint 7)", "Yes", "Yes", "Yes (email)"],
        ["Admin CRM", "Built (Sprint 8)", "Yes + pipeline", "Yes + CRM", "Yes + CRM"],
        ["Investor Groups", "Built (Sprint 8)", "Yes", "Yes", "Yes"],
        ["E-Signatures", "Not yet (post-MVP)", "Yes (native)", "Yes (native)", "Yes (native)"],
        ["Email Notifications", "Not yet (post-MVP)", "Yes", "Yes", "Yes"],
        ["Capital Accounts", "Planned (Sprint 11)", "Yes (automated)", "Yes (automated)", "Yes"],
        ["Payment Processing", "Not yet", "Yes", "Yes (Covercy)", "Yes"],
        ["KYC/AML", "Not yet", "Yes", "Yes", "Yes"],
        ["Branding Control", "Full (custom code)", "Limited", "Customizable", "Customizable"],
        ["Data Ownership", "100% owned", "Vendor-held", "Vendor-held", "Vendor-held"],
        ["Per-Investor Fees", "None", "Yes", "Yes", "Yes"],
        ["Monthly Cost", "$45-65", "$500-2,000+", "$500-1,500", "$400-1,200"],
    ]
    t = Table(comp_data, colWidths=[1.4*inch, 1.3*inch, 1.2*inch, 1.2*inch, 1.2*inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), RED),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTSIZE', (0, 0), (-1, -1), 7.5),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('GRID', (0, 0), (-1, -1), 0.5, HexColor("#DDD")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, LIGHT_GRAY]),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t)

    story.append(Spacer(1, 20))
    story.append(HRFlowable(width="100%", thickness=2, color=RED))
    story.append(Spacer(1, 10))
    story.append(Paragraph("Prepared by Claude Code for Northstar Pacific Development Group", styles['Small']))
    story.append(Paragraph("Confidential - For Internal Use Only", styles['Small']))

    doc.build(story)
    print("PDF generated: Northstar-Investor-Portal-MVP-Summary.pdf")

if __name__ == "__main__":
    build_pdf()
