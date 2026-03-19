const { Router } = require("express");
const prisma = require("../prisma");
const router = Router();

// GET /api/v1/investors/:id — investor profile
router.get("/:id", async (req, res, next) => {
  try {
    const targetId = parseInt(req.params.id);

    // IDOR protection: investors can only access their own profile
    if (req.user.role === "INVESTOR" && req.user.id !== targetId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const user = await prisma.user.findUnique({
      where: { id: targetId },
      include: { investorProjects: { select: { projectId: true } } },
    });
    if (!user) return res.status(404).json({ error: "Investor not found" });
    res.json({
      id: user.id,
      name: user.name,
      initials: user.initials,
      email: user.email,
      role: user.role === "INVESTOR" ? "Limited Partner" : user.role,
      joined: user.joined,
      projectIds: user.investorProjects.map((ip) => ip.projectId),
    });
  } catch (err) { next(err); }
});

// GET /api/v1/investors/:id/projects — investor's projects with financial data
router.get("/:id/projects", async (req, res, next) => {
  try {
    const targetId = parseInt(req.params.id);

    // IDOR protection: investors can only access their own projects
    if (req.user.role === "INVESTOR" && req.user.id !== targetId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const investorProjects = await prisma.investorProject.findMany({
      where: { userId: targetId },
      include: {
        entity: true,
        project: {
          include: {
            capTableEntries: true,
            waterfallTiers: true,
            distributions: true,
            documents: true,
            updates: true,
            performanceHistory: true,
          },
        },
      },
    });

    const results = investorProjects.map((ip) => {
      const p = ip.project;
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
        investorCommitted: ip.committed,
        investorCalled: ip.called,
        currentValue: ip.currentValue,
        irr: ip.irr,
        moic: ip.moic,
        capTable: p.capTableEntries.map((e) => ({
          id: e.id,
          holder: e.holderName,
          type: e.holderType,
          committed: e.committed,
          called: e.called,
          ownership: e.ownershipPct,
          unfunded: e.unfunded,
        })),
        waterfall: {
          tiers: p.waterfallTiers
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
        distributions: p.distributions.map((d) => ({
          quarter: d.quarter,
          date: d.date,
          amount: d.amount,
          type: d.type,
        })),
        documents: p.documents.map((d) => ({
          id: d.id,
          name: d.name,
          category: d.category,
          date: d.date,
          size: d.size,
          status: d.status,
          file: d.file,
        })),
        updates: p.updates.map((u) => ({
          date: u.date,
          text: u.text,
        })),
        performanceHistory: p.performanceHistory.map((h) => ({
          month: h.month,
          value: h.value,
          benchmark: h.benchmark,
        })),
      };
    });

    res.json(results);
  } catch (err) { next(err); }
});

module.exports = router;
