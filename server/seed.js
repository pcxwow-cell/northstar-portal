require("dotenv").config();
const bcrypt = require("bcryptjs");
const prisma = require("./prisma");
const { calculateXIRR, calculateMOIC } = require("./services/finance");

async function main() {
  console.log("Seeding database...");

  // Clear all tables (reverse dependency order)
  await prisma.loginHistory.deleteMany();
  await prisma.cashFlow.deleteMany();
  await prisma.prospect.deleteMany();
  await prisma.investorEntity.deleteMany();
  await prisma.groupMember.deleteMany();
  await prisma.investorGroup.deleteMany();
  await prisma.notificationLog.deleteMany();
  await prisma.notificationPreference.deleteMany();
  await prisma.signatureSigner.deleteMany();
  await prisma.signatureRequest.deleteMany();
  await prisma.threadRecipient.deleteMany();
  await prisma.threadMessage.deleteMany();
  await prisma.messageThread.deleteMany();
  await prisma.documentAssignment.deleteMany();
  await prisma.messageRecipient.deleteMany();
  await prisma.message.deleteMany();
  await prisma.performanceHistory.deleteMany();
  await prisma.projectUpdate.deleteMany();
  await prisma.document.deleteMany();
  await prisma.distribution.deleteMany();
  await prisma.waterfallTier.deleteMany();
  await prisma.capTableEntry.deleteMany();
  await prisma.investorProject.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  // ─── Users ───
  const investorHash = await bcrypt.hash("northstar2025", 10);
  const adminHash = await bcrypt.hash("admin2025", 10);

  const investor = await prisma.user.create({
    data: {
      id: 1,
      email: "j.chen@pacificventures.ca",
      passwordHash: investorHash,
      name: "James Chen",
      initials: "JC",
      role: "INVESTOR",
      joined: "March 2023",
    },
  });

  const admin = await prisma.user.create({
    data: {
      id: 2,
      email: "admin@northstardevelopment.ca",
      passwordHash: adminHash,
      name: "Northstar Admin",
      initials: "NA",
      role: "ADMIN",
      joined: "January 2019",
    },
  });

  console.log("  Users: 2");

  // ─── Projects ───
  const projectsData = [
    {
      id: 1, name: "Porthaven", location: "Downtown Port Coquitlam",
      type: "108 Residences & Curated Retail", status: "Under Construction",
      sqft: "96,000", units: 108, completionPct: 68, totalRaise: 6000000,
      description: "Redefining Downtown Port Coquitlam. Mixed-use development with 108 residences and curated ground-floor retail adjacent to Leigh Square.",
      prefReturnPct: 8.0, gpCatchupPct: 100, carryPct: 20,
      estimatedCompletion: new Date("2027-06-30"),
      unitsSold: 42, revenue: 18500000,
      orgChart: JSON.stringify([
        { role: "Project Lead", name: "Gord Wylie", company: "Northstar Pacific" },
        { role: "EVP Development", name: "Jeff Brown", company: "Northstar Pacific" },
        { role: "Architect", name: "RHA Architecture", company: "RHA" },
        { role: "General Contractor", name: "Marcon Construction", company: "Marcon" },
      ]),
    },
    {
      id: 2, name: "Livy", location: "Port Coquitlam",
      type: "Studio to 2 Bed+Den Residential", status: "Pre-Development",
      sqft: "52,000", units: 64, completionPct: 15, totalRaise: 4500000,
      description: "Launching Spring 2025. Studio to 2 bedroom and den residences in the heart of Poco. Transit-oriented with walkable amenities.",
      prefReturnPct: 8.0, gpCatchupPct: 100, carryPct: 20,
      estimatedCompletion: new Date("2028-03-31"),
      unitsSold: 0, revenue: 0,
      orgChart: JSON.stringify([
        { role: "Project Lead", name: "Jeff Brown", company: "Northstar Pacific" },
        { role: "Architect", name: "RHA Architecture", company: "RHA" },
      ]),
    },
    {
      id: 3, name: "Estrella", location: "British Columbia",
      type: "40 Unit Purpose Built Rental", status: "Under Construction",
      sqft: "38,000", units: 40, completionPct: 45, totalRaise: 3800000,
      description: "40 unit purpose-built rental with 20% affordable housing allocation. Construction underway with anticipated completion Q2 2026.",
      prefReturnPct: 8.0, gpCatchupPct: 100, carryPct: 20,
      estimatedCompletion: new Date("2026-06-30"),
      unitsSold: 0, revenue: 840000,
      orgChart: JSON.stringify([
        { role: "Project Lead", name: "Gord Wylie", company: "Northstar Pacific" },
        { role: "Property Manager", name: "Coastal PM", company: "Coastal PM Inc." },
      ]),
    },
    {
      id: 4, name: "Panorama Building 6", location: "Surrey, BC",
      type: "55,000sf Federal Office Building", status: "Completed",
      sqft: "55,000", units: null, completionPct: 100, totalRaise: 8000000,
      description: "Purpose-built 55,000sf office building for the Federal Government. Completed Fall 2024. Fully leased on a long-term net lease.",
      prefReturnPct: 8.0, gpCatchupPct: 100, carryPct: 20,
      estimatedCompletion: new Date("2024-10-15"),
      unitsSold: 0, revenue: 2200000,
      orgChart: JSON.stringify([
        { role: "Project Lead", name: "Gord Wylie", company: "Northstar Pacific" },
        { role: "Tenant", name: "Government of Canada", company: "PSPC" },
      ]),
    },
  ];

  for (const p of projectsData) {
    await prisma.project.create({ data: p });
  }
  console.log("  Projects: 4");

  // ─── Investor Entities ───
  const entity1 = await prisma.investorEntity.create({
    data: { userId: 1, name: "James Chen (Individual)", type: "Individual", taxId: "***-**-1234", address: "1234 Marine Drive, Vancouver BC", state: "BC", isDefault: true },
  });
  const entity2 = await prisma.investorEntity.create({
    data: { userId: 1, name: "Chen Family Trust", type: "Trust", taxId: "88-***7890", address: "1234 Marine Drive, Vancouver BC", state: "BC", isDefault: false },
  });
  console.log("  InvestorEntities: 2");

  // ─── Investor-Project relationships ───
  await prisma.investorProject.createMany({
    data: [
      { userId: 1, projectId: 1, committed: 500000, called: 400000, currentValue: 480000, irr: 18.4, moic: 1.20, entityId: entity1.id },
      { userId: 1, projectId: 2, committed: 350000, called: 175000, currentValue: 192500, irr: 22.1, moic: 1.10, entityId: entity2.id },
    ],
  });
  console.log("  InvestorProjects: 2");

  // ─── Cap Table Entries ───
  const capTableData = [
    // Porthaven (6 entries)
    { projectId: 1, holderName: "Northstar GP", holderType: "GP Interest", committed: 300000, called: 300000, ownershipPct: 5.0, unfunded: 0 },
    { projectId: 1, holderName: "Pacific Pension Fund", holderType: "LP — Class A", committed: 2000000, called: 1600000, ownershipPct: 33.3, unfunded: 400000 },
    { projectId: 1, holderName: "James Chen", holderType: "LP — Class A", committed: 500000, called: 400000, ownershipPct: 8.3, unfunded: 100000 },
    { projectId: 1, holderName: "Coastal Family Office", holderType: "LP — Class A", committed: 1500000, called: 1200000, ownershipPct: 25.0, unfunded: 300000 },
    { projectId: 1, holderName: "Westridge Capital Inc.", holderType: "LP — Class B", committed: 1000000, called: 800000, ownershipPct: 16.7, unfunded: 200000 },
    { projectId: 1, holderName: "Individual LPs (3)", holderType: "LP — Class C", committed: 700000, called: 560000, ownershipPct: 11.7, unfunded: 140000 },
    // Livy (5 entries)
    { projectId: 2, holderName: "Northstar GP", holderType: "GP Interest", committed: 225000, called: 112500, ownershipPct: 5.0, unfunded: 112500 },
    { projectId: 2, holderName: "James Chen", holderType: "LP — Class A", committed: 350000, called: 175000, ownershipPct: 7.8, unfunded: 175000 },
    { projectId: 2, holderName: "Pacific Pension Fund", holderType: "LP — Class A", committed: 1500000, called: 750000, ownershipPct: 33.3, unfunded: 750000 },
    { projectId: 2, holderName: "Coastal Family Office", holderType: "LP — Class B", committed: 1200000, called: 600000, ownershipPct: 26.7, unfunded: 600000 },
    { projectId: 2, holderName: "Individual LPs (5)", holderType: "LP — Class C", committed: 1225000, called: 612500, ownershipPct: 27.2, unfunded: 612500 },
  ];
  await prisma.capTableEntry.createMany({ data: capTableData });
  console.log("  CapTableEntries: " + capTableData.length);

  // ─── Waterfall Tiers ───
  const tiers = [
    { name: "Return of Capital", lpShare: "100%", gpShare: "0%", threshold: "1.0x" },
    { name: "Preferred Return (8%)", lpShare: "100%", gpShare: "0%", threshold: "8% IRR" },
    { name: "GP Catch-Up", lpShare: "0%", gpShare: "100%", threshold: "Until 20/80" },
    { name: "Carried Interest", lpShare: "80%", gpShare: "20%", threshold: "Above pref" },
  ];
  const waterfallData = [];
  // Porthaven tiers
  tiers.forEach((t, i) => {
    const statuses = ["complete", "accruing", "pending", "pending"];
    waterfallData.push({
      projectId: 1, tierOrder: i + 1, tierName: t.name,
      lpShare: t.lpShare, gpShare: t.gpShare, threshold: t.threshold,
      status: statuses[i],
    });
  });
  // Livy tiers (all pending)
  tiers.forEach((t, i) => {
    waterfallData.push({
      projectId: 2, tierOrder: i + 1, tierName: t.name,
      lpShare: t.lpShare, gpShare: t.gpShare, threshold: t.threshold,
      status: "pending",
    });
  });
  await prisma.waterfallTier.createMany({ data: waterfallData });
  console.log("  WaterfallTiers: " + waterfallData.length);

  // ─── Distributions ───
  const distributionsData = [
    { projectId: 1, quarter: "Q3 2024", date: "Oct 8, 2024", amount: 6200, type: "Income" },
    { projectId: 1, quarter: "Q4 2024", date: "Jan 14, 2025", amount: 7100, type: "Income" },
    { projectId: 1, quarter: "Q1 2025", date: "Apr 9, 2025", amount: 6800, type: "Income" },
    { projectId: 1, quarter: "Q2 2025", date: "Jul 11, 2025", amount: 7500, type: "Income" },
  ];
  await prisma.distribution.createMany({ data: distributionsData });
  console.log("  Distributions: " + distributionsData.length);

  // ─── Documents ───
  const documentsData = [
    // Porthaven docs
    { id: 1, projectId: 1, name: "Q2 2025 — Porthaven Quarterly Report", category: "Reporting", date: "Jul 15, 2025", size: "2.4 MB", status: "published", file: "/docs/q2-2025-quarterly-report.pdf" },
    { id: 3, projectId: 1, name: "Porthaven — Construction Progress Photos", category: "Property Update", date: "Jun 28, 2025", size: "5.1 MB", status: "published", file: "/docs/porthaven-construction-photos.pdf" },
    { id: 7, projectId: 1, name: "PPM — Porthaven", category: "Offering", date: "Feb 12, 2025", size: "3.8 MB", status: "published", file: "/docs/ppm-fund-i-overview.pdf" },
    // Livy docs
    { id: 4, projectId: 2, name: "Capital Call Notice #4 — Livy", category: "Capital Call", date: "Jun 10, 2025", size: "320 KB", status: "action_required", file: "/docs/capital-call-notice-4.pdf" },
    { id: 5, projectId: 2, name: "Subscription Agreement — Livy", category: "Legal", date: "Jun 10, 2025", size: "1.2 MB", status: "pending_signature", file: "/docs/subscription-agreement-fund-ii.pdf" },
    // General docs (no project)
    { id: 2, projectId: null, name: "K-1 Tax Package — FY 2024", category: "Tax", date: "Mar 1, 2025", size: "840 KB", status: "published", file: "/docs/k1-tax-package-fy2024.pdf" },
    { id: 6, projectId: null, name: "Distribution Statement — Q1 2025", category: "Distribution", date: "Apr 5, 2025", size: "180 KB", status: "published", file: "/docs/distribution-statement-q1-2025.pdf" },
    { id: 8, projectId: null, name: "Annual Investor Letter 2024", category: "Reporting", date: "Jan 20, 2025", size: "1.1 MB", status: "published", file: "/docs/annual-investor-letter-2024.pdf" },
  ];
  for (const d of documentsData) {
    await prisma.document.create({ data: d });
  }
  console.log("  Documents: " + documentsData.length);

  // ─── Project Updates (with metric snapshots) ───
  const updatesData = [
    // Porthaven
    { projectId: 1, date: "Jun 28, 2025", text: "Structural concrete complete on floors 1-4. Exterior cladding installation has begun on the south facade.", completionPct: 68, unitsSold: 42, revenue: 18500000, status: "Under Construction" },
    { projectId: 1, date: "May 15, 2025", text: "Mechanical rough-in progressing on schedule. Underground parking substantially complete.", completionPct: 62, unitsSold: 35, revenue: 15200000, status: "Under Construction" },
    { projectId: 1, date: "Apr 2, 2025", text: "Project reached 65% completion milestone. Retail pre-leasing conversations underway with three prospective tenants.", completionPct: 55, unitsSold: 28, revenue: 12100000, status: "Under Construction" },
    // Livy
    { projectId: 2, date: "Jun 10, 2025", text: "Capital Call #4 issued. Development permit application submitted to City of Port Coquitlam.", completionPct: 15, unitsSold: 0, revenue: 0, status: "Pre-Development" },
    { projectId: 2, date: "Apr 22, 2025", text: "Architectural design finalized with RHA Architecture. Unit mix optimized based on market absorption study.", completionPct: 10, unitsSold: 0, revenue: 0, status: "Pre-Development" },
    // Estrella
    { projectId: 3, date: "Jun 5, 2025", text: "Wood-frame construction progressing. Second floor framing complete.", completionPct: 45, unitsSold: 0, revenue: 840000, status: "Under Construction" },
    { projectId: 3, date: "May 1, 2025", text: "CMHC MLI Select financing secured with favorable terms due to affordable housing component.", completionPct: 35, unitsSold: 0, revenue: 620000, status: "Under Construction" },
    // Panorama
    { projectId: 4, date: "Oct 15, 2024", text: "Building completed and handed over to tenant. All deficiencies addressed.", completionPct: 100, unitsSold: 0, revenue: 2200000, status: "Completed" },
    { projectId: 4, date: "Sep 1, 2024", text: "Certificate of occupancy received. Tenant fit-out substantially complete.", completionPct: 98, unitsSold: 0, revenue: 2000000, status: "Under Construction" },
  ];
  await prisma.projectUpdate.createMany({ data: updatesData });
  console.log("  ProjectUpdates: " + updatesData.length);

  // ─── Performance History ───
  const porthaven = [
    { month: "Jan", value: 410, benchmark: 400 }, { month: "Feb", value: 415, benchmark: 403 },
    { month: "Mar", value: 420, benchmark: 405 }, { month: "Apr", value: 430, benchmark: 408 },
    { month: "May", value: 440, benchmark: 410 }, { month: "Jun", value: 445, benchmark: 412 },
    { month: "Jul", value: 450, benchmark: 415 }, { month: "Aug", value: 458, benchmark: 418 },
    { month: "Sep", value: 462, benchmark: 420 }, { month: "Oct", value: 468, benchmark: 422 },
    { month: "Nov", value: 474, benchmark: 425 }, { month: "Dec", value: 480, benchmark: 428 },
  ];
  const livy = [
    { month: "Jan", value: 175, benchmark: 175 }, { month: "Feb", value: 176, benchmark: 175 },
    { month: "Mar", value: 178, benchmark: 176 }, { month: "Apr", value: 180, benchmark: 177 },
    { month: "May", value: 183, benchmark: 178 }, { month: "Jun", value: 185, benchmark: 178 },
    { month: "Jul", value: 187, benchmark: 179 }, { month: "Aug", value: 188, benchmark: 180 },
    { month: "Sep", value: 189, benchmark: 180 }, { month: "Oct", value: 190, benchmark: 181 },
    { month: "Nov", value: 191, benchmark: 182 }, { month: "Dec", value: 192.5, benchmark: 183 },
  ];
  const perfData = [
    ...porthaven.map((h) => ({ projectId: 1, ...h })),
    ...livy.map((h) => ({ projectId: 2, ...h })),
  ];
  await prisma.performanceHistory.createMany({ data: perfData });
  console.log("  PerformanceHistory: " + perfData.length);

  // ─── Messages ───
  const messagesData = [
    { id: 1, senderId: 2, fromName: "Gord Wylie", role: "President", date: "Jul 18, 2025", subject: "Porthaven Q2 Update", preview: "Construction remains on schedule. We've reached 68% completion and the exterior cladding is progressing well on the south facade...", unread: true },
    { id: 2, senderId: 2, fromName: "Jeff Brown", role: "EVP", date: "Jun 28, 2025", subject: "Livy — Development Permit Filed", preview: "Pleased to confirm the development permit application for Livy has been formally submitted to the City of Port Coquitlam...", unread: true },
    { id: 3, senderId: 2, fromName: "Northstar IR", role: "Investor Relations", date: "Jun 10, 2025", subject: "Capital Call #4 — Action Required", preview: "Please find attached the capital call notice for the Livy development. The call amount of $175,000 is due by June 30, 2025...", unread: false },
    { id: 4, senderId: 2, fromName: "Gord Wylie", role: "President", date: "Apr 5, 2025", subject: "Q1 2025 Distribution Notice", preview: "I'm pleased to confirm the Q1 2025 distribution of $6,800 from Porthaven has been processed and will be deposited to your account on file...", unread: false },
    { id: 5, senderId: 2, fromName: "Northstar IR", role: "Investor Relations", date: "Mar 1, 2025", subject: "2024 K-1 Tax Documents Available", preview: "Your K-1 tax documents for fiscal year 2024 are now available in the Documents section of your portal...", unread: false },
  ];
  for (const m of messagesData) {
    await prisma.message.create({ data: m });
  }
  console.log("  Messages: " + messagesData.length);

  // ─── Message Threads (new threaded messaging) ───
  await prisma.threadRecipient.deleteMany();
  await prisma.threadMessage.deleteMany();
  await prisma.messageThread.deleteMany();

  const threadsData = [
    {
      subject: "Porthaven Q2 Update",
      creatorId: 2, targetType: "ALL",
      body: "Construction remains on schedule. We've reached 68% completion and the exterior cladding is progressing well on the south facade. Interior framing is complete on floors 1-3, and mechanical rough-in has commenced. The retail pre-leasing efforts continue with strong interest from two national tenants. We anticipate finalizing LOIs in Q3.\n\nPlease don't hesitate to reach out with any questions.\n\nBest regards,\nGord Wylie\nPresident, Northstar Pacific Development Group",
      senderName: "Gord Wylie", senderRole: "President",
    },
    {
      subject: "Livy — Development Permit Filed",
      creatorId: 2, targetType: "PROJECT", targetProjectId: 2,
      body: "Pleased to confirm the development permit application for Livy has been formally submitted to the City of Port Coquitlam. The application includes the finalized architectural plans by RHA Architecture with the optimized unit mix we discussed in our last update.\n\nKey milestones ahead:\n• City review period: 8-12 weeks\n• Public hearing (if required): Q4 2025\n• Permit issuance target: Q1 2026\n\nWe'll keep you updated on the progress.\n\nBest,\nJeff Brown\nEVP, Northstar Pacific Development Group",
      senderName: "Jeff Brown", senderRole: "EVP",
    },
    {
      subject: "Capital Call #4 — Action Required",
      creatorId: 2, targetType: "PROJECT", targetProjectId: 2,
      body: "Please find attached the capital call notice for the Livy development. The call amount of $175,000 is due by June 30, 2025.\n\nThis capital call will fund the development permit fees, final architectural drawings, and initial site preparation work.\n\nPayment instructions are included in the attached notice. Please confirm receipt and anticipated funding date.\n\nThank you,\nNorthstar Investor Relations",
      senderName: "Northstar IR", senderRole: "Investor Relations",
    },
    {
      subject: "Q1 2025 Distribution Notice",
      creatorId: 2, targetType: "PROJECT", targetProjectId: 1,
      body: "I'm pleased to confirm the Q1 2025 distribution of $6,800 from Porthaven has been processed and will be deposited to your account on file within 3-5 business days.\n\nThis distribution represents income from the retail pre-lease deposits received during the quarter. A detailed distribution statement is available in your Documents section.\n\nBest regards,\nGord Wylie",
      senderName: "Gord Wylie", senderRole: "President",
    },
    {
      subject: "2024 K-1 Tax Documents Available",
      creatorId: 2, targetType: "ALL",
      body: "Your K-1 tax documents for fiscal year 2024 are now available in the Documents section of your portal. Please download and provide to your tax advisor at your earliest convenience.\n\nIf you have questions regarding the K-1 or need a corrected form, please reply to this message or contact us at ir@northstardevelopment.ca.\n\nThank you,\nNorthstar Investor Relations",
      senderName: "Northstar IR", senderRole: "Investor Relations",
    },
  ];

  for (let i = 0; i < threadsData.length; i++) {
    const t = threadsData[i];
    const thread = await prisma.messageThread.create({
      data: {
        subject: t.subject,
        creator: { connect: { id: t.creatorId } },
        targetType: t.targetType,
        ...(t.targetProjectId ? { targetProject: { connect: { id: t.targetProjectId } } } : {}),
        messages: {
          create: { sender: { connect: { id: t.creatorId } }, body: t.body },
        },
      },
    });
    // Add investor as recipient (first 2 unread, rest read)
    await prisma.threadRecipient.create({
      data: { threadId: thread.id, userId: 1, unread: i < 2 },
    });
    // Add admin as recipient (read)
    await prisma.threadRecipient.create({
      data: { threadId: thread.id, userId: 2, unread: false },
    });
  }
  console.log("  MessageThreads: " + threadsData.length);

  // ─── Signature Requests ───
  // Completed signature request (Subscription Agreement — Livy)
  const sigReq1 = await prisma.signatureRequest.create({
    data: {
      documentId: 5, // Subscription Agreement — Livy
      requestId: "demo_sig_completed_001",
      status: "signed",
      subject: "Please sign: Subscription Agreement — Livy",
      message: "Please review and sign the subscription agreement for the Livy development.",
      createdById: 2,
      completedAt: new Date("2025-06-15T10:30:00Z"),
      signers: {
        create: [
          { userId: 1, name: "James Chen", email: "j.chen@pacificventures.ca", status: "signed", signedAt: new Date("2025-06-15T10:30:00Z") },
        ],
      },
    },
  });

  // Pending signature request (K-1 Tax Package)
  const sigReq2 = await prisma.signatureRequest.create({
    data: {
      documentId: 2, // K-1 Tax Package
      requestId: "demo_sig_pending_002",
      status: "pending",
      subject: "Please sign: K-1 Tax Package — FY 2024",
      message: "Please review and sign the K-1 tax acknowledgment.",
      createdById: 2,
      signers: {
        create: [
          { userId: 1, name: "James Chen", email: "j.chen@pacificventures.ca", status: "pending", signUrl: "/api/v1/signatures/2/sign" },
        ],
      },
    },
  });
  console.log("  SignatureRequests: 2");

  // ─── Notification Preferences ───
  await prisma.notificationPreference.create({
    data: {
      userId: 1,
      emailDocuments: true,
      emailSignatures: true,
      emailDistributions: true,
      emailMessages: true,
      emailCapitalCalls: true,
    },
  });
  await prisma.notificationPreference.create({
    data: {
      userId: 2,
      emailDocuments: true,
      emailSignatures: true,
      emailDistributions: false,
      emailMessages: true,
      emailCapitalCalls: true,
    },
  });
  console.log("  NotificationPreferences: 2");

  // ─── Notification Logs ───
  const notifLogs = [
    { userId: 1, type: "document_uploaded", subject: "New Document: Q2 2025 — Porthaven Quarterly Report", channel: "email", status: "sent", metadata: JSON.stringify({ docName: "Q2 2025 — Porthaven Quarterly Report", projectName: "Porthaven" }) },
    { userId: 1, type: "signature_required", subject: "Signature Required: K-1 Tax Package — FY 2024", channel: "email", status: "sent", metadata: JSON.stringify({ docName: "K-1 Tax Package — FY 2024" }) },
    { userId: 1, type: "distribution_paid", subject: "Distribution Payment: $7,500 - Porthaven", channel: "email", status: "sent", metadata: JSON.stringify({ amount: 7500, projectName: "Porthaven", quarter: "Q2 2025" }) },
    { userId: 2, type: "signature_completed", subject: "Signature Completed: Subscription Agreement — Livy", channel: "email", status: "sent", metadata: JSON.stringify({ investorName: "James Chen", docName: "Subscription Agreement — Livy" }) },
    { userId: 1, type: "new_message", subject: "New Message from Gord Wylie: Porthaven Q2 Update", channel: "email", status: "sent", metadata: JSON.stringify({ senderName: "Gord Wylie", messageSubject: "Porthaven Q2 Update" }) },
  ];
  await prisma.notificationLog.createMany({ data: notifLogs });
  console.log("  NotificationLogs: " + notifLogs.length);

  // ─── Prospects (prospective investors) ───
  const prospectsData = [
    {
      name: "Sarah Mitchell",
      email: "sarah.mitchell@westcoastwealth.ca",
      phone: "604-555-0142",
      entityType: "Individual",
      accreditationStatus: "Accredited",
      investmentRange: "$250K-$500K",
      interestedProjectId: 1,
      message: "Interested in the Porthaven development. Would like to schedule a call to discuss the investment structure and timeline.",
      status: "new",
    },
    {
      name: "David Park",
      email: "dpark@harbourinvestments.com",
      phone: "778-555-0319",
      entityType: "LLC",
      accreditationStatus: "Accredited",
      investmentRange: "$500K+",
      interestedProjectId: 2,
      message: "Our firm is looking at residential development opportunities in the Port Coquitlam area. Livy looks like a strong fit.",
      status: "contacted",
    },
    {
      name: "Michelle Wong",
      email: "mwong@pacificridge.ca",
      phone: "604-555-0287",
      entityType: "Trust",
      accreditationStatus: "Accredited",
      investmentRange: "$100K-$250K",
      interestedProjectId: 3,
      message: "Interested in the affordable housing component of Estrella. Our family trust focuses on impact investing.",
      status: "qualified",
    },
    {
      name: "Robert Fraser",
      email: "rob.fraser@gmail.com",
      phone: null,
      entityType: "Individual",
      accreditationStatus: "Not Yet",
      investmentRange: "$50K-$100K",
      interestedProjectId: null,
      message: "Just learning about real estate investment. Would appreciate any introductory materials you can share.",
      status: "declined",
    },
    {
      name: "Jennifer Liu",
      email: "jliu@mapleleafcapital.ca",
      phone: "604-555-0456",
      entityType: "IRA",
      accreditationStatus: "Accredited",
      investmentRange: "$250K-$500K",
      interestedProjectId: 1,
      message: "Looking to allocate from our self-directed IRA into real estate development. Porthaven's structure looks well-suited.",
      status: "new",
    },
  ];
  await prisma.prospect.createMany({ data: prospectsData });
  console.log("  Prospects: " + prospectsData.length);

  // ─── Investor Groups (with hierarchy) ───
  const classAGroup = await prisma.investorGroup.create({
    data: { name: "Class A LPs", description: "Primary Class A limited partners", color: "#3D7A54", tier: "primary" },
  });
  const subLPGroup = await prisma.investorGroup.create({
    data: { name: "Class A — West Coast", description: "West Coast sub-group of Class A", color: "#2E6B45", tier: "sub-lp", parentId: classAGroup.id },
  });
  const classBGroup = await prisma.investorGroup.create({
    data: { name: "Class B LPs", description: "Secondary Class B limited partners", color: "#8B7128", tier: "primary" },
  });
  // Add James Chen to Class A
  await prisma.groupMember.create({ data: { groupId: classAGroup.id, userId: 1 } });
  await prisma.groupMember.create({ data: { groupId: subLPGroup.id, userId: 1 } });
  console.log("  InvestorGroups: 3 (with hierarchy)");

  // ─── Cash Flows ───
  const cashFlowsData = [
    // Porthaven — James Chen
    { userId: 1, projectId: 1, date: new Date("2023-01-15"), amount: -500000, type: "capital_call", description: "Initial investment" },
    { userId: 1, projectId: 1, date: new Date("2023-06-01"), amount: -100000, type: "capital_call", description: "Capital call #2" },
    { userId: 1, projectId: 1, date: new Date("2024-09-15"), amount: 8500, type: "distribution", description: "Q3 2024 income distribution" },
    { userId: 1, projectId: 1, date: new Date("2024-12-15"), amount: 10200, type: "distribution", description: "Q4 2024 income distribution" },
    { userId: 1, projectId: 1, date: new Date("2025-03-15"), amount: 8900, type: "distribution", description: "Q1 2025 income distribution" },
    // Livy — James Chen
    { userId: 1, projectId: 2, date: new Date("2024-03-15"), amount: -250000, type: "capital_call", description: "Initial investment" },
  ];
  await prisma.cashFlow.createMany({ data: cashFlowsData });
  console.log("  CashFlows: " + cashFlowsData.length);

  // ─── Login History ───
  const loginHistoryData = [
    { userId: 1, ip: "192.168.1.42", userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0", success: true, createdAt: new Date("2026-03-17T15:45:00Z") },
    { userId: 1, ip: "192.168.1.42", userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0", success: true, createdAt: new Date("2026-03-15T09:30:00Z") },
    { userId: 1, ip: "10.0.0.15", userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/605.1", success: false, createdAt: new Date("2026-03-14T22:10:00Z") },
    { userId: 1, ip: "192.168.1.42", userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0", success: true, createdAt: new Date("2026-03-12T14:20:00Z") },
    { userId: 1, ip: "192.168.1.42", userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0", success: true, createdAt: new Date("2026-03-10T10:00:00Z") },
  ];
  await prisma.loginHistory.createMany({ data: loginHistoryData });
  console.log("  LoginHistory: " + loginHistoryData.length);

  // ─── Recalculate IRR / MOIC from cash flows ───
  const investorProjects = await prisma.investorProject.findMany();
  for (const ip of investorProjects) {
    const flows = await prisma.cashFlow.findMany({
      where: { userId: ip.userId, projectId: ip.projectId },
      orderBy: { date: "asc" },
    });
    if (flows.length === 0) continue;

    // Build XIRR flows with terminal NAV
    const xirrFlows = flows.map((cf) => ({ date: cf.date, amount: cf.amount }));
    xirrFlows.push({ date: new Date(), amount: ip.currentValue });

    const irr = calculateXIRR(xirrFlows);
    const totalInvested = flows.filter((cf) => cf.amount < 0).reduce((s, cf) => s + Math.abs(cf.amount), 0);
    const totalDist = flows.filter((cf) => cf.amount > 0).reduce((s, cf) => s + cf.amount, 0);
    const moic = calculateMOIC(totalDist, ip.currentValue, totalInvested);

    await prisma.investorProject.update({
      where: { id: ip.id },
      data: {
        irr: irr != null ? Math.round(irr * 1000) / 10 : ip.irr,
        moic,
      },
    });
    console.log(`  Recalculated: userId=${ip.userId} projectId=${ip.projectId} IRR=${irr != null ? (irr * 100).toFixed(1) + "%" : "N/A"} MOIC=${moic}x`);
  }

  // Reset PostgreSQL sequences so auto-increment doesn't conflict with seeded IDs
  const tables = ["users", "projects", "investor_projects", "documents", "document_assignments",
    "distributions", "message_threads", "thread_messages", "thread_recipients",
    "signature_requests", "signature_signers", "notification_logs", "notification_preferences",
    "prospects", "audit_logs", "cash_flows", "login_history", "investor_entities",
    "investor_groups", "group_members"];
  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM "${table}"), 0) + 1, false)`);
    } catch (e) { /* table might not have id column or sequence */ }
  }
  console.log("  Reset ID sequences");

  console.log("\nSeed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
