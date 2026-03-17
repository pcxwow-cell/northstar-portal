import { jsPDF } from "jspdf";
import fs from "fs";

const BRAND = {
  name: "NORTHSTAR",
  sub: "Pacific Development Group",
  address: "710 – 1199 W Pender Street, Vancouver BC V6E 2R1",
  phone: "(604) 555-0140",
  email: "ir@northstarpacific.ca",
  fund: "Northstar Real Estate Fund I",
  red: [179, 58, 58],
  dark: [6, 6, 6],
  gray: [140, 136, 127],
  light: [232, 228, 222],
};

function addHeader(doc) {
  doc.setFillColor(...BRAND.dark);
  doc.rect(0, 0, 210, 32, "F");
  doc.setFillColor(...BRAND.red);
  doc.rect(0, 32, 210, 0.5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text(BRAND.name, 20, 18);
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.gray);
  doc.text(BRAND.sub, 20, 25);
  doc.text(BRAND.fund, 190, 18, { align: "right" });
  doc.text("CONFIDENTIAL", 190, 25, { align: "right" });
}

function addFooter(doc, page, total) {
  const y = 280;
  doc.setDrawColor(...BRAND.gray);
  doc.setLineWidth(0.2);
  doc.line(20, y, 190, y);
  doc.setFontSize(7);
  doc.setTextColor(...BRAND.gray);
  doc.text(BRAND.address, 20, y + 5);
  doc.text(`Page ${page} of ${total}`, 190, y + 5, { align: "right" });
  doc.text("This document is confidential and intended solely for the named recipient.", 105, y + 9, { align: "center" });
}

function addSection(doc, y, title, content) {
  doc.setFontSize(12);
  doc.setTextColor(...BRAND.red);
  doc.text(title, 20, y);
  y += 3;
  doc.setDrawColor(...BRAND.red);
  doc.setLineWidth(0.3);
  doc.line(20, y, 80, y);
  y += 7;
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  const lines = doc.splitTextToSize(content, 170);
  doc.text(lines, 20, y);
  return y + lines.length * 4.5;
}

function addTable(doc, y, headers, rows) {
  const colW = 170 / headers.length;
  // Header row
  doc.setFillColor(240, 238, 235);
  doc.rect(20, y - 4, 170, 8, "F");
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  headers.forEach((h, i) => doc.text(h, 22 + i * colW, y));
  y += 8;
  // Data rows
  doc.setTextColor(40, 40, 40);
  rows.forEach(row => {
    row.forEach((cell, i) => doc.text(String(cell), 22 + i * colW, y));
    y += 6;
  });
  return y + 4;
}

// ─── 1. Q2 2025 Quarterly Report ────────────────────────
function genQuarterlyReport() {
  const doc = new jsPDF();
  addHeader(doc);
  let y = 48;

  doc.setFontSize(20);
  doc.setTextColor(30, 30, 30);
  doc.text("Q2 2025 — Quarterly Report", 20, y);
  y += 6;
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.gray);
  doc.text("Reporting Period: April 1 – June 30, 2025  |  Prepared: July 15, 2025", 20, y);
  y += 14;

  y = addSection(doc, y, "Portfolio Summary",
    "The Fund's net asset value increased to $15.2M as of June 30, 2025, representing a 17.9% net IRR since inception. Total capital called to date is $20.25M against $25M in commitments. The portfolio continues to perform ahead of underwriting across all four assets.");
  y += 4;

  y = addTable(doc, y,
    ["Metric", "Q2 2025", "Q1 2025", "Change"],
    [
      ["Net Asset Value", "$15,200,000", "$14,600,000", "+4.1%"],
      ["Net IRR", "17.9%", "17.2%", "+70 bps"],
      ["MOIC", "1.22x", "1.18x", "+0.04x"],
      ["DPI", "0.07x", "0.05x", "+0.02x"],
      ["Distributions (QTD)", "$102,000", "$91,000", "+12.1%"],
    ]);
  y += 4;

  y = addSection(doc, y, "Property Updates",
    "Porthaven: 68% complete. Structural concrete floors 1-4 done, exterior cladding begun. Livy: Development permit filed June 10. Estrella: 45% complete, wood-frame progressing. Panorama Building 6: Fully leased, stable cash flow.");
  y += 4;

  y = addSection(doc, y, "Capital Activity",
    "Capital Call #4 issued June 10 for $450,000 per LP unit to fund Livy pre-development. Total unfunded commitments remaining: $4.75M. Next estimated call: Q4 2025 for Estrella construction draw.");
  y += 4;

  y = addSection(doc, y, "Outlook",
    "We remain constructive on the Western Canada multifamily market. Pre-sale activity at Porthaven is ahead of plan with 62 of 108 units reserved. The Fund is well-positioned to deliver top-quartile returns.");

  addFooter(doc, 1, 1);
  doc.save("public/docs/q2-2025-quarterly-report.pdf");
}

// ─── 2. K-1 Tax Package ─────────────────────────────────
function genK1() {
  const doc = new jsPDF();
  addHeader(doc);
  let y = 48;

  doc.setFontSize(20);
  doc.setTextColor(30, 30, 30);
  doc.text("Schedule K-1 Tax Package — FY 2024", 20, y);
  y += 6;
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.gray);
  doc.text("Tax Year: January 1 – December 31, 2024  |  Issued: March 1, 2025", 20, y);
  y += 14;

  y = addSection(doc, y, "Partner Information",
    "Partner Name: James Chen\nTIN: ***-**-4821\nPartner Type: Limited Partner — Class B\nPartnership: Northstar Real Estate Fund I, LP\nEIN: 84-3291057");
  y += 4;

  y = addTable(doc, y,
    ["Line Item", "Amount", "Code"],
    [
      ["Ordinary business income (loss)", "$186,400", "Line 1"],
      ["Net rental real estate income", "$142,300", "Line 2"],
      ["Guaranteed payments", "$0", "Line 4"],
      ["Net capital gain (loss)", "$44,100", "Line 9a"],
      ["Total distributions", "$360,000", "Line 19"],
      ["Partner's capital account (end)", "$3,600,000", "Line L"],
    ]);
  y += 4;

  y = addSection(doc, y, "State Allocations",
    "British Columbia, Canada: 100% of partnership income is allocated to the Canadian jurisdiction. As a Canadian partnership, the Fund issues T5013 slips for Canadian tax purposes. This K-1 equivalent is prepared for informational purposes.");
  y += 4;

  y = addSection(doc, y, "Important Tax Notes",
    "This document is provided for informational purposes. Please consult your tax advisor regarding the treatment of these items on your individual return. The partnership has made no Section 754 elections for the current tax year.");

  addFooter(doc, 1, 1);
  doc.save("public/docs/k1-tax-package-fy2024.pdf");
}

// ─── 3. Construction Progress Photos ────────────────────
function genProgressPhotos() {
  const doc = new jsPDF();
  addHeader(doc);
  let y = 48;

  doc.setFontSize(20);
  doc.setTextColor(30, 30, 30);
  doc.text("Porthaven — Construction Progress", 20, y);
  y += 6;
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.gray);
  doc.text("Photo Documentation  |  June 28, 2025  |  68% Complete", 20, y);
  y += 14;

  y = addSection(doc, y, "Construction Milestone Summary",
    "Porthaven has reached 68% completion as of June 28, 2025. Key milestones achieved this period include completion of structural concrete on floors 1-4, commencement of exterior cladding on the south facade, and substantial completion of underground parking.");
  y += 4;

  // Photo placeholders
  const photos = [
    ["South Facade — Exterior Cladding Installation", "Taken June 26, 2025 — Floors 1-3 cladding panels installed"],
    ["Underground Parking — Level P1", "Taken June 20, 2025 — Mechanical and electrical rough-in complete"],
    ["Tower Core — Floor 4 Concrete Pour", "Taken June 15, 2025 — Structural concrete placement in progress"],
    ["Site Aerial — Northeast View", "Taken June 28, 2025 — Overall project progress from drone survey"],
  ];

  photos.forEach(([title, caption]) => {
    doc.setFillColor(230, 228, 225);
    doc.rect(20, y, 170, 35, "F");
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text("[Photo]", 105, y + 18, { align: "center" });
    y += 38;
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    doc.text(title, 20, y);
    y += 4;
    doc.setFontSize(7);
    doc.setTextColor(...BRAND.gray);
    doc.text(caption, 20, y);
    y += 8;
  });

  addFooter(doc, 1, 1);
  doc.save("public/docs/porthaven-construction-photos.pdf");
}

// ─── 4. Capital Call Notice #4 ──────────────────────────
function genCapitalCall() {
  const doc = new jsPDF();
  addHeader(doc);
  let y = 48;

  doc.setFillColor(255, 248, 240);
  doc.rect(20, y - 6, 170, 12, "F");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.red);
  doc.text("ACTION REQUIRED — Response Due: June 30, 2025", 105, y, { align: "center" });
  y += 14;

  doc.setFontSize(20);
  doc.setTextColor(30, 30, 30);
  doc.text("Capital Call Notice #4", 20, y);
  y += 6;
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.gray);
  doc.text("Livy Development — Pre-Development Funding  |  Issued: June 10, 2025", 20, y);
  y += 14;

  y = addSection(doc, y, "Call Details",
    "Pursuant to Section 4.2 of the Limited Partnership Agreement dated March 15, 2023, Northstar GP LLC hereby issues Capital Call Notice #4 for the purpose of funding pre-development activities for the Livy residential project in Port Coquitlam, BC.");
  y += 4;

  y = addTable(doc, y,
    ["Item", "Detail"],
    [
      ["Call Amount (Your Share)", "$450,000"],
      ["Purpose", "Livy Pre-Development"],
      ["Due Date", "June 30, 2025"],
      ["Total Fund Call", "$4,750,000"],
      ["Cumulative Called (Post)", "$20,250,000"],
      ["Remaining Commitment", "$4,750,000"],
    ]);
  y += 4;

  y = addSection(doc, y, "Wire Instructions",
    "Bank: Royal Bank of Canada — Commercial Banking\nAccount Name: Northstar Real Estate Fund I, LP\nTransit: 00246\nAccount: 1039-284-7\nReference: CC4-CHEN-2025");
  y += 4;

  y = addSection(doc, y, "Use of Proceeds",
    "Architecture & Design (RHA Architecture): $1,200,000\nDevelopment Permit & Municipal Fees: $380,000\nGeotechnical & Environmental Studies: $220,000\nLegal & Advisory: $150,000\nProject Management & Contingency: $300,000");

  addFooter(doc, 1, 1);
  doc.save("public/docs/capital-call-notice-4.pdf");
}

// ─── 5. Subscription Agreement — Fund II ────────────────
function genSubscription() {
  const doc = new jsPDF();
  addHeader(doc);
  let y = 48;

  doc.setFillColor(255, 248, 230);
  doc.rect(20, y - 6, 170, 12, "F");
  doc.setFontSize(10);
  doc.setTextColor(139, 113, 40);
  doc.text("PENDING SIGNATURE — DocuSign envelope sent to j.chen@pacificventures.ca", 105, y, { align: "center" });
  y += 14;

  doc.setFontSize(20);
  doc.setTextColor(30, 30, 30);
  doc.text("Subscription Agreement", 20, y);
  y += 6;
  doc.setFontSize(11);
  doc.text("Northstar Real Estate Fund II, LP", 20, y);
  y += 5;
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.gray);
  doc.text("Prepared: June 10, 2025  |  Target Close: August 31, 2025", 20, y);
  y += 14;

  y = addSection(doc, y, "Subscriber Information",
    "Name: James Chen\nEntity: Pacific Ventures Capital Corp.\nAddress: 1200 – 1055 W Georgia St, Vancouver BC V6E 3P3\nAccredited Investor Status: Confirmed (Net Income > $200,000)");
  y += 4;

  y = addTable(doc, y,
    ["Term", "Detail"],
    [
      ["Subscription Amount", "$5,000,000"],
      ["Unit Class", "LP — Class A"],
      ["Management Fee", "1.5% on committed capital"],
      ["Carried Interest", "20% above 8% preferred return"],
      ["Fund Term", "7 years + 2 × 1-year extensions"],
      ["Target Fund Size", "$50,000,000"],
      ["GP Co-Investment", "5% minimum"],
    ]);
  y += 4;

  y = addSection(doc, y, "Representations & Warranties",
    "By executing this Subscription Agreement, the Subscriber represents that: (i) Subscriber is an accredited investor as defined under NI 45-106; (ii) Subscriber has received and reviewed the Confidential Private Placement Memorandum; (iii) Subscriber acknowledges the illiquid nature of the investment and the risks described therein.");
  y += 4;

  // Signature block
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text("Signature", 20, y);
  y += 8;
  doc.setDrawColor(...BRAND.gray);
  doc.setLineWidth(0.3);
  doc.line(20, y, 90, y);
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.gray);
  doc.text("Subscriber Signature", 20, y + 4);
  doc.line(110, y, 180, y);
  doc.text("Date", 110, y + 4);

  addFooter(doc, 1, 1);
  doc.save("public/docs/subscription-agreement-fund-ii.pdf");
}

// ─── 6. Distribution Statement — Q1 2025 ────────────────
function genDistStatement() {
  const doc = new jsPDF();
  addHeader(doc);
  let y = 48;

  doc.setFontSize(20);
  doc.setTextColor(30, 30, 30);
  doc.text("Distribution Statement — Q1 2025", 20, y);
  y += 6;
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.gray);
  doc.text("Period: January 1 – March 31, 2025  |  Payment Date: April 9, 2025", 20, y);
  y += 14;

  y = addSection(doc, y, "Distribution Summary",
    "We are pleased to confirm your Q1 2025 distribution from Northstar Real Estate Fund I. This distribution represents income generated primarily from the Panorama Building 6 net lease and partial returns from the broader portfolio.");
  y += 4;

  y = addTable(doc, y,
    ["Component", "Amount", "% of Total"],
    [
      ["Net Rental Income — Panorama B6", "$52,000", "57.1%"],
      ["Interest Income — Fund Cash", "$8,200", "9.0%"],
      ["Operating Income — Portfolio", "$30,800", "33.9%"],
      ["Total Gross Distribution", "$91,000", "100.0%"],
      ["Less: Management Fee", "($0)", "Netted"],
      ["Net Distribution", "$91,000", ""],
    ]);
  y += 4;

  y = addSection(doc, y, "Payment Details",
    "Amount: $91,000.00 CAD\nMethod: Electronic Funds Transfer\nAccount: Royal Bank ****7832\nReference: NREF1-Q125-CHEN\nStatus: Paid — April 9, 2025");
  y += 4;

  y = addTable(doc, y,
    ["Period", "Distribution", "Cumulative"],
    [
      ["Q1 2024", "$84,000", "$84,000"],
      ["Q2 2024", "$92,000", "$176,000"],
      ["Q3 2024", "$88,000", "$264,000"],
      ["Q4 2024", "$96,000", "$360,000"],
      ["Q1 2025", "$91,000", "$451,000"],
    ]);

  addFooter(doc, 1, 1);
  doc.save("public/docs/distribution-statement-q1-2025.pdf");
}

// ─── 7. PPM — Fund I Overview ───────────────────────────
function genPPM() {
  const doc = new jsPDF();
  addHeader(doc);
  let y = 48;

  doc.setFontSize(22);
  doc.setTextColor(30, 30, 30);
  doc.text("Confidential Private Placement", 20, y);
  y += 8;
  doc.text("Memorandum", 20, y);
  y += 6;
  doc.setFontSize(11);
  doc.setTextColor(...BRAND.gray);
  doc.text("Northstar Real Estate Fund I, LP  |  February 2025 (Updated)", 20, y);
  y += 14;

  y = addSection(doc, y, "Fund Overview",
    "Northstar Real Estate Fund I is a closed-end real estate private equity fund focused on value-add multifamily and mixed-use developments in Western Canada. The Fund targets a net IRR of 15-20% and a 1.5-1.8x MOIC over a 7-year term.");
  y += 4;

  y = addTable(doc, y,
    ["Term", "Detail"],
    [
      ["Fund Size", "$25,000,000 (fully committed)"],
      ["Strategy", "Value-Add Multifamily & Mixed-Use"],
      ["Geography", "Metro Vancouver & Fraser Valley"],
      ["Vintage", "2023"],
      ["Term", "7 years + 2 × 1-year extensions"],
      ["Management Fee", "1.5% on committed (invest) / NAV (harvest)"],
      ["Carried Interest", "20% above 8% preferred return"],
      ["GP Commitment", "$1,250,000 (5.0%)"],
      ["Minimum LP Commitment", "$500,000"],
    ]);
  y += 4;

  y = addSection(doc, y, "Investment Strategy",
    "The Fund pursues a disciplined approach to value creation through: (i) acquisition of well-located development sites; (ii) entitlement and development management; (iii) construction oversight with fixed-price GMP contracts; and (iv) disposition or stabilization of completed assets.");
  y += 4;

  y = addSection(doc, y, "Risk Factors (Summary)",
    "Investment in the Fund involves significant risks including but not limited to: illiquidity, construction risk, market risk, interest rate risk, regulatory risk, concentration risk, and the potential for total loss of invested capital. This memorandum does not constitute an offer to sell in any jurisdiction where such offer would be unlawful.");

  addFooter(doc, 1, 1);
  doc.save("public/docs/ppm-fund-i-overview.pdf");
}

// ─── 8. Annual Investor Letter 2024 ─────────────────────
function genAnnualLetter() {
  const doc = new jsPDF();
  addHeader(doc);
  let y = 48;

  doc.setFontSize(20);
  doc.setTextColor(30, 30, 30);
  doc.text("Annual Investor Letter 2024", 20, y);
  y += 6;
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.gray);
  doc.text("From the Desk of Gord Wylie, President  |  January 20, 2025", 20, y);
  y += 14;

  y = addSection(doc, y, "Dear Partners,",
    "I am pleased to share our 2024 annual review for Northstar Real Estate Fund I. The past year has been one of meaningful progress across our portfolio, and I am grateful for your continued trust and partnership as we execute on our investment thesis.");
  y += 4;

  y = addSection(doc, y, "2024 Performance Highlights",
    "The Fund delivered a net IRR of 17.9% and a 1.22x MOIC in 2024, exceeding our initial underwriting targets. Net asset value grew from $12.4M to $14.9M over the year, driven by construction milestones at Porthaven and Estrella, and stable income from Panorama Building 6.");
  y += 4;

  y = addTable(doc, y,
    ["Metric", "YE 2024", "YE 2023", "Target"],
    [
      ["Net IRR", "17.9%", "12.1%", "15-20%"],
      ["MOIC", "1.22x", "1.08x", "1.5-1.8x"],
      ["Total Distributions", "$360,000", "$0", "—"],
      ["Capital Called", "$20,250,000", "$15,500,000", "$25,000,000"],
    ]);
  y += 4;

  y = addSection(doc, y, "Portfolio Review",
    "Porthaven reached 55% completion and continues on schedule for Q4 2025 delivery. Panorama Building 6, our first completed asset, generated $368,000 in net rental income. The Livy project advanced through design with development permit submission imminent. Estrella broke ground in Q3 with CMHC financing secured.");
  y += 4;

  y = addSection(doc, y, "Looking Ahead to 2025",
    "We enter 2025 with strong momentum. Porthaven pre-sales are tracking well, and we expect to commence Livy construction in H2 2025. We remain disciplined in our capital allocation and committed to delivering superior risk-adjusted returns.\n\nWith appreciation,\nGord Wylie\nPresident, Northstar Pacific Development Group");

  addFooter(doc, 1, 1);
  doc.save("public/docs/annual-investor-letter-2024.pdf");
}

// Generate all
genQuarterlyReport();
genK1();
genProgressPhotos();
genCapitalCall();
genSubscription();
genDistStatement();
genPPM();
genAnnualLetter();

console.log("✓ All 8 PDFs generated in public/docs/");
