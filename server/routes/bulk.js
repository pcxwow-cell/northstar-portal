const { Router } = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const multer = require("multer");
const prisma = require("../prisma");
const { requireRole } = require("../middleware/auth");
const audit = require("../services/audit");
const router = Router();

// All bulk routes require ADMIN or GP role
router.use(requireRole("ADMIN", "GP"));

// Multer for CSV file upload (memory storage, 2MB limit)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

// Simple CSV parser — handles quoted fields with commas
function parseCsv(text) {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };

  function parseLine(line) {
    const fields = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
        else if (ch === '"') { inQuotes = false; }
        else { current += ch; }
      } else {
        if (ch === '"') { inQuotes = true; }
        else if (ch === ",") { fields.push(current.trim()); current = ""; }
        else { current += ch; }
      }
    }
    fields.push(current.trim());
    return fields;
  }

  const headers = parseLine(lines[0]).map(h => h.toLowerCase().trim());
  const rows = lines.slice(1).map(l => parseLine(l));
  return { headers, rows };
}

// ─── BULK INVITE INVESTORS ───
router.post("/invite-investors", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "CSV file required" });
    const text = req.file.buffer.toString("utf-8");
    const { headers, rows } = parseCsv(text);

    const nameIdx = headers.indexOf("name");
    const emailIdx = headers.indexOf("email");
    if (nameIdx === -1 || emailIdx === -1) {
      return res.status(400).json({ error: "CSV must have 'name' and 'email' columns" });
    }

    let successCount = 0;
    const failed = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = row[nameIdx];
      const email = row[emailIdx];
      const rowNum = i + 2; // 1-based, skip header

      if (!name || !email) {
        failed.push({ row: rowNum, error: "Missing name or email" });
        continue;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        failed.push({ row: rowNum, error: `Invalid email: ${email}` });
        continue;
      }

      try {
        const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (existing) {
          failed.push({ row: rowNum, error: `Email already exists: ${email}` });
          continue;
        }

        const tempPassword = crypto.randomBytes(4).toString("hex") + "A1!";
        const hash = await bcrypt.hash(tempPassword, 10);
        const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

        await prisma.user.create({
          data: {
            email: email.toLowerCase(),
            passwordHash: hash,
            name,
            initials,
            role: "INVESTOR",
            status: "PENDING",
            joined: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
          },
        });

        // Attempt to send welcome email (non-blocking)
        try {
          const emailService = require("../services/email");
          if (emailService && emailService.sendWelcomeEmail) {
            emailService.sendWelcomeEmail({ name, email: email.toLowerCase(), tempPassword }).catch(() => {});
          }
        } catch (_) { /* email not configured */ }

        successCount++;
      } catch (err) {
        failed.push({ row: rowNum, error: err.message });
      }
    }

    audit.log(req, "bulk_investor_invite", null, { success: successCount, failed: failed.length });
    res.json({ success: successCount, failed });
  } catch (err) { next(err); }
});

// ─── BULK APPROVE INVESTORS ───
router.post("/approve-investors", async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "ids array required" });
    }

    const result = await prisma.user.updateMany({
      where: { id: { in: ids.map(Number) }, role: "INVESTOR", status: "PENDING" },
      data: { status: "ACTIVE" },
    });

    audit.log(req, "bulk_approve_investors", null, { ids, count: result.count });
    res.json({ success: result.count, failed: [] });
  } catch (err) { next(err); }
});

// ─── BULK DEACTIVATE INVESTORS ───
router.post("/deactivate-investors", async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "ids array required" });
    }

    const result = await prisma.user.updateMany({
      where: { id: { in: ids.map(Number) }, role: "INVESTOR" },
      data: { status: "INACTIVE" },
    });

    audit.log(req, "bulk_deactivate_investors", null, { ids, count: result.count });
    res.json({ success: result.count, failed: [] });
  } catch (err) { next(err); }
});

// ─── BULK CASH FLOW IMPORT ───
router.post("/cash-flows/:projectId", upload.single("file"), async (req, res, next) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return res.status(404).json({ error: "Project not found" });

    if (!req.file) return res.status(400).json({ error: "CSV file required" });
    const text = req.file.buffer.toString("utf-8");
    const { headers, rows } = parseCsv(text);

    const dateIdx = headers.indexOf("date");
    const amountIdx = headers.indexOf("amount");
    const typeIdx = headers.indexOf("type");
    const descIdx = headers.indexOf("description");
    const emailIdx = headers.indexOf("email") !== -1 ? headers.indexOf("email") : headers.indexOf("investoremail");

    if (dateIdx === -1 || amountIdx === -1) {
      return res.status(400).json({ error: "CSV must have 'date' and 'amount' columns" });
    }

    // Get all investors for this project
    const investorProjects = await prisma.investorProject.findMany({
      where: { projectId },
      include: { user: { select: { id: true, email: true } } },
    });

    let successCount = 0;
    const failed = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;
      const dateStr = row[dateIdx];
      const amount = parseFloat(row[amountIdx]);
      const type = typeIdx !== -1 ? (row[typeIdx] || "capital_call") : "capital_call";
      const description = descIdx !== -1 ? (row[descIdx] || "") : "";
      const email = emailIdx !== -1 ? (row[emailIdx] || "").toLowerCase() : "";

      if (!dateStr || isNaN(amount)) {
        failed.push({ row: rowNum, error: "Missing date or invalid amount" });
        continue;
      }

      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        failed.push({ row: rowNum, error: `Invalid date: ${dateStr}` });
        continue;
      }

      // Determine userId
      let userId = null;
      if (email) {
        const match = investorProjects.find(ip => ip.user.email === email);
        if (!match) {
          failed.push({ row: rowNum, error: `Investor not found in project: ${email}` });
          continue;
        }
        userId = match.userId;
      } else if (investorProjects.length === 1) {
        userId = investorProjects[0].userId;
      } else {
        failed.push({ row: rowNum, error: "No email specified and multiple investors exist" });
        continue;
      }

      try {
        await prisma.cashFlow.create({
          data: { projectId, userId, date, amount, type, description },
        });
        successCount++;
      } catch (err) {
        failed.push({ row: rowNum, error: err.message });
      }
    }

    audit.log(req, "bulk_cash_flow_import", `project:${projectId}`, { success: successCount, failed: failed.length });
    res.json({ success: successCount, failed });
  } catch (err) { next(err); }
});

module.exports = router;
