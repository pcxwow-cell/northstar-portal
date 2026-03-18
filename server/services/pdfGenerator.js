// ─── PDF DOCUMENT GENERATOR ────────────────────────────
// Generates capital call notices, distribution statements, and quarterly reports as PDFs.

const PDFDocument = require("pdfkit");

const BRAND = {
  red: "#EA2028",
  dark: "#231F20",
  gray: "#767168",
  lightGray: "#ECEAE5",
  bg: "#F8F7F4",
};

/**
 * Render the Northstar letterhead header on a PDF page.
 * @param {PDFDocument} doc
 */
function renderHeader(doc) {
  // Red bar
  doc.rect(0, 0, 612, 4).fill(BRAND.red);

  // Company name
  doc.fontSize(18).font("Helvetica-Bold").fillColor(BRAND.dark).text("NORTHSTAR", 50, 30);
  doc.fontSize(8).font("Helvetica").fillColor(BRAND.gray).text("PACIFIC DEVELOPMENT GROUP", 50, 52);

  // Right-aligned address
  doc.fontSize(8).font("Helvetica").fillColor(BRAND.gray)
    .text("710 – 1199 W Pender St", 400, 30, { align: "right", width: 162 })
    .text("Vancouver, BC V6E 2R1", 400, 42, { align: "right", width: 162 });

  // Separator
  doc.moveTo(50, 70).lineTo(562, 70).stroke(BRAND.lightGray);

  doc.y = 90;
}

/**
 * Render footer with page number and disclaimer.
 * @param {PDFDocument} doc
 * @param {number} pageNum
 */
function renderFooter(doc, pageNum) {
  doc.fontSize(7).font("Helvetica").fillColor(BRAND.gray)
    .text("This notice is provided for informational purposes only. Please refer to your subscription agreement for definitive terms.", 50, 720, { width: 512, align: "center" })
    .text(`Page ${pageNum}`, 50, 740, { width: 512, align: "center" });
  // Bottom red bar
  doc.rect(0, 758, 612, 4).fill(BRAND.red);
}

/**
 * Generate a Capital Call Notice PDF.
 *
 * @param {object} params
 * @param {string} params.investorName
 * @param {string} params.projectName
 * @param {string} params.projectLocation
 * @param {number} params.callNumber — e.g. 4
 * @param {number} params.callAmount — dollar amount
 * @param {string} params.dueDate — formatted date string
 * @param {number} params.totalCommitted
 * @param {number} params.previouslyCalled
 * @param {string} params.bankName
 * @param {string} params.bankAccount
 * @param {string} params.bankRouting
 * @param {string} [params.notes]
 * @returns {Promise<Buffer>} PDF buffer
 */
function generateCapitalCallPDF(params) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "LETTER", margin: 50 });
    const buffers = [];
    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    renderHeader(doc);

    const fmtCurrency = (n) => "$" + (n || 0).toLocaleString("en-US", { minimumFractionDigits: 2 });

    // Title
    doc.fontSize(20).font("Helvetica-Bold").fillColor(BRAND.dark)
      .text("Capital Call Notice", 50, doc.y);
    doc.moveDown(0.5);

    // Call number badge
    doc.fontSize(10).font("Helvetica").fillColor(BRAND.red)
      .text(`Capital Call #${params.callNumber || 1}`, 50, doc.y);
    doc.moveDown(1);

    // Date + addressee
    doc.fontSize(10).font("Helvetica").fillColor(BRAND.dark)
      .text(`Date: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`, 50, doc.y);
    doc.moveDown(0.5);
    doc.text(`To: ${params.investorName}`);
    doc.moveDown(0.5);
    doc.text(`Re: ${params.projectName}${params.projectLocation ? ` — ${params.projectLocation}` : ""}`);
    doc.moveDown(1.5);

    // Body
    doc.fontSize(10).font("Helvetica").fillColor(BRAND.dark)
      .text(`Dear ${params.investorName.split(" ")[0]},`, 50, doc.y);
    doc.moveDown(0.5);
    doc.text(
      `Pursuant to the terms of your subscription agreement, you are hereby notified of Capital Call #${params.callNumber || 1} ` +
      `for the ${params.projectName} development project. Please remit the amount specified below by the due date indicated.`,
      { width: 512, lineGap: 3 }
    );
    doc.moveDown(1.5);

    // Call details table
    const tableY = doc.y;
    const tableData = [
      ["Call Amount", fmtCurrency(params.callAmount)],
      ["Due Date", params.dueDate || "—"],
      ["Total Committed", fmtCurrency(params.totalCommitted)],
      ["Previously Called", fmtCurrency(params.previouslyCalled)],
      ["Remaining After This Call", fmtCurrency((params.totalCommitted || 0) - (params.previouslyCalled || 0) - (params.callAmount || 0))],
    ];

    // Table header
    doc.rect(50, tableY, 512, 24).fill("#F0EDE8");
    doc.fontSize(9).font("Helvetica-Bold").fillColor(BRAND.dark)
      .text("Description", 60, tableY + 7)
      .text("Amount", 400, tableY + 7, { width: 152, align: "right" });

    let rowY = tableY + 24;
    tableData.forEach(([label, value], i) => {
      if (i % 2 === 0) doc.rect(50, rowY, 512, 22).fill("#FAFAF8");
      doc.fontSize(10).font(i === 0 ? "Helvetica-Bold" : "Helvetica").fillColor(BRAND.dark)
        .text(label, 60, rowY + 5)
        .text(value, 400, rowY + 5, { width: 152, align: "right" });
      rowY += 22;
    });

    // Border
    doc.rect(50, tableY, 512, rowY - tableY).stroke(BRAND.lightGray);
    doc.y = rowY + 20;

    // Wire instructions
    if (params.bankName || params.bankAccount) {
      doc.fontSize(12).font("Helvetica-Bold").fillColor(BRAND.dark)
        .text("Wire Transfer Instructions", 50, doc.y);
      doc.moveDown(0.5);
      doc.fontSize(10).font("Helvetica").fillColor(BRAND.dark);
      if (params.bankName) doc.text(`Bank: ${params.bankName}`);
      if (params.bankAccount) doc.text(`Account: ${params.bankAccount}`);
      if (params.bankRouting) doc.text(`Routing: ${params.bankRouting}`);
      doc.text(`Reference: ${params.projectName} - CC#${params.callNumber || 1} - ${params.investorName}`);
      doc.moveDown(1);
    }

    // Notes
    if (params.notes) {
      doc.fontSize(10).font("Helvetica-Oblique").fillColor(BRAND.gray)
        .text(params.notes, 50, doc.y, { width: 512, lineGap: 2 });
      doc.moveDown(1);
    }

    // Signature area
    doc.moveDown(2);
    doc.fontSize(10).font("Helvetica").fillColor(BRAND.dark)
      .text("Sincerely,", 50, doc.y);
    doc.moveDown(2);
    doc.moveTo(50, doc.y).lineTo(250, doc.y).stroke(BRAND.lightGray);
    doc.moveDown(0.3);
    doc.text("Northstar Pacific Development Group");

    renderFooter(doc, 1);
    doc.end();
  });
}

/**
 * Generate a Quarterly Report cover PDF.
 *
 * @param {object} params
 * @param {string} params.projectName
 * @param {string} params.quarter — e.g. "Q2 2025"
 * @param {string} params.status
 * @param {number} params.completion
 * @param {string} params.summary
 * @param {Array<{label: string, value: string}>} params.metrics
 * @returns {Promise<Buffer>} PDF buffer
 */
function generateQuarterlyReportPDF(params) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "LETTER", margin: 50 });
    const buffers = [];
    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    renderHeader(doc);

    doc.fontSize(22).font("Helvetica-Bold").fillColor(BRAND.dark)
      .text(`${params.quarter} Quarterly Report`, 50, doc.y);
    doc.moveDown(0.3);
    doc.fontSize(14).font("Helvetica").fillColor(BRAND.gray)
      .text(params.projectName);
    doc.moveDown(1.5);

    // Status + completion
    doc.fontSize(10).font("Helvetica-Bold").fillColor(BRAND.dark)
      .text(`Status: ${params.status || "—"}     Completion: ${params.completion || 0}%`);
    doc.moveDown(1);

    // Summary
    if (params.summary) {
      doc.fontSize(12).font("Helvetica-Bold").fillColor(BRAND.dark).text("Executive Summary");
      doc.moveDown(0.5);
      doc.fontSize(10).font("Helvetica").fillColor(BRAND.dark)
        .text(params.summary, { width: 512, lineGap: 3 });
      doc.moveDown(1.5);
    }

    // Metrics
    if (params.metrics && params.metrics.length > 0) {
      doc.fontSize(12).font("Helvetica-Bold").fillColor(BRAND.dark).text("Key Metrics");
      doc.moveDown(0.5);
      const metricY = doc.y;
      doc.rect(50, metricY, 512, 24).fill("#F0EDE8");
      doc.fontSize(9).font("Helvetica-Bold").fillColor(BRAND.dark)
        .text("Metric", 60, metricY + 7)
        .text("Value", 400, metricY + 7, { width: 152, align: "right" });

      let mY = metricY + 24;
      params.metrics.forEach(({ label, value }, i) => {
        if (i % 2 === 0) doc.rect(50, mY, 512, 22).fill("#FAFAF8");
        doc.fontSize(10).font("Helvetica").fillColor(BRAND.dark)
          .text(label, 60, mY + 5)
          .text(String(value), 400, mY + 5, { width: 152, align: "right" });
        mY += 22;
      });
      doc.rect(50, metricY, 512, mY - metricY).stroke(BRAND.lightGray);
    }

    renderFooter(doc, 1);
    doc.end();
  });
}

module.exports = { generateCapitalCallPDF, generateQuarterlyReportPDF };
