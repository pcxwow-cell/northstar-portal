const express = require("express");
const router = express.Router();
const prisma = require("../prisma");
const { requireRole } = require("../middleware/auth");
const { calculateXIRR, calculateMOIC, calculateWaterfall, capitalAccountStatement } = require("../services/finance");
const audit = require("../services/audit");

// ─── POST /calculate-irr ────────────────────────────────
// Body: { cashFlows: [{date, amount}] }
router.post("/calculate-irr", (req, res) => {
  try {
    const { cashFlows } = req.body;
    if (!cashFlows || !Array.isArray(cashFlows)) {
      return res.status(400).json({ error: "cashFlows array is required" });
    }
    const irr = calculateXIRR(cashFlows);
    res.json({ irr });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /calculate-waterfall ──────────────────────────
// Body: { totalDistributable, structure: { prefReturnPct, gpCatchupPct, carryPct, lpCapital, holdPeriodYears } }
router.post("/calculate-waterfall", (req, res) => {
  try {
    const { totalDistributable, structure } = req.body;
    if (totalDistributable == null || !structure) {
      return res.status(400).json({ error: "totalDistributable and structure are required" });
    }
    const result = calculateWaterfall(totalDistributable, structure);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /capital-account/:userId/:projectId ────────────
router.get("/capital-account/:userId/:projectId", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const projectId = parseInt(req.params.projectId);

    const ip = await prisma.investorProject.findUnique({
      where: { userId_projectId: { userId, projectId } },
    });
    if (!ip) return res.status(404).json({ error: "Investor-project not found" });

    // Sum distributions from cash flows
    const cashFlows = await prisma.cashFlow.findMany({
      where: { userId, projectId },
      orderBy: { date: "asc" },
    });

    const totalDistributions = cashFlows
      .filter((cf) => cf.amount > 0)
      .reduce((s, cf) => s + cf.amount, 0);

    const statement = capitalAccountStatement({
      committed: ip.committed,
      called: ip.called,
      distributions: totalDistributions,
      currentValue: ip.currentValue,
    });

    // Add IRR/MOIC from InvestorProject (may be calculated)
    statement.irr = ip.irr;
    statement.moic = ip.moic;

    res.json(statement);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /record-cashflow (ADMIN) ──────────────────────
router.post("/record-cashflow", requireRole("ADMIN", "GP"), async (req, res) => {
  try {
    const { userId, projectId, date, amount, type, description } = req.body;
    if (!userId || !projectId || !date || amount == null || !type) {
      return res.status(400).json({ error: "userId, projectId, date, amount, and type are required" });
    }

    // Validate type
    const validTypes = ["capital_call", "distribution", "return_of_capital", "income"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: `type must be one of: ${validTypes.join(", ")}` });
    }

    const cashFlow = await prisma.cashFlow.create({
      data: {
        userId: parseInt(userId),
        projectId: parseInt(projectId),
        date: new Date(date),
        amount: parseFloat(amount),
        type,
        description: description || null,
      },
    });

    audit.log(req, "cash_flow_record", `project:${projectId}`, { userId, amount, type });

    res.json(cashFlow);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /cashflows/:userId/:projectId ──────────────────
router.get("/cashflows/:userId/:projectId", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const projectId = parseInt(req.params.projectId);

    const cashFlows = await prisma.cashFlow.findMany({
      where: { userId, projectId },
      orderBy: { date: "asc" },
    });

    res.json(cashFlows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /recalculate/:projectId (ADMIN) ───────────────
// Recalculate IRR/MOIC for all investors in a project based on cash flows
router.post("/recalculate/:projectId", requireRole("ADMIN", "GP"), async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);

    // Get all investor-project records for this project
    const investorProjects = await prisma.investorProject.findMany({
      where: { projectId },
    });

    const results = [];

    for (const ip of investorProjects) {
      // Get all cash flows for this investor+project
      const cashFlows = await prisma.cashFlow.findMany({
        where: { userId: ip.userId, projectId },
        orderBy: { date: "asc" },
      });

      if (cashFlows.length === 0) {
        results.push({ userId: ip.userId, irr: ip.irr, moic: ip.moic, status: "no_cashflows" });
        continue;
      }

      // Build XIRR cash flows: actual flows + terminal NAV
      const xirrFlows = cashFlows.map((cf) => ({
        date: cf.date,
        amount: cf.amount,
      }));

      // Add current NAV as terminal positive cash flow (today)
      xirrFlows.push({
        date: new Date(),
        amount: ip.currentValue,
      });

      const irr = calculateXIRR(xirrFlows);

      // Calculate MOIC
      const totalInvested = cashFlows
        .filter((cf) => cf.amount < 0)
        .reduce((s, cf) => s + Math.abs(cf.amount), 0);
      const totalDistributions = cashFlows
        .filter((cf) => cf.amount > 0)
        .reduce((s, cf) => s + cf.amount, 0);
      const moic = calculateMOIC(totalDistributions, ip.currentValue, totalInvested);

      // Update InvestorProject
      await prisma.investorProject.update({
        where: { id: ip.id },
        data: {
          irr: irr != null ? Math.round(irr * 1000) / 10 : ip.irr, // convert decimal to percentage
          moic,
        },
      });

      results.push({ userId: ip.userId, irr: irr != null ? Math.round(irr * 1000) / 10 : ip.irr, moic, status: "updated" });
    }

    res.json({ projectId, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
