const { Router } = require("express");
const prisma = require("../prisma");
const router = Router();

// GET /api/v1/documents?investorId=1&category=Tax&projectId=1
router.get("/", async (req, res, next) => {
  try {
    const { investorId, category, projectId } = req.query;
    const where = {};

    // If investorId provided, scope to investor's projects + general docs
    if (investorId) {
      const investorProjects = await prisma.investorProject.findMany({
        where: { userId: parseInt(investorId) },
        select: { projectId: true },
      });
      const projectIds = investorProjects.map((ip) => ip.projectId);
      where.OR = [
        { projectId: { in: projectIds } },
        { projectId: null }, // general docs
      ];
    }

    if (category) where.category = category;
    if (projectId) where.projectId = parseInt(projectId);

    const docs = await prisma.document.findMany({
      where,
      include: { project: { select: { name: true } } },
      orderBy: { id: "desc" },
    });

    res.json(
      docs.map((d) => ({
        id: d.id,
        name: d.name,
        category: d.category,
        date: d.date,
        size: d.size,
        status: d.status,
        file: d.file,
        project: d.project ? d.project.name : "General",
      }))
    );
  } catch (err) { next(err); }
});

module.exports = router;
