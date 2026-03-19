const { Router } = require("express");
const prisma = require("../prisma");
const router = Router();

// GET /api/v1/distributions?investorId=1
router.get("/", async (req, res, next) => {
  try {
    let { investorId } = req.query;

    // IDOR protection: investors can only see their own distributions
    if (req.user.role === "INVESTOR") {
      investorId = String(req.user.id);
    }

    const where = {};

    if (investorId) {
      const investorProjects = await prisma.investorProject.findMany({
        where: { userId: parseInt(investorId) },
        select: { projectId: true },
      });
      where.projectId = { in: investorProjects.map((ip) => ip.projectId) };
    }

    const distributions = await prisma.distribution.findMany({
      where,
      include: { project: { select: { name: true } } },
      orderBy: { id: "desc" },
    });

    res.json(
      distributions.map((d) => ({
        quarter: d.quarter,
        date: d.date,
        amount: d.amount,
        type: d.type,
        project: d.project.name,
      }))
    );
  } catch (err) { next(err); }
});

const { requireRole } = require("../middleware/auth");
const { notifyMany } = require("../services/notifications");
const audit = require("../services/audit");

// POST /api/v1/distributions — create a distribution record + notify investors
router.post("/", requireRole("ADMIN", "GP"), async (req, res, next) => {
  try {
    const { projectId, quarter, date, amount, type } = req.body;
    if (!projectId || !amount) return res.status(400).json({ error: "projectId and amount are required" });

    const project = await prisma.project.findUnique({ where: { id: parseInt(projectId) } });
    if (!project) return res.status(404).json({ error: "Project not found" });

    const distribution = await prisma.distribution.create({
      data: {
        project: { connect: { id: parseInt(projectId) } },
        quarter: quarter || `Q${Math.ceil((new Date().getMonth() + 1) / 3)} ${new Date().getFullYear()}`,
        date: date || new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        amount: parseFloat(amount),
        type: type || "distribution",
      },
    });

    // Notify all investors in this project
    const investorProjects = await prisma.investorProject.findMany({
      where: { projectId: parseInt(projectId) },
      select: { userId: true },
    });
    const investorIds = investorProjects.map(ip => ip.userId);

    if (investorIds.length > 0) {
      await notifyMany(investorIds, "distribution_paid", {
        amount: parseFloat(amount),
        projectName: project.name,
        quarter: distribution.quarter,
      });
    }

    audit.log(req, "distribution_create", `project:${projectId}`, {
      amount, quarter: distribution.quarter, investorsNotified: investorIds.length
    });

    res.status(201).json({
      ...distribution,
      project: project.name,
      investorsNotified: investorIds.length,
    });
  } catch (err) { next(err); }
});

module.exports = router;
