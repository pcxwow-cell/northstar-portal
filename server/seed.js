require("dotenv").config();
const prisma = require("./prisma");

async function main() {
  console.log("Seeding database...");

  // Clear all tables (reverse dependency order)
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
  const investor = await prisma.user.create({
    data: {
      id: 1,
      email: "j.chen@pacificventures.ca",
      passwordHash: "$2b$10$placeholder", // Sprint 2 will add real bcrypt hash
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
      passwordHash: "$2b$10$placeholder",
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
    },
    {
      id: 2, name: "Livy", location: "Port Coquitlam",
      type: "Studio to 2 Bed+Den Residential", status: "Pre-Development",
      sqft: "52,000", units: 64, completionPct: 15, totalRaise: 4500000,
      description: "Launching Spring 2025. Studio to 2 bedroom and den residences in the heart of Poco. Transit-oriented with walkable amenities.",
      prefReturnPct: 8.0, gpCatchupPct: 100, carryPct: 20,
    },
    {
      id: 3, name: "Estrella", location: "British Columbia",
      type: "40 Unit Purpose Built Rental", status: "Under Construction",
      sqft: "38,000", units: 40, completionPct: 45, totalRaise: 3800000,
      description: "40 unit purpose-built rental with 20% affordable housing allocation. Construction underway with anticipated completion Q2 2026.",
      prefReturnPct: 8.0, gpCatchupPct: 100, carryPct: 20,
    },
    {
      id: 4, name: "Panorama Building 6", location: "Surrey, BC",
      type: "55,000sf Federal Office Building", status: "Completed",
      sqft: "55,000", units: null, completionPct: 100, totalRaise: 8000000,
      description: "Purpose-built 55,000sf office building for the Federal Government. Completed Fall 2024. Fully leased on a long-term net lease.",
      prefReturnPct: 8.0, gpCatchupPct: 100, carryPct: 20,
    },
  ];

  for (const p of projectsData) {
    await prisma.project.create({ data: p });
  }
  console.log("  Projects: 4");

  // ─── Investor-Project relationships ───
  await prisma.investorProject.createMany({
    data: [
      { userId: 1, projectId: 1, committed: 500000, called: 400000, currentValue: 480000, irr: 18.4, moic: 1.20 },
      { userId: 1, projectId: 2, committed: 350000, called: 175000, currentValue: 192500, irr: 22.1, moic: 1.10 },
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

  // ─── Project Updates ───
  const updatesData = [
    // Porthaven
    { projectId: 1, date: "Jun 28, 2025", text: "Structural concrete complete on floors 1-4. Exterior cladding installation has begun on the south facade." },
    { projectId: 1, date: "May 15, 2025", text: "Mechanical rough-in progressing on schedule. Underground parking substantially complete." },
    { projectId: 1, date: "Apr 2, 2025", text: "Project reached 65% completion milestone. Retail pre-leasing conversations underway with three prospective tenants." },
    // Livy
    { projectId: 2, date: "Jun 10, 2025", text: "Capital Call #4 issued. Development permit application submitted to City of Port Coquitlam." },
    { projectId: 2, date: "Apr 22, 2025", text: "Architectural design finalized with RHA Architecture. Unit mix optimized based on market absorption study." },
    // Estrella
    { projectId: 3, date: "Jun 5, 2025", text: "Wood-frame construction progressing. Second floor framing complete." },
    { projectId: 3, date: "May 1, 2025", text: "CMHC MLI Select financing secured with favorable terms due to affordable housing component." },
    // Panorama
    { projectId: 4, date: "Oct 15, 2024", text: "Building completed and handed over to tenant. All deficiencies addressed." },
    { projectId: 4, date: "Sep 1, 2024", text: "Certificate of occupancy received. Tenant fit-out substantially complete." },
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

  console.log("\nSeed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
