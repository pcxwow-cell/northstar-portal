const { Router } = require("express");
const prisma = require("../prisma");
const router = Router();

// GET /api/v1/distributions?investorId=1
router.get("/", async (req, res, next) => {
  try {
    const { investorId } = req.query;
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

module.exports = router;
