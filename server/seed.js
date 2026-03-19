require("dotenv").config();
const bcrypt = require("bcryptjs");
const prisma = require("./prisma");
const { calculateXIRR, calculateMOIC } = require("./services/finance");
const PDFDocument = require("pdfkit");
const storage = require("./storage");

// Generate a simple branded PDF buffer for seed documents
function generatePDF(title, body, metadata = {}) {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: "LETTER", margin: 72 });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    // Header bar
    doc.rect(0, 0, 612, 60).fill("#231F20");
    doc.fontSize(14).fill("#FFFFFF").font("Helvetica-Bold").text("NORTHSTAR PACIFIC DEVELOPMENT GROUP", 72, 22);

    // Title
    doc.moveDown(2);
    doc.fontSize(22).fill("#231F20").font("Helvetica-Bold").text(title, 72, 90, { width: 468 });

    // Metadata line
    const metaLine = Object.entries(metadata).map(([k, v]) => `${k}: ${v}`).join("  |  ");
    if (metaLine) {
      doc.moveDown(0.5);
      doc.fontSize(10).fill("#767168").font("Helvetica").text(metaLine, { width: 468 });
    }

    // Separator
    doc.moveDown(1);
    doc.moveTo(72, doc.y).lineTo(540, doc.y).stroke("#CCCCCC");
    doc.moveDown(1);

    // Body
    doc.fontSize(11).fill("#333333").font("Helvetica").text(body, { width: 468, lineGap: 4 });

    // Footer
    doc.fontSize(8).fill("#999999").text(
      "This document is confidential and intended solely for the named recipient(s). Northstar Pacific Development Group.",
      72, 700, { width: 468, align: "center" }
    );

    doc.end();
  });
}

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

  // ─── Additional Investors ───
  const investor2 = await prisma.user.create({
    data: {
      id: 3,
      email: "sarah.whitfield@coastalfamily.ca",
      passwordHash: investorHash,
      name: "Sarah Whitfield",
      initials: "SW",
      role: "INVESTOR",
      joined: "June 2023",
    },
  });
  const investor3 = await prisma.user.create({
    data: {
      id: 4,
      email: "m.rodriguez@westridgecapital.com",
      passwordHash: investorHash,
      name: "Michael Rodriguez",
      initials: "MR",
      role: "INVESTOR",
      joined: "January 2024",
    },
  });
  const investor4 = await prisma.user.create({
    data: {
      id: 5,
      email: "lisa.park@pacificpension.ca",
      passwordHash: investorHash,
      name: "Lisa Park",
      initials: "LP",
      role: "INVESTOR",
      joined: "March 2023",
    },
  });

  console.log("  Users: 5 (1 admin + 4 investors)");

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
  await prisma.investorEntity.create({
    data: { userId: 3, name: "Coastal Family Office", type: "LLC", taxId: "***-**-5678", address: "800 West Pender St, Vancouver BC", state: "BC", isDefault: true },
  });
  await prisma.investorEntity.create({
    data: { userId: 4, name: "Westridge Capital Inc.", type: "Corporation", taxId: "***-**-9012", address: "555 Burrard St Suite 1200, Vancouver BC", state: "BC", isDefault: true },
  });
  await prisma.investorEntity.create({
    data: { userId: 5, name: "Pacific Pension Fund", type: "Trust", taxId: "***-**-3456", address: "1055 Dunsmuir St, Vancouver BC", state: "BC", isDefault: true },
  });
  console.log("  InvestorEntities: 5");

  // ─── Investor-Project relationships ───
  await prisma.investorProject.createMany({
    data: [
      { userId: 1, projectId: 1, committed: 500000, called: 400000, currentValue: 480000, irr: 18.4, moic: 1.20, entityId: entity1.id },
      { userId: 1, projectId: 2, committed: 350000, called: 175000, currentValue: 192500, irr: 22.1, moic: 1.10, entityId: entity2.id },
      // Sarah Whitfield — Porthaven + Estrella
      { userId: 3, projectId: 1, committed: 1500000, called: 1200000, currentValue: 1440000, irr: 16.2, moic: 1.20 },
      { userId: 3, projectId: 3, committed: 400000, called: 200000, currentValue: 215000, irr: 12.5, moic: 1.08 },
      // Michael Rodriguez — Porthaven + Panorama
      { userId: 4, projectId: 1, committed: 1000000, called: 800000, currentValue: 960000, irr: 17.8, moic: 1.20 },
      { userId: 4, projectId: 4, committed: 750000, called: 750000, currentValue: 825000, irr: 14.5, moic: 1.10 },
      // Lisa Park — all 4 projects (pension fund)
      { userId: 5, projectId: 1, committed: 2000000, called: 1600000, currentValue: 1920000, irr: 16.8, moic: 1.20 },
      { userId: 5, projectId: 2, committed: 1500000, called: 750000, currentValue: 802500, irr: 15.0, moic: 1.07 },
      { userId: 5, projectId: 3, committed: 800000, called: 400000, currentValue: 430000, irr: 11.5, moic: 1.08 },
      { userId: 5, projectId: 4, committed: 1200000, called: 1200000, currentValue: 1320000, irr: 13.8, moic: 1.10 },
    ],
  });
  console.log("  InvestorProjects: 10");

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

  // ─── Documents (with real PDFs) ───
  const documentsSpec = [
    {
      id: 1, projectId: 1, name: "Q2 2025 — Porthaven Quarterly Report", category: "Reporting", date: "Jul 15, 2025", status: "published",
      storageKey: "documents/project-1/q2-2025-quarterly-report.pdf",
      pdfTitle: "Q2 2025 Quarterly Report — Porthaven",
      pdfBody: "Dear Investors,\n\nWe are pleased to provide this quarterly update on the Porthaven development.\n\nConstruction Progress\nThe project has reached 68% completion as of Q2 2025. Structural concrete is complete on floors 1-4, and exterior cladding installation has begun on the south facade. Interior framing is progressing on schedule.\n\nFinancial Summary\n• Total Raise: $6,000,000\n• Capital Called: 82%\n• Units Sold: 42 of 108 (39%)\n• Revenue to Date: $18,500,000\n• Current IRR: 18.4%\n• MOIC: 1.20x\n\nRetail Pre-Leasing\nWe have received strong interest from two national tenants for the ground-floor retail space. Letters of intent are anticipated in Q3 2025.\n\nNext Steps\n• Complete exterior cladding (Q3 2025)\n• Begin interior finishing on floors 1-2 (Q3 2025)\n• Finalize retail LOIs\n\nPlease contact Investor Relations with any questions.\n\nBest regards,\nGord Wylie\nPresident, Northstar Pacific Development Group",
      pdfMeta: { Project: "Porthaven", Period: "Q2 2025", Date: "July 15, 2025" },
    },
    {
      id: 3, projectId: 1, name: "Porthaven — Construction Progress Photos", category: "Property Update", date: "Jun 28, 2025", status: "published",
      storageKey: "documents/project-1/porthaven-construction-photos.pdf",
      pdfTitle: "Construction Progress Update — Porthaven",
      pdfBody: "Porthaven Construction Update — June 2025\n\nThis report documents the construction progress at the Porthaven mixed-use development in Downtown Port Coquitlam.\n\nSite Overview\nThe 108-unit residential building with curated ground-floor retail is progressing on schedule. The structure is now visible from all surrounding streets and the project is generating significant community interest.\n\nKey Milestones Achieved\n• Foundation and underground parking: COMPLETE\n• Structural concrete floors 1-4: COMPLETE\n• Mechanical rough-in floors 1-2: COMPLETE\n• Exterior cladding south facade: IN PROGRESS (40%)\n• Elevator shaft construction: COMPLETE\n\nUpcoming Work (Q3 2025)\n• Continue exterior cladding on remaining facades\n• Begin window installation floors 1-3\n• Interior framing floors 3-4\n• MEP rough-in floors 3-4\n\nSafety Record\n• 0 lost-time incidents\n• 245 consecutive safe work days\n\nPhotographs are available upon request via your Investor Relations contact.\n\nMarcon Construction Ltd.\nGeneral Contractor",
      pdfMeta: { Project: "Porthaven", Type: "Construction Update", Date: "June 28, 2025" },
    },
    {
      id: 7, projectId: 1, name: "PPM — Porthaven", category: "Offering", date: "Feb 12, 2025", status: "published",
      storageKey: "documents/project-1/ppm-porthaven.pdf",
      pdfTitle: "Private Placement Memorandum — Porthaven Development LP",
      pdfBody: "CONFIDENTIAL\n\nPrivate Placement Memorandum\nPorthaven Development Limited Partnership\n\nOffering Summary\n• Issuer: Porthaven Development LP\n• General Partner: Northstar Pacific Development Group Inc.\n• Target Raise: $6,000,000\n• Minimum Investment: $100,000\n• Preferred Return: 8.0% per annum\n• GP Catch-Up: 100% until 20/80 split\n• Carried Interest: 20% GP / 80% LP (above preferred return)\n• Estimated Term: 36 months\n\nProject Description\nPorthaven is a mixed-use development comprising 108 residential units and curated ground-floor retail space in Downtown Port Coquitlam, BC. The project is situated adjacent to Leigh Square, the cultural heart of the city.\n\nInvestment Highlights\n• Pre-sold 42 of 108 units representing $18.5M in revenue\n• Experienced development team with 15+ years track record\n• Strong market fundamentals in Tri-Cities submarket\n• Construction financing secured with Tier 1 lender\n\nRisk Factors\nThis investment involves significant risks. Please review the full risk factors section before investing. Past performance is not indicative of future results.\n\nThis memorandum is provided for informational purposes only and does not constitute an offer to sell or solicitation of an offer to buy any securities.",
      pdfMeta: { Issuer: "Porthaven Development LP", Date: "February 12, 2025", Classification: "CONFIDENTIAL" },
    },
    {
      id: 4, projectId: 2, name: "Capital Call Notice #4 — Livy", category: "Capital Call", date: "Jun 10, 2025", status: "action_required",
      storageKey: "documents/project-2/capital-call-notice-4.pdf",
      pdfTitle: "Capital Call Notice #4 — Livy Development LP",
      pdfBody: "CAPITAL CALL NOTICE\n\nTo: All Limited Partners — Livy Development LP\nFrom: Northstar Pacific Development Group Inc., as General Partner\nDate: June 10, 2025\nDue Date: June 30, 2025\n\nPursuant to Section 4.2 of the Limited Partnership Agreement dated January 15, 2024, the General Partner hereby issues Capital Call Notice #4.\n\nCall Details\n• Call Amount: Pro rata share of $875,000 aggregate\n• Purpose: Development permit fees, final architectural drawings, initial site preparation\n• Due Date: June 30, 2025\n• Wire Instructions: See below\n\nYour Pro Rata Share\nPlease refer to your individual capital account statement for your specific call amount based on your committed capital percentage.\n\nWire Instructions\nBank: Royal Bank of Canada\nAccount: Livy Development LP — Capital Account\nTransit: [Provided separately via secure portal]\nAccount #: [Provided separately via secure portal]\nReference: CC4-[Your Investor ID]\n\nPlease confirm receipt of this notice and your anticipated funding date by replying through the investor portal or contacting ir@northstardevelopment.ca.\n\nNorthstar Pacific Development Group Inc.\nAs General Partner of Livy Development LP",
      pdfMeta: { Fund: "Livy Development LP", Notice: "#4", Due: "June 30, 2025" },
    },
    {
      id: 5, projectId: 2, name: "Subscription Agreement — Livy", category: "Legal", date: "Jun 10, 2025", status: "pending_signature",
      storageKey: "documents/project-2/subscription-agreement-livy.pdf",
      pdfTitle: "Subscription Agreement — Livy Development LP",
      pdfBody: "SUBSCRIPTION AGREEMENT\n\nLivy Development Limited Partnership\n\nThis Subscription Agreement (the \"Agreement\") is entered into between the undersigned investor (the \"Subscriber\") and Northstar Pacific Development Group Inc. (the \"General Partner\") on behalf of Livy Development LP (the \"Partnership\").\n\n1. Subscription\nThe Subscriber hereby subscribes for limited partnership interests in the Partnership in the amount set forth on the signature page.\n\n2. Representations\nThe Subscriber represents and warrants that:\na) The Subscriber is an \"accredited investor\" as defined under applicable securities legislation;\nb) The Subscriber has received and reviewed the Private Placement Memorandum;\nc) The Subscriber understands the risks associated with this investment;\nd) The funds being invested are not derived from illegal activity.\n\n3. Capital Contributions\nCapital contributions shall be made in accordance with capital call notices issued by the General Partner.\n\n4. Distributions\nDistributions shall be made in accordance with the waterfall structure outlined in the PPM.\n\n5. Transfer Restrictions\nLimited partnership interests may not be transferred without prior written consent of the General Partner.\n\n[Signature pages to follow]\n\nPrepared by: Northstar Pacific Development Group Inc.\nDate: June 10, 2025",
      pdfMeta: { Fund: "Livy Development LP", Type: "Legal Agreement", Date: "June 10, 2025" },
    },
    {
      id: 2, projectId: null, name: "K-1 Tax Package — FY 2024", category: "Tax", date: "Mar 1, 2025", status: "published",
      storageKey: "documents/general/k1-tax-package-fy2024.pdf",
      pdfTitle: "Schedule K-1 Tax Package — Fiscal Year 2024",
      pdfBody: "K-1 TAX DOCUMENT\n\nFiscal Year: 2024\nPartnership: Porthaven Development LP / Livy Development LP\nPrepared: March 1, 2025\n\nDear Investor,\n\nEnclosed please find your Schedule K-1 (Form 1065) for the fiscal year ended December 31, 2024. This document reports your share of the partnership's income, deductions, and credits for the tax year.\n\nKey Information\n• Ordinary Business Income (Loss): See Line 1\n• Net Rental Real Estate Income: See Line 2\n• Guaranteed Payments: See Line 4\n• Capital Gains: See Line 9a\n• Section 179 Deduction: See Line 12\n\nImportant Notes\n1. This K-1 should be provided to your tax advisor for inclusion in your personal tax return.\n2. Canadian investors: Please consult with your cross-border tax advisor regarding foreign tax credit implications.\n3. If you invested through an entity (LLC, Trust, IRA), the K-1 is issued to the entity.\n\nAmended K-1s\nIf a corrected K-1 is required, it will be issued within 30 days and you will be notified via the portal.\n\nQuestions? Contact ir@northstardevelopment.ca\n\nNorthstar Pacific Development Group Inc.",
      pdfMeta: { Year: "FY 2024", Prepared: "March 1, 2025", Type: "Tax Document" },
    },
    {
      id: 6, projectId: null, name: "Distribution Statement — Q1 2025", category: "Distribution", date: "Apr 5, 2025", status: "published",
      storageKey: "documents/general/distribution-statement-q1-2025.pdf",
      pdfTitle: "Distribution Statement — Q1 2025",
      pdfBody: "DISTRIBUTION STATEMENT\n\nPeriod: Q1 2025 (January 1 — March 31, 2025)\nPayment Date: April 9, 2025\n\nDear Investor,\n\nThis statement summarizes distributions paid for the quarter ending March 31, 2025.\n\nPorthaven Development LP\n• Distribution Type: Income\n• Gross Distribution: $6,800\n• Withholding: $0\n• Net Distribution: $6,800\n• Source: Retail pre-lease deposit income\n\nLivy Development LP\n• No distributions — project in pre-development phase\n\nYear-to-Date Summary\n• Total YTD Distributions: $6,800\n• Total Since Inception: $27,600\n\nPayment Method\nDistributions have been deposited to your account on file via wire transfer. Please allow 3-5 business days for processing.\n\nCapital Account Balance\nPlease refer to your Capital Account Statement for your current account balance, including unreturned capital and accrued preferred return.\n\nNorthstar Pacific Development Group Inc.\nInvestor Relations",
      pdfMeta: { Period: "Q1 2025", Payment: "April 9, 2025", Type: "Distribution" },
    },
    {
      id: 8, projectId: null, name: "Annual Investor Letter 2024", category: "Reporting", date: "Jan 20, 2025", status: "published",
      storageKey: "documents/general/annual-investor-letter-2024.pdf",
      pdfTitle: "Annual Investor Letter — 2024",
      pdfBody: "Dear Partners,\n\nAs we close the books on 2024, I want to take a moment to reflect on a year of significant progress across our portfolio and share our outlook for 2025.\n\n2024 Highlights\n\nPorthaven (Downtown Port Coquitlam)\nOur flagship mixed-use development reached 55% completion by year-end. Pre-sales have been strong with 42 of 108 units sold, generating $18.5M in revenue commitments. The project remains on budget and on schedule for Q2 2027 completion.\n\nLivy (Port Coquitlam)\nWe completed the architectural design phase with RHA Architecture and initiated the development permit process. The optimized unit mix reflects strong demand for studio and 1-bedroom units in the transit-oriented Poco market.\n\nEstrella (British Columbia)\nConstruction commenced on our 40-unit purpose-built rental, achieving 35% completion by year-end. The 20% affordable housing allocation secured favorable CMHC MLI Select financing terms.\n\nPanorama Building 6 (Surrey)\nCompleted and handed over in October 2024. The 55,000sf federal office building is fully leased to the Government of Canada on a long-term net lease, providing stable cash flow to investors.\n\n2025 Outlook\nWe anticipate continued strong performance across the portfolio. Key milestones include advancing Porthaven past 80% completion, securing the Livy development permit, and completing the Estrella rental project.\n\nThank you for your continued partnership and trust.\n\nWarm regards,\nGord Wylie\nPresident, Northstar Pacific Development Group",
      pdfMeta: { Year: "2024", Author: "Gord Wylie, President", Date: "January 20, 2025" },
    },
  ];

  // Generate and upload PDF files, then create document records
  for (const d of documentsSpec) {
    const pdfBuffer = await generatePDF(d.pdfTitle, d.pdfBody, d.pdfMeta);
    await storage.upload(d.storageKey, pdfBuffer, "application/pdf");
    const bytes = pdfBuffer.length;
    const size = bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
    await prisma.document.create({
      data: {
        id: d.id, projectId: d.projectId, name: d.name, category: d.category,
        date: d.date, size, status: d.status,
        file: `/uploads/${d.storageKey}`, storageKey: d.storageKey,
      },
    });
  }
  console.log("  Documents: " + documentsSpec.length + " (with PDF files)");

  // Assign documents to investors based on their project access
  const allDocs = await prisma.document.findMany();
  const allInvestors = [investor, investor2, investor3, investor4];
  let assignCount = 0;
  for (const doc of allDocs) {
    for (const inv of allInvestors) {
      // General docs (no project) go to everyone; project docs go to investors in that project
      if (!doc.projectId) {
        await prisma.documentAssignment.create({ data: { documentId: doc.id, userId: inv.id } }).catch(() => {});
        assignCount++;
      } else {
        const hasProject = await prisma.investorProject.findFirst({ where: { userId: inv.id, projectId: doc.projectId } });
        if (hasProject) {
          await prisma.documentAssignment.create({ data: { documentId: doc.id, userId: inv.id } }).catch(() => {});
          assignCount++;
        }
      }
    }
  }
  console.log("  DocumentAssignments: " + assignCount);

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

  // Add recipients for messages
  const allMessages = await prisma.message.findMany();
  for (const msg of allMessages) {
    try {
      await prisma.messageRecipient.create({
        data: { messageId: msg.id, userId: investor.id },
      });
    } catch (e) { /* skip duplicates */ }
  }
  console.log("  MessageRecipients: " + allMessages.length);

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
    // Add all investors as recipients based on targeting
    const recipientIds = [];
    if (t.targetType === "ALL") {
      recipientIds.push(1, 3, 4, 5); // all investors
    } else if (t.targetProjectId) {
      // Get investors in the target project
      const projInvestors = await prisma.investorProject.findMany({
        where: { projectId: t.targetProjectId }, select: { userId: true },
      });
      recipientIds.push(...projInvestors.map(pi => pi.userId));
    } else {
      recipientIds.push(1); // fallback: James Chen only
    }
    for (const uid of recipientIds) {
      await prisma.threadRecipient.create({
        data: { threadId: thread.id, userId: uid, unread: uid === 1 ? i < 2 : i < 3 },
      });
    }
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
  const notifPrefUsers = [
    { userId: 1, emailDocuments: true, emailSignatures: true, emailDistributions: true, emailMessages: true, emailCapitalCalls: true },
    { userId: 2, emailDocuments: true, emailSignatures: true, emailDistributions: false, emailMessages: true, emailCapitalCalls: true },
    { userId: 3, emailDocuments: true, emailSignatures: true, emailDistributions: true, emailMessages: true, emailCapitalCalls: true },
    { userId: 4, emailDocuments: true, emailSignatures: true, emailDistributions: true, emailMessages: false, emailCapitalCalls: true },
    { userId: 5, emailDocuments: true, emailSignatures: true, emailDistributions: true, emailMessages: true, emailCapitalCalls: true },
  ];
  for (const pref of notifPrefUsers) {
    await prisma.notificationPreference.create({ data: pref });
  }
  console.log("  NotificationPreferences: " + notifPrefUsers.length);

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
  // Add investors to groups
  await prisma.groupMember.create({ data: { groupId: classAGroup.id, userId: 1 } });  // James Chen
  await prisma.groupMember.create({ data: { groupId: classAGroup.id, userId: 3 } });  // Sarah Whitfield
  await prisma.groupMember.create({ data: { groupId: classAGroup.id, userId: 5 } });  // Lisa Park
  await prisma.groupMember.create({ data: { groupId: subLPGroup.id, userId: 1 } });   // James — West Coast
  await prisma.groupMember.create({ data: { groupId: subLPGroup.id, userId: 3 } });   // Sarah — West Coast
  await prisma.groupMember.create({ data: { groupId: classBGroup.id, userId: 4 } });  // Michael Rodriguez
  console.log("  InvestorGroups: 3 (with hierarchy), 6 memberships");

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
    // Porthaven — Sarah Whitfield
    { userId: 3, projectId: 1, date: new Date("2023-03-01"), amount: -1000000, type: "capital_call", description: "Initial investment" },
    { userId: 3, projectId: 1, date: new Date("2023-09-15"), amount: -200000, type: "capital_call", description: "Capital call #2" },
    { userId: 3, projectId: 1, date: new Date("2024-09-15"), amount: 25500, type: "distribution", description: "Q3 2024 income distribution" },
    { userId: 3, projectId: 1, date: new Date("2025-03-15"), amount: 27200, type: "distribution", description: "Q1 2025 income distribution" },
    // Estrella — Sarah Whitfield
    { userId: 3, projectId: 3, date: new Date("2024-06-01"), amount: -200000, type: "capital_call", description: "Initial investment" },
    // Porthaven — Michael Rodriguez
    { userId: 4, projectId: 1, date: new Date("2023-06-01"), amount: -800000, type: "capital_call", description: "Initial investment" },
    { userId: 4, projectId: 1, date: new Date("2024-09-15"), amount: 17000, type: "distribution", description: "Q3 2024 income distribution" },
    { userId: 4, projectId: 1, date: new Date("2025-03-15"), amount: 18100, type: "distribution", description: "Q1 2025 income distribution" },
    // Panorama — Michael Rodriguez
    { userId: 4, projectId: 4, date: new Date("2022-06-01"), amount: -750000, type: "capital_call", description: "Initial investment" },
    { userId: 4, projectId: 4, date: new Date("2024-12-15"), amount: 22500, type: "distribution", description: "Q4 2024 income distribution" },
    // Porthaven — Lisa Park
    { userId: 5, projectId: 1, date: new Date("2023-01-15"), amount: -1600000, type: "capital_call", description: "Initial investment" },
    { userId: 5, projectId: 1, date: new Date("2024-09-15"), amount: 34000, type: "distribution", description: "Q3 2024 income distribution" },
    { userId: 5, projectId: 1, date: new Date("2025-03-15"), amount: 36200, type: "distribution", description: "Q1 2025 income distribution" },
    // Livy — Lisa Park
    { userId: 5, projectId: 2, date: new Date("2024-01-15"), amount: -750000, type: "capital_call", description: "Initial investment" },
    // Estrella — Lisa Park
    { userId: 5, projectId: 3, date: new Date("2024-03-01"), amount: -400000, type: "capital_call", description: "Initial investment" },
    // Panorama — Lisa Park
    { userId: 5, projectId: 4, date: new Date("2022-03-01"), amount: -1200000, type: "capital_call", description: "Initial investment" },
    { userId: 5, projectId: 4, date: new Date("2024-12-15"), amount: 36000, type: "distribution", description: "Q4 2024 income distribution" },
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
