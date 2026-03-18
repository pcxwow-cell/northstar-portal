const { Router } = require("express");
const { requireRole } = require("../middleware/auth");
const audit = require("../services/audit");
const { generateStatement, generateAllStatements, generateStatementHTML } = require("../services/statementGenerator");
const { getJobStatus, runJobNow } = require("../services/scheduler");
const router = Router();

// All statement routes require ADMIN or GP role
router.use(requireRole("ADMIN", "GP"));

// ─── In-memory statement store (production: use DB) ───
const statementStore = new Map(); // id -> { id, userId, projectId, status, data, html, createdBy, createdAt, approvedBy, approvedAt, sentAt }
let nextId = 1;

// ─── PREVIEW (no save) ───
router.get("/preview/:userId/:projectId", async (req, res, next) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    const projectId = parseInt(req.params.projectId, 10);
    const statement = await generateStatement(userId, projectId);
    const html = generateStatementHTML(statement);
    await audit.log(req, "statement_preview", `user:${userId},project:${projectId}`);
    res.json({ statement, html });
  } catch (err) { next(err); }
});

// ─── GENERATE (creates DRAFT statements) ───
router.post("/generate", async (req, res, next) => {
  try {
    const { investorIds, projectIds, period } = req.body;
    const results = await generateAllStatements({ investorIds, projectIds, period });
    const drafts = [];

    for (const r of results) {
      if (r.error || !r.statement) continue;
      const id = nextId++;
      const draft = {
        id, userId: r.userId, projectId: r.projectId,
        status: "DRAFT",
        data: r.statement,
        html: generateStatementHTML(r.statement),
        createdBy: req.user.id,
        createdAt: new Date().toISOString(),
        approvedBy: null, approvedAt: null, sentAt: null,
      };
      statementStore.set(id, draft);
      drafts.push({ id, userId: r.userId, projectId: r.projectId, investorName: r.statement.header.investorName, projectName: r.statement.header.projectName });
    }

    await audit.log(req, "statement_generate", null, {
      investorIds: investorIds || "all", projectIds: projectIds || "all",
      period: period || "default", count: drafts.length,
    });
    res.json({ count: drafts.length, drafts });
  } catch (err) { next(err); }
});

// ─── LIST statements by status ───
router.get("/", async (req, res) => {
  const { status } = req.query;
  let statements = Array.from(statementStore.values());
  if (status) statements = statements.filter(s => s.status === status);
  res.json(statements.map(s => ({
    id: s.id, userId: s.userId, projectId: s.projectId,
    status: s.status,
    investorName: s.data.header.investorName,
    projectName: s.data.header.projectName,
    createdAt: s.createdAt, approvedAt: s.approvedAt, sentAt: s.sentAt,
  })));
});

// ─── GET single statement detail ───
router.get("/:id", async (req, res) => {
  const stmt = statementStore.get(parseInt(req.params.id));
  if (!stmt) return res.status(404).json({ error: "Statement not found" });
  res.json(stmt);
});

// ─── APPROVE (DRAFT → APPROVED) ───
router.post("/:id/approve", async (req, res, next) => {
  try {
    const stmt = statementStore.get(parseInt(req.params.id));
    if (!stmt) return res.status(404).json({ error: "Statement not found" });
    if (stmt.status !== "DRAFT") return res.status(400).json({ error: `Cannot approve statement in ${stmt.status} status` });

    stmt.status = "APPROVED";
    stmt.approvedBy = req.user.id;
    stmt.approvedAt = new Date().toISOString();

    await audit.log(req, "statement_approve", `statement:${stmt.id}`, {
      investorName: stmt.data.header.investorName, projectName: stmt.data.header.projectName,
    });
    res.json({ message: "Statement approved", id: stmt.id, status: stmt.status });
  } catch (err) { next(err); }
});

// ─── BULK APPROVE ───
router.post("/bulk-approve", async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: "ids array is required" });

    let approved = 0;
    for (const id of ids) {
      const stmt = statementStore.get(id);
      if (stmt && stmt.status === "DRAFT") {
        stmt.status = "APPROVED";
        stmt.approvedBy = req.user.id;
        stmt.approvedAt = new Date().toISOString();
        approved++;
      }
    }

    await audit.log(req, "statement_bulk_approve", null, { count: approved });
    res.json({ approved });
  } catch (err) { next(err); }
});

// ─── SEND (APPROVED → SENT) ───
router.post("/:id/send", async (req, res, next) => {
  try {
    const stmt = statementStore.get(parseInt(req.params.id));
    if (!stmt) return res.status(404).json({ error: "Statement not found" });
    if (stmt.status !== "APPROVED") return res.status(400).json({ error: `Cannot send statement in ${stmt.status} status. Must be APPROVED first.` });

    // TODO: Actually send email via email service adapter
    // const { sendEmail } = require("../services/email");
    // await sendEmail({ to: stmt.data.header.investorEmail, subject: `Capital Account Statement — ${stmt.data.header.projectName}`, html: stmt.html });

    stmt.status = "SENT";
    stmt.sentAt = new Date().toISOString();

    await audit.log(req, "statement_send", `statement:${stmt.id}`, {
      investorName: stmt.data.header.investorName, email: stmt.data.header.investorEmail,
    });
    res.json({ message: "Statement sent", id: stmt.id, status: stmt.status });
  } catch (err) { next(err); }
});

// ─── BULK SEND ───
router.post("/bulk-send", async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: "ids array is required" });

    let sent = 0;
    for (const id of ids) {
      const stmt = statementStore.get(id);
      if (stmt && stmt.status === "APPROVED") {
        stmt.status = "SENT";
        stmt.sentAt = new Date().toISOString();
        sent++;
      }
    }

    await audit.log(req, "statement_bulk_send", null, { count: sent });
    res.json({ sent });
  } catch (err) { next(err); }
});

// ─── REJECT / REVERT (APPROVED → DRAFT) ───
router.post("/:id/reject", async (req, res, next) => {
  try {
    const stmt = statementStore.get(parseInt(req.params.id));
    if (!stmt) return res.status(404).json({ error: "Statement not found" });
    if (stmt.status === "SENT") return res.status(400).json({ error: "Cannot reject a sent statement" });

    stmt.status = "DRAFT";
    stmt.approvedBy = null;
    stmt.approvedAt = null;

    await audit.log(req, "statement_reject", `statement:${stmt.id}`, { reason: req.body.reason || "No reason provided" });
    res.json({ message: "Statement reverted to draft", id: stmt.id, status: stmt.status });
  } catch (err) { next(err); }
});

// ─── DELETE draft ───
router.delete("/:id", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const stmt = statementStore.get(id);
    if (!stmt) return res.status(404).json({ error: "Statement not found" });
    if (stmt.status === "SENT") return res.status(400).json({ error: "Cannot delete a sent statement" });

    statementStore.delete(id);
    await audit.log(req, "statement_delete", `statement:${id}`);
    res.json({ message: "Statement deleted" });
  } catch (err) { next(err); }
});

// ─── SCHEDULE STATUS ───
router.get("/schedule/status", async (req, res, next) => {
  try {
    const status = await getJobStatus();
    res.json(status);
  } catch (err) { next(err); }
});

// ─── MANUALLY TRIGGER SCHEDULED JOB ───
router.post("/schedule/run", async (req, res, next) => {
  try {
    const { jobName } = req.body;
    if (!jobName) return res.status(400).json({ error: "jobName is required" });
    await runJobNow(jobName);
    await audit.log(req, "schedule_manual_run", `job:${jobName}`);
    res.json({ message: `Job "${jobName}" triggered successfully` });
  } catch (err) { next(err); }
});

// POST /generate-capital-call — generate a capital call notice PDF
router.post("/generate-capital-call", async (req, res, next) => {
  try {
    const { generateCapitalCallPDF } = require("../services/pdfGenerator");
    const prisma = require("../prisma");
    const { investorId, projectId, callNumber, callAmount, dueDate, notes } = req.body;

    if (!investorId || !projectId || !callAmount) {
      return res.status(400).json({ error: "investorId, projectId, and callAmount are required" });
    }

    const [investor, project, ip] = await Promise.all([
      prisma.user.findUnique({ where: { id: parseInt(investorId) }, select: { name: true, email: true } }),
      prisma.project.findUnique({ where: { id: parseInt(projectId) }, select: { name: true, location: true } }),
      prisma.investorProject.findUnique({ where: { userId_projectId: { userId: parseInt(investorId), projectId: parseInt(projectId) } } }),
    ]);

    if (!investor || !project) return res.status(404).json({ error: "Investor or project not found" });

    const pdfBuffer = await generateCapitalCallPDF({
      investorName: investor.name,
      projectName: project.name,
      projectLocation: project.location,
      callNumber: callNumber || 1,
      callAmount: parseFloat(callAmount),
      dueDate: dueDate || new Date(Date.now() + 30 * 86400000).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
      totalCommitted: ip?.committed || 0,
      previouslyCalled: ip?.called || 0,
      notes,
    });

    await audit.log(req, "capital_call_generated", `project:${projectId}`, { investorId, callAmount });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="Capital-Call-${project.name.replace(/\s+/g, "-")}-${investor.name.replace(/\s+/g, "-")}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) { next(err); }
});

// POST /generate-quarterly-report — generate a quarterly report PDF
router.post("/generate-quarterly-report", async (req, res, next) => {
  try {
    const { generateQuarterlyReportPDF } = require("../services/pdfGenerator");
    const prisma = require("../prisma");
    const { projectId, quarter, summary } = req.body;

    if (!projectId || !quarter) return res.status(400).json({ error: "projectId and quarter are required" });

    const project = await prisma.project.findUnique({
      where: { id: parseInt(projectId) },
      include: { investors: { include: { user: { select: { name: true } } } } },
    });
    if (!project) return res.status(404).json({ error: "Project not found" });

    const pdfBuffer = await generateQuarterlyReportPDF({
      projectName: project.name,
      quarter,
      status: project.status,
      completion: project.completion,
      summary: summary || project.description,
      metrics: [
        { label: "Total Raise", value: `$${(project.totalRaise || 0).toLocaleString()}` },
        { label: "Units", value: String(project.units || 0) },
        { label: "Investors", value: String(project.investors?.length || 0) },
        { label: "Completion", value: `${project.completion || 0}%` },
        { label: "Status", value: project.status },
      ],
    });

    await audit.log(req, "quarterly_report_generated", `project:${projectId}`, { quarter });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="Quarterly-Report-${project.name.replace(/\s+/g, "-")}-${quarter.replace(/\s+/g, "-")}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) { next(err); }
});

module.exports = router;
