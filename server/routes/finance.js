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

    // IDOR protection: investors can only access their own capital account
    if (req.user.role === "INVESTOR" && req.user.id !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

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

// ─── GET /cashflows?projectId=X — list all cash flows for a project (ADMIN) ──
router.get("/cashflows", requireRole("ADMIN", "GP"), async (req, res) => {
  try {
    const { projectId } = req.query;
    if (!projectId) return res.status(400).json({ error: "projectId query param is required" });

    const cashFlows = await prisma.cashFlow.findMany({
      where: { projectId: parseInt(projectId) },
      include: { user: { select: { id: true, name: true } }, project: { select: { id: true, name: true } } },
      orderBy: { date: "asc" },
    });

    res.json(cashFlows.map(cf => ({
      id: cf.id, projectId: cf.projectId, userId: cf.userId,
      investorName: cf.user.name, projectName: cf.project.name,
      date: cf.date, amount: cf.amount, type: cf.type, description: cf.description, createdAt: cf.createdAt,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /cashflows/:id — edit a cash flow record (ADMIN) ──
router.put("/cashflows/:id", requireRole("ADMIN", "GP"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { date, amount, type, description } = req.body;

    const existing = await prisma.cashFlow.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Cash flow not found" });

    const validTypes = ["capital_call", "distribution", "return_of_capital", "income"];
    if (type && !validTypes.includes(type)) {
      return res.status(400).json({ error: `type must be one of: ${validTypes.join(", ")}` });
    }

    const updated = await prisma.cashFlow.update({
      where: { id },
      data: {
        ...(date !== undefined && { date: new Date(date) }),
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        ...(type !== undefined && { type }),
        ...(description !== undefined && { description: description || null }),
      },
    });

    audit.log(req, "cash_flow_edit", `cashflow:${id}`, { projectId: updated.projectId, userId: updated.userId, amount: updated.amount, type: updated.type });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /cashflows/:id — delete a cash flow record (ADMIN) ──
router.delete("/cashflows/:id", requireRole("ADMIN", "GP"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.cashFlow.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Cash flow not found" });

    await prisma.cashFlow.delete({ where: { id } });
    audit.log(req, "cash_flow_delete", `cashflow:${id}`, { projectId: existing.projectId, userId: existing.userId, amount: existing.amount });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /cashflows/:userId/:projectId ──────────────────
router.get("/cashflows/:userId/:projectId", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const projectId = parseInt(req.params.projectId);

    // IDOR protection: investors can only access their own cash flows
    if (req.user.role === "INVESTOR" && req.user.id !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

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

// ─── POST /model-scenario — Full financial scenario modeling ───
router.post("/model-scenario", async (req, res) => {
  try {
    const { projectId, scenario } = req.body;
    if (!scenario) return res.status(400).json({ error: "scenario is required" });

    const {
      totalInvestment = 0,
      holdPeriodYears = 5,
      exitValue = 0,
      annualCashFlow = 0,
      prefReturnPct = 8,
      gpCatchupPct = 100,
      carryPct = 20,
    } = scenario;

    // Calculate total distributable: exit value + cumulative cash flows
    const totalCashFlows = annualCashFlow * holdPeriodYears;
    const totalDistributable = exitValue + totalCashFlows;

    // Run waterfall calculation
    const waterfallResult = calculateWaterfall(totalDistributable, {
      prefReturnPct, gpCatchupPct, carryPct,
      lpCapital: totalInvestment,
      holdPeriodYears,
    });

    const lpReturn = waterfallResult.lpTotal;
    const gpReturn = waterfallResult.gpTotal;
    const totalReturn = lpReturn + gpReturn;
    const lpProfit = lpReturn - totalInvestment;
    const lpMOIC = totalInvestment > 0 ? Math.round((lpReturn / totalInvestment) * 100) / 100 : 0;
    const equityMultiple = lpMOIC;
    const cashOnCash = totalInvestment > 0 ? Math.round((totalCashFlows / totalInvestment) * 10000) / 100 : 0;

    // LP IRR calculation using XIRR
    const xirrFlows = [{ date: new Date("2023-01-01"), amount: -totalInvestment }];
    // Add annual cash flows
    for (let y = 1; y <= holdPeriodYears; y++) {
      const dt = new Date("2023-01-01");
      dt.setFullYear(dt.getFullYear() + y);
      if (y < holdPeriodYears) {
        // Annual operating cash flow goes to LP (before exit, assume LP gets all operating income)
        xirrFlows.push({ date: dt, amount: annualCashFlow });
      } else {
        // Final year: operating cash flow + LP share of exit
        xirrFlows.push({ date: dt, amount: annualCashFlow + lpReturn - totalCashFlows * ((100 - carryPct) / 100) });
      }
    }
    // Simplify: just use two-flow model for clean IRR
    const lpIRRFlows = [
      { date: new Date("2023-01-01"), amount: -totalInvestment },
    ];
    for (let y = 1; y <= holdPeriodYears; y++) {
      const dt = new Date("2023-01-01");
      dt.setFullYear(dt.getFullYear() + y);
      if (y < holdPeriodYears) {
        lpIRRFlows.push({ date: dt, amount: annualCashFlow });
      } else {
        lpIRRFlows.push({ date: dt, amount: annualCashFlow + (lpReturn - totalCashFlows) });
      }
    }
    const lpIRR = calculateXIRR(lpIRRFlows);

    // GP IRR (GP only gets money at exit through waterfall)
    const gpIRR = holdPeriodYears > 0 && gpReturn > 0
      ? Math.round((Math.pow(gpReturn / 1, 1 / holdPeriodYears) - 1) * 10000) / 10000
      : null;

    // Year-by-year cash flow table
    const yearByYear = [];
    let cumulativeCashFlow = -totalInvestment;
    yearByYear.push({ year: 0, cashFlow: -totalInvestment, cumulativeCashFlow, balance: totalInvestment });
    for (let y = 1; y <= holdPeriodYears; y++) {
      const cf = y < holdPeriodYears ? annualCashFlow : annualCashFlow + (exitValue - totalInvestment);
      cumulativeCashFlow += (y < holdPeriodYears ? annualCashFlow : annualCashFlow + exitValue);
      yearByYear.push({
        year: y,
        cashFlow: y < holdPeriodYears ? annualCashFlow : annualCashFlow + exitValue,
        cumulativeCashFlow,
        balance: y < holdPeriodYears ? totalInvestment : 0,
      });
    }

    // Sensitivity table: IRR at different exit values
    const sensitivityMultiples = [0.8, 0.9, 1.0, 1.1, 1.2];
    const sensitivity = sensitivityMultiples.map(mult => {
      const adjExitValue = Math.round(exitValue * mult);
      const adjTotal = adjExitValue + totalCashFlows;
      const adjWaterfall = calculateWaterfall(adjTotal, { prefReturnPct, gpCatchupPct, carryPct, lpCapital: totalInvestment, holdPeriodYears });
      const adjFlows = [
        { date: new Date("2023-01-01"), amount: -totalInvestment },
        { date: new Date(new Date("2023-01-01").getTime() + holdPeriodYears * 365.25 * 24 * 60 * 60 * 1000), amount: adjWaterfall.lpTotal },
      ];
      const adjIRR = calculateXIRR(adjFlows);
      return {
        label: `${mult >= 1 ? "+" : ""}${Math.round((mult - 1) * 100)}%`,
        exitValue: adjExitValue,
        lpReturn: adjWaterfall.lpTotal,
        lpIRR: adjIRR,
        lpMOIC: totalInvestment > 0 ? Math.round((adjWaterfall.lpTotal / totalInvestment) * 100) / 100 : 0,
      };
    });

    res.json({
      totalReturn,
      lpReturn: Math.round(lpReturn * 100) / 100,
      gpReturn: Math.round(gpReturn * 100) / 100,
      lpIRR,
      gpIRR,
      lpMOIC,
      equityMultiple,
      cashOnCash,
      yearByYear,
      waterfallBreakdown: waterfallResult.tiers,
      sensitivity,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
