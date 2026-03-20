const { Router } = require("express");
const prisma = require("../prisma");
const { requireRole } = require("../middleware/auth");
const router = Router();

// All export routes require ADMIN or GP role
router.use(requireRole("ADMIN", "GP"));

// CSV escape helper — handles commas, quotes, newlines
function csvEscape(val) {
  if (val == null) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function csvRow(values) {
  return values.map(csvEscape).join(",");
}

function sendCsv(res, filename, headers, rows) {
  const lines = [csvRow(headers), ...rows.map(r => csvRow(r))];
  const csv = lines.join("\r\n") + "\r\n";
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(csv);
}

// ─── INVESTORS EXPORT ───
router.get("/investors", async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: "INVESTOR" },
      include: {
        investorProjects: {
          include: { project: { select: { name: true } } },
        },
      },
      orderBy: { name: "asc" },
    });

    const headers = ["Name", "Email", "Status", "Joined", "Total Committed", "Total Value", "Projects"];
    const rows = users.map(u => {
      const totalCommitted = u.investorProjects.reduce((s, ip) => s + (ip.committed || 0), 0);
      const totalValue = u.investorProjects.reduce((s, ip) => s + (ip.currentValue || 0), 0);
      const projects = u.investorProjects.map(ip => ip.project?.name).filter(Boolean).join("; ");
      return [u.name, u.email, u.status, u.joined || "", totalCommitted, totalValue, projects];
    });

    sendCsv(res, "investors.csv", headers, rows);
  } catch (err) { next(err); }
});

// ─── PROJECTS EXPORT ───
router.get("/projects", async (req, res, next) => {
  try {
    const projects = await prisma.project.findMany({
      include: {
        investorProjects: true,
        documents: true,
      },
      orderBy: { name: "asc" },
    });

    const headers = ["Name", "Location", "Type", "Status", "Total Raise", "Completion %", "Units", "Investor Count", "Document Count"];
    const rows = projects.map(p => [
      p.name, p.location || "", p.type || "", p.status,
      p.totalRaise, p.completionPct, p.units || "",
      p.investorProjects.length, p.documents.length,
    ]);

    sendCsv(res, "projects.csv", headers, rows);
  } catch (err) { next(err); }
});

// ─── DISTRIBUTIONS EXPORT ───
router.get("/distributions", async (req, res, next) => {
  try {
    const dists = await prisma.distribution.findMany({
      include: { project: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });

    const headers = ["Project", "Quarter", "Date", "Amount", "Type"];
    const rows = dists.map(d => [
      d.project?.name || "", d.quarter, d.date, d.amount, d.type,
    ]);

    sendCsv(res, "distributions.csv", headers, rows);
  } catch (err) { next(err); }
});

// ─── DOCUMENTS EXPORT ───
router.get("/documents", async (req, res, next) => {
  try {
    const docs = await prisma.document.findMany({
      include: {
        project: { select: { name: true } },
        assignments: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const headers = ["Name", "Category", "Project", "Date", "Size", "Status", "Assigned Investors"];
    const rows = docs.map(d => [
      d.name, d.category, d.project?.name || "General", d.date, d.size, d.status,
      d.assignments.length,
    ]);

    sendCsv(res, "documents.csv", headers, rows);
  } catch (err) { next(err); }
});

// ─── AUDIT LOG EXPORT ───
router.get("/audit-log", async (req, res, next) => {
  try {
    const { startDate, endDate, action } = req.query;
    const where = {};
    if (action && action !== "all") where.action = action;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate + "T23:59:59.999Z");
    }

    const logs = await prisma.auditLog.findMany({
      where,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 10000,
    });

    const headers = ["Timestamp", "User", "Email", "Action", "Resource", "IP Address"];
    const rows = logs.map(l => [
      l.createdAt.toISOString(), l.user?.name || "System", l.user?.email || "",
      l.action, l.resource || "", l.ipAddress || "",
    ]);

    sendCsv(res, "audit-log.csv", headers, rows);
  } catch (err) { next(err); }
});

// ─── CAP TABLE EXPORT ───
router.get("/cap-table/:projectId", async (req, res, next) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { name: true } });
    if (!project) return res.status(404).json({ error: "Project not found" });

    const entries = await prisma.capTableEntry.findMany({
      where: { projectId },
      orderBy: { id: "asc" },
    });

    const headers = ["Holder Name", "Holder Type", "Committed", "Called", "Ownership %", "Unfunded"];
    const rows = entries.map(e => [
      e.holderName, e.holderType, e.committed, e.called, e.ownershipPct, e.unfunded,
    ]);

    const safeName = project.name.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
    sendCsv(res, `cap-table-${safeName}.csv`, headers, rows);
  } catch (err) { next(err); }
});

module.exports = router;
