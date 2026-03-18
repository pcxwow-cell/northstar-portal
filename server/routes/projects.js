const { Router } = require("express");
const prisma = require("../prisma");
const router = Router();

// Transform DB project to frontend shape
function toProject(p) {
  return {
    id: p.id,
    name: p.name,
    location: p.location,
    type: p.type,
    status: p.status,
    sqft: p.sqft,
    units: p.units,
    completion: p.completionPct,
    totalRaise: p.totalRaise,
    description: p.description,
  };
}

function toFullProject(p) {
  const base = toProject(p);
  return {
    ...base,
    capTable: (p.capTableEntries || []).map((e) => ({
      id: e.id,
      holder: e.holderName,
      type: e.holderType,
      committed: e.committed,
      called: e.called,
      ownership: e.ownershipPct,
      unfunded: e.unfunded,
    })),
    waterfall: {
      tiers: (p.waterfallTiers || [])
        .sort((a, b) => a.tierOrder - b.tierOrder)
        .map((t) => ({
          name: t.tierName,
          lpShare: t.lpShare,
          gpShare: t.gpShare,
          threshold: t.threshold,
          status: t.status,
        })),
      prefReturn: p.prefReturnPct,
      catchUp: p.gpCatchupPct,
      carry: p.carryPct,
    },
    distributions: (p.distributions || []).map((d) => ({
      quarter: d.quarter,
      date: d.date,
      amount: d.amount,
      type: d.type,
    })),
    documents: (p.documents || []).map((d) => ({
      id: d.id,
      name: d.name,
      category: d.category,
      date: d.date,
      size: d.size,
      status: d.status,
      file: d.file,
    })),
    updates: (p.updates || []).map((u) => ({
      id: u.id,
      date: u.date,
      text: u.text,
      completionPct: u.completionPct,
      unitsSold: u.unitsSold,
      revenue: u.revenue,
      status: u.status,
    })),
    performanceHistory: (p.performanceHistory || []).map((h) => ({
      month: h.month,
      value: h.value,
      benchmark: h.benchmark,
    })),
  };
}

// GET /api/v1/projects — list all projects (summary)
router.get("/", async (req, res, next) => {
  try {
    const projects = await prisma.project.findMany({ orderBy: { id: "asc" } });
    res.json(projects.map(toProject));
  } catch (err) { next(err); }
});

// GET /api/v1/projects/:id — full project with all nested data
router.get("/:id", async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        capTableEntries: true,
        waterfallTiers: true,
        distributions: true,
        documents: true,
        updates: true,
        performanceHistory: true,
      },
    });
    if (!project) return res.status(404).json({ error: "Project not found" });
    res.json(toFullProject(project));
  } catch (err) { next(err); }
});

module.exports = router;
