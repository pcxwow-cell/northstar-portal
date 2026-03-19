const { Router } = require("express");
const { requireRole } = require("../middleware/auth");
const audit = require("../services/audit");
const prisma = require("../prisma");
const { generateStatement, generateAllStatements, generateStatementHTML } = require("../services/statementGenerator");
const { getJobStatus, runJobNow } = require("../services/scheduler");
const router = Router();

// All statement routes require ADMIN or GP role
router.use(requireRole("ADMIN", "GP"));

// ─── Helper: send notification emails to ADMIN/GP users ───
async function notifyAdminGP(subject, htmlBody, excludeUserId) {
  try {
    const emailService = require("../services/email");
    const admins = await prisma.user.findMany({
      where: {
        role: { in: ["ADMIN", "GP"] },
        status: "ACTIVE",
        ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      },
      select: { id: true, email: true, name: true },
    });
    for (const admin of admins) {
      emailService.sendEmail({
        to: admin.email,
        subject,
        html: htmlBody,
        text: htmlBody.replace(/<[^>]*>/g, ""),
      }).catch(err => console.warn(`Statement notification to ${admin.email} failed:`, err.message));
    }
  } catch (err) {
    console.warn("notifyAdminGP error:", err.message);
  }
}

// ─── Helper: send notification email to a specific user ───
async function notifyUser(userId, subject, htmlBody) {
  try {
    const emailService = require("../services/email");
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
    if (user) {
      await emailService.sendEmail({
        to: user.email,
        subject,
        html: htmlBody,
        text: htmlBody.replace(/<[^>]*>/g, ""),
      });
    }
  } catch (err) {
    console.warn(`notifyUser(${userId}) error:`, err.message);
  }
}

// ─── Standard include for statement queries ───
const statementInclude = {
  user: { select: { name: true, email: true } },
  project: { select: { name: true } },
  creator: { select: { name: true } },
  approver: { select: { name: true } },
  rejector: { select: { name: true } },
};

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
      const html = generateStatementHTML(r.statement);
      const stmt = await prisma.statement.create({
        data: {
          userId: r.userId,
          projectId: r.projectId,
          status: "DRAFT",
          data: JSON.stringify(r.statement),
          html,
          period: period || null,
          createdBy: req.user.id,
        },
      });
      drafts.push({
        id: stmt.id,
        userId: r.userId,
        projectId: r.projectId,
        investorName: r.statement.header.investorName,
        projectName: r.statement.header.projectName,
      });
    }

    await audit.log(req, "statement_generate", null, {
      investorIds: investorIds || "all", projectIds: projectIds || "all",
      period: period || "default", count: drafts.length,
    });

    // Notify ADMIN/GP users that statements are ready for review
    if (drafts.length > 0) {
      notifyAdminGP(
        `${drafts.length} statement(s) ready for review`,
        `<p>${drafts.length} new capital account statement(s) have been generated and are awaiting review.</p><p>Please log in to the portal to review and approve them.</p>`,
      );
    }

    res.json({ count: drafts.length, drafts });
  } catch (err) { next(err); }
});

// ─── LIST statements by status ───
router.get("/", async (req, res) => {
  try {
    const { status } = req.query;
    const where = {};
    if (status && status !== "all") where.status = status;

    const statements = await prisma.statement.findMany({
      where,
      include: statementInclude,
      orderBy: { createdAt: "desc" },
    });

    res.json(statements.map(s => ({
      id: s.id,
      userId: s.userId,
      projectId: s.projectId,
      status: s.status,
      period: s.period,
      investorName: s.user?.name || null,
      investorEmail: s.user?.email || null,
      projectName: s.project?.name || null,
      createdByName: s.creator?.name || null,
      approvedByName: s.approver?.name || null,
      createdAt: s.createdAt,
      approvedAt: s.approvedAt,
      rejectedAt: s.rejectedAt,
      rejectReason: s.rejectReason,
      sentAt: s.sentAt,
    })));
  } catch (err) {
    res.status(500).json({ error: "Failed to list statements" });
  }
});

// ─── GET single statement detail ───
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const stmt = await prisma.statement.findUnique({
      where: { id },
      include: statementInclude,
    });
    if (!stmt) return res.status(404).json({ error: "Statement not found" });

    res.json({
      ...stmt,
      data: stmt.data ? JSON.parse(stmt.data) : null,
      investorName: stmt.user?.name || null,
      investorEmail: stmt.user?.email || null,
      projectName: stmt.project?.name || null,
      createdByName: stmt.creator?.name || null,
      approvedByName: stmt.approver?.name || null,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch statement" });
  }
});

// ─── APPROVE (DRAFT → APPROVED) ───
router.post("/:id/approve", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const stmt = await prisma.statement.findUnique({ where: { id } });
    if (!stmt) return res.status(404).json({ error: "Statement not found" });
    if (stmt.status !== "DRAFT") return res.status(400).json({ error: `Cannot approve statement in ${stmt.status} status` });

    const updated = await prisma.statement.update({
      where: { id },
      data: {
        status: "APPROVED",
        approvedBy: req.user.id,
        approvedAt: new Date(),
        rejectedBy: null,
        rejectedAt: null,
        rejectReason: null,
      },
    });

    await audit.log(req, "statement_approve", `statement:${id}`);

    // Notify the creator if different from the approver
    if (stmt.createdBy && stmt.createdBy !== req.user.id) {
      notifyUser(
        stmt.createdBy,
        "Statement approved",
        `<p>A statement you created (ID: ${id}) has been approved.</p>`,
      );
    }

    res.json({ message: "Statement approved", id: updated.id, status: updated.status });
  } catch (err) { next(err); }
});

// ─── BULK APPROVE ───
router.post("/bulk-approve", async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: "ids array is required" });

    const parsedIds = ids.map(id => parseInt(id, 10));
    const result = await prisma.statement.updateMany({
      where: {
        id: { in: parsedIds },
        status: "DRAFT",
      },
      data: {
        status: "APPROVED",
        approvedBy: req.user.id,
        approvedAt: new Date(),
      },
    });

    await audit.log(req, "statement_bulk_approve", null, { count: result.count });
    res.json({ approved: result.count });
  } catch (err) { next(err); }
});

// ─── SEND (APPROVED → SENT) ───
router.post("/:id/send", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const stmt = await prisma.statement.findUnique({
      where: { id },
      include: { user: { select: { name: true, email: true } } },
    });
    if (!stmt) return res.status(404).json({ error: "Statement not found" });
    if (stmt.status !== "APPROVED") return res.status(400).json({ error: `Cannot send statement in ${stmt.status} status. Must be APPROVED first.` });

    // Send email to investor
    try {
      const emailService = require("../services/email");
      const stmtData = stmt.data ? JSON.parse(stmt.data) : {};
      if (stmt.user) {
        await emailService.sendEmail({
          to: stmt.user.email,
          subject: `Capital Account Statement — ${stmtData?.header?.projectName || "Northstar"}`,
          html: `<p>Dear ${stmt.user.name},</p><p>Your capital account statement is now available. Please log in to your investor portal to view it.</p>`,
          text: `Dear ${stmt.user.name}, Your capital account statement is now available. Please log in to your investor portal to view it.`,
        });
      }
    } catch (emailErr) {
      console.warn("Statement email failed:", emailErr.message);
    }

    const updated = await prisma.statement.update({
      where: { id },
      data: { status: "SENT", sentAt: new Date() },
    });

    const stmtData = stmt.data ? JSON.parse(stmt.data) : {};
    await audit.log(req, "statement_send", `statement:${id}`, {
      investorName: stmtData?.header?.investorName, email: stmt.user?.email,
    });
    res.json({ message: "Statement sent", id: updated.id, status: updated.status });
  } catch (err) { next(err); }
});

// ─── BULK SEND ───
router.post("/bulk-send", async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: "ids array is required" });

    const parsedIds = ids.map(id => parseInt(id, 10));
    const statements = await prisma.statement.findMany({
      where: { id: { in: parsedIds }, status: "APPROVED" },
      include: { user: { select: { name: true, email: true } } },
    });

    let sent = 0;
    const emailService = require("../services/email");

    for (const stmt of statements) {
      // Send email to each investor
      try {
        const stmtData = stmt.data ? JSON.parse(stmt.data) : {};
        if (stmt.user) {
          await emailService.sendEmail({
            to: stmt.user.email,
            subject: `Capital Account Statement — ${stmtData?.header?.projectName || "Northstar"}`,
            html: `<p>Dear ${stmt.user.name},</p><p>Your capital account statement is now available. Please log in to your investor portal to view it.</p>`,
            text: `Dear ${stmt.user.name}, Your capital account statement is now available. Please log in to your investor portal to view it.`,
          });
        }
      } catch (emailErr) {
        console.warn(`Bulk send email failed for statement ${stmt.id}:`, emailErr.message);
      }

      await prisma.statement.update({
        where: { id: stmt.id },
        data: { status: "SENT", sentAt: new Date() },
      });
      sent++;
    }

    await audit.log(req, "statement_bulk_send", null, { count: sent });
    res.json({ sent });
  } catch (err) { next(err); }
});

// ─── REJECT (DRAFT/APPROVED → REJECTED) ───
router.post("/:id/reject", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const stmt = await prisma.statement.findUnique({ where: { id } });
    if (!stmt) return res.status(404).json({ error: "Statement not found" });
    if (stmt.status === "SENT") return res.status(400).json({ error: "Cannot reject a sent statement" });

    const reason = req.body.reason || null;
    const updated = await prisma.statement.update({
      where: { id },
      data: {
        status: "REJECTED",
        rejectedBy: req.user.id,
        rejectedAt: new Date(),
        rejectReason: reason,
        approvedBy: null,
        approvedAt: null,
      },
    });

    await audit.log(req, "statement_reject", `statement:${id}`, { reason: reason || "No reason provided" });

    // Notify the creator about rejection with reason
    if (stmt.createdBy && stmt.createdBy !== req.user.id) {
      notifyUser(
        stmt.createdBy,
        "Statement rejected",
        `<p>A statement you created (ID: ${id}) has been rejected.</p>${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}`,
      );
    }

    res.json({ message: "Statement rejected", id: updated.id, status: updated.status });
  } catch (err) { next(err); }
});

// ─── DELETE draft ───
router.delete("/:id", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const stmt = await prisma.statement.findUnique({ where: { id } });
    if (!stmt) return res.status(404).json({ error: "Statement not found" });
    if (stmt.status === "SENT") return res.status(400).json({ error: "Cannot delete a sent statement" });

    await prisma.statement.delete({ where: { id } });
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

    // Notify investors about the capital call
    const { notifyMany } = require("../services/notifications");
    const investorProjects = await prisma.investorProject.findMany({
      where: { projectId: parseInt(projectId) },
      select: { userId: true },
    });
    if (investorProjects.length > 0) {
      const investorIds = investorProjects.map(ip => ip.userId);
      notifyMany(investorIds, "capital_call", {
        amount: callAmount,
        projectName: project.name,
        dueDate: dueDate || "TBD",
      }).catch(err => console.warn("Capital call notification error:", err.message));
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="Capital-Call-${project.name.replace(/\s+/g, "-")}-${investor.name.replace(/\s+/g, "-")}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) { next(err); }
});

// POST /generate-quarterly-report — generate a quarterly report PDF
router.post("/generate-quarterly-report", async (req, res, next) => {
  try {
    const { generateQuarterlyReportPDF } = require("../services/pdfGenerator");
    const { projectId, quarter, summary } = req.body;

    if (!projectId || !quarter) return res.status(400).json({ error: "projectId and quarter are required" });

    const project = await prisma.project.findUnique({
      where: { id: parseInt(projectId) },
      include: { investorProjects: { include: { user: { select: { name: true } } } } },
    });
    if (!project) return res.status(404).json({ error: "Project not found" });

    const pdfBuffer = await generateQuarterlyReportPDF({
      projectName: project.name,
      quarter,
      status: project.status,
      completion: project.completionPct,
      summary: summary || project.description,
      metrics: [
        { label: "Total Raise", value: `$${(project.totalRaise || 0).toLocaleString()}` },
        { label: "Units", value: String(project.units || 0) },
        { label: "Investors", value: String(project.investorProjects?.length || 0) },
        { label: "Completion", value: `${project.completionPct || 0}%` },
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
