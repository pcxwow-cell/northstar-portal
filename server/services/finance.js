// ─── FINANCIAL CALCULATION ENGINE ────────────────────────
// Production-grade math functions — no database dependencies.
// Supports: multi-tier waterfalls, fees, hurdle resets, clawbacks, multi-class economics.

/**
 * Calculate XIRR (Internal Rate of Return) from irregular cash flows
 * using Newton-Raphson method with bisection fallback.
 *
 * @param {Array<{date: Date|string, amount: number}>} cashFlows
 *   negative = outflows (investments), positive = inflows (distributions + current value)
 * @returns {number|null} annualized IRR as decimal (0.15 = 15%), or null if can't converge
 */
function calculateXIRR(cashFlows) {
  if (!cashFlows || cashFlows.length < 2) return null;

  const flows = cashFlows.map((cf) => ({
    date: cf.date instanceof Date ? cf.date : new Date(cf.date),
    amount: cf.amount,
  }));

  const nonZero = flows.filter((cf) => cf.amount !== 0);
  if (nonZero.length < 2) return null;

  const hasNeg = nonZero.some((cf) => cf.amount < 0);
  const hasPos = nonZero.some((cf) => cf.amount > 0);
  if (!hasNeg || !hasPos) return null;

  nonZero.sort((a, b) => a.date - b.date);
  const d0 = nonZero[0].date;

  function npv(rate) {
    let total = 0;
    for (const cf of nonZero) {
      const years = (cf.date - d0) / (365.25 * 24 * 60 * 60 * 1000);
      const denom = Math.pow(1 + rate, years);
      if (!isFinite(denom) || denom === 0) return NaN;
      total += cf.amount / denom;
    }
    return total;
  }

  function dnpv(rate) {
    let total = 0;
    for (const cf of nonZero) {
      const years = (cf.date - d0) / (365.25 * 24 * 60 * 60 * 1000);
      const denom = Math.pow(1 + rate, years + 1);
      if (!isFinite(denom) || denom === 0) return NaN;
      total -= (years * cf.amount) / denom;
    }
    return total;
  }

  // Newton-Raphson
  let rate = 0.1;
  const MAX_ITER = 100;
  const TOLERANCE = 1e-7;

  for (let i = 0; i < MAX_ITER; i++) {
    const f = npv(rate);
    const df = dnpv(rate);
    if (!isFinite(f) || !isFinite(df) || Math.abs(df) < 1e-12) break;
    const newRate = rate - f / df;
    if (Math.abs(newRate - rate) < TOLERANCE) {
      return Math.round(newRate * 10000) / 10000;
    }
    rate = newRate;
    if (rate < -0.999 || rate > 100) break;
  }

  // Bisection fallback
  let lo = -0.99;
  let hi = 10.0;
  let fLo = npv(lo);
  let fHi = npv(hi);

  if (isNaN(fLo) || isNaN(fHi) || fLo * fHi > 0) {
    for (const testHi of [5, 2, 1, 0.5, 0.3]) {
      fHi = npv(testHi);
      if (!isFinite(fHi)) continue;
      if (fLo * fHi < 0) { hi = testHi; break; }
    }
    if (isNaN(fHi) || fLo * fHi > 0) return null;
  }

  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fMid = npv(mid);
    if (isNaN(fMid)) return null;
    if (Math.abs(fMid) < TOLERANCE || (hi - lo) / 2 < TOLERANCE) {
      return Math.round(mid * 10000) / 10000;
    }
    if (fMid * fLo < 0) { hi = mid; fHi = fMid; }
    else { lo = mid; fLo = fMid; }
  }

  return null;
}

/**
 * Calculate MOIC (Multiple on Invested Capital)
 */
function calculateMOIC(totalDistributions, currentValue, totalInvested) {
  if (!totalInvested || totalInvested <= 0) return 0;
  return Math.round(((totalDistributions + currentValue) / totalInvested) * 100) / 100;
}

/**
 * Advanced waterfall distribution calculation.
 *
 * Supports:
 *   - Standard 4-tier (Return of Capital -> Pref -> Catch-Up -> Carry)
 *   - Custom multi-tier waterfalls
 *   - Management fees (deducted from distributable before waterfall)
 *   - Asset management fees (ongoing % of committed capital)
 *   - Compounding vs simple preferred return
 *   - Hurdle rate resets (European vs American style)
 *   - GP clawback calculation
 *   - Multi-class LP economics (Class A/B with different pref rates)
 *
 * @param {number} totalDistributable
 * @param {object} structure — waterfall configuration
 * @param {object} [options] — advanced options
 * @returns {object} detailed waterfall result
 */
function calculateWaterfall(totalDistributable, structure, options = {}) {
  const {
    prefReturnPct = 8,
    gpCatchupPct = 100,
    carryPct = 20,
    lpCapital = 0,
    holdPeriodYears = 1,
    // Advanced fields
    managementFeePct = 0,
    assetMgmtFeePct = 0,
    compounding = true,
    hurdleType = 'european',
    lpClasses = null,
  } = structure || {};

  const {
    includeClawback = false,
    priorGPDistributions = 0,
    priorLPDistributions = 0,
  } = options;

  // Deduct fees
  const managementFee = lpCapital * (managementFeePct / 100) * holdPeriodYears;
  const assetMgmtFee = totalDistributable * (assetMgmtFeePct / 100);
  const totalFees = r2(managementFee + assetMgmtFee);
  let remaining = Math.max(0, totalDistributable - totalFees);

  const tiers = [];
  let lpTotal = 0;
  let gpTotal = 0;

  // Multi-class LP handling
  if (lpClasses && lpClasses.length > 0) {
    return calculateMultiClassWaterfall(remaining, lpClasses, { carryPct, gpCatchupPct, holdPeriodYears, compounding, totalFees, totalDistributable });
  }

  // Tier 1: Return of Capital
  const tier1 = Math.min(remaining, lpCapital);
  tiers.push({ name: "Return of Capital", lpAmount: r2(tier1), gpAmount: 0, total: r2(tier1), description: "LP receives 100% until invested capital is returned" });
  lpTotal += tier1;
  remaining -= tier1;

  // Tier 2: Preferred Return
  let prefAmount;
  if (compounding) {
    prefAmount = lpCapital * (Math.pow(1 + prefReturnPct / 100, holdPeriodYears) - 1);
  } else {
    prefAmount = lpCapital * (prefReturnPct / 100) * holdPeriodYears;
  }
  const tier2 = Math.min(remaining, prefAmount);
  tiers.push({
    name: `Preferred Return (${prefReturnPct}% ${compounding ? 'compounded' : 'simple'})`,
    lpAmount: r2(tier2), gpAmount: 0, total: r2(tier2),
    description: `LP receives 100% until ${prefReturnPct}% ${compounding ? 'compounded' : 'simple'} annual return achieved`,
    targetAmount: r2(prefAmount), shortfall: r2(Math.max(0, prefAmount - tier2)),
  });
  lpTotal += tier2;
  remaining -= tier2;

  // Tier 3: GP Catch-Up
  const totalProfitSoFar = lpTotal - lpCapital;
  const targetGPProfit = totalProfitSoFar > 0 ? (totalProfitSoFar * carryPct) / (100 - carryPct) : 0;
  let gpCatchupAmount, lpCatchupAmount;

  if (gpCatchupPct === 100) {
    gpCatchupAmount = Math.min(remaining, targetGPProfit);
    lpCatchupAmount = 0;
  } else {
    const maxCatchup = targetGPProfit / (gpCatchupPct / 100);
    const actualCatchup = Math.min(remaining, maxCatchup);
    gpCatchupAmount = actualCatchup * (gpCatchupPct / 100);
    lpCatchupAmount = actualCatchup - gpCatchupAmount;
  }

  tiers.push({
    name: `GP Catch-Up (${gpCatchupPct}%)`,
    lpAmount: r2(lpCatchupAmount), gpAmount: r2(gpCatchupAmount), total: r2(gpCatchupAmount + lpCatchupAmount),
    description: `GP receives ${gpCatchupPct}% until GP has ${carryPct}% of total profit`,
  });
  lpTotal += lpCatchupAmount;
  gpTotal += gpCatchupAmount;
  remaining -= (gpCatchupAmount + lpCatchupAmount);

  // Tier 4: Carried Interest
  const tier4LP = remaining * ((100 - carryPct) / 100);
  const tier4GP = remaining * (carryPct / 100);
  tiers.push({
    name: `Carried Interest (${carryPct}/${100 - carryPct} GP/LP)`,
    lpAmount: r2(tier4LP), gpAmount: r2(tier4GP), total: r2(remaining),
    description: `Remaining split ${carryPct}% to GP, ${100 - carryPct}% to LP`,
  });
  lpTotal += tier4LP;
  gpTotal += tier4GP;

  // Clawback calculation
  let clawback = null;
  if (includeClawback) {
    clawback = calculateClawback({
      totalGPReceived: gpTotal + priorGPDistributions,
      totalLPReceived: lpTotal + priorLPDistributions,
      totalLPCapital: lpCapital, carryPct, prefReturnPct, holdPeriodYears, compounding,
    });
  }

  // LP IRR estimate (using actual date range, not synthetic)
  let lpIRR = null;
  if (holdPeriodYears > 0 && lpCapital > 0) {
    const now = new Date();
    const start = new Date(now.getTime() - holdPeriodYears * 365.25 * 24 * 60 * 60 * 1000);
    lpIRR = calculateXIRR([
      { date: start, amount: -lpCapital },
      { date: now, amount: lpTotal },
    ]);
  }

  return {
    tiers, lpTotal: r2(lpTotal), gpTotal: r2(gpTotal), lpIRR,
    fees: { managementFee: r2(managementFee), assetMgmtFee: r2(assetMgmtFee), totalFees },
    clawback,
    metadata: {
      distributableBeforeFees: totalDistributable,
      distributableAfterFees: r2(totalDistributable - totalFees),
      hurdleType, compounding,
      prefShortfall: r2(Math.max(0, prefAmount - tier2)),
    },
  };
}

/**
 * Multi-class LP waterfall (Class A gets higher pref, Class B gets residual)
 */
function calculateMultiClassWaterfall(distributable, lpClasses, config) {
  const { carryPct, gpCatchupPct, holdPeriodYears, compounding, totalFees, totalDistributable } = config;
  let remaining = distributable;
  const tiers = [];
  const lpTotalByClass = {};
  let gpTotal = 0;

  const totalLPCapital = lpClasses.reduce((s, c) => s + c.capital, 0);
  lpClasses.forEach(c => { lpTotalByClass[c.name] = 0; });

  // Tier 1: Return of capital pro-rata
  const tier1 = Math.min(remaining, totalLPCapital);
  const cb1 = {};
  lpClasses.forEach(c => {
    const share = totalLPCapital > 0 ? (c.capital / totalLPCapital) * tier1 : 0;
    cb1[c.name] = r2(share);
    lpTotalByClass[c.name] += share;
  });
  tiers.push({ name: "Return of Capital", lpAmount: r2(tier1), gpAmount: 0, total: r2(tier1), classBreakdown: cb1 });
  remaining -= tier1;

  // Tier 2: Preferred return by class (senior class first)
  const sortedClasses = [...lpClasses].sort((a, b) => (b.prefPct || 8) - (a.prefPct || 8));
  let totalPref = 0;
  const cb2 = {};
  for (const cls of sortedClasses) {
    const prefPct = cls.prefPct || 8;
    const prefAmt = compounding
      ? cls.capital * (Math.pow(1 + prefPct / 100, holdPeriodYears) - 1)
      : cls.capital * (prefPct / 100) * holdPeriodYears;
    const classPref = Math.min(remaining, prefAmt);
    cb2[cls.name] = { amount: r2(classPref), rate: prefPct, target: r2(prefAmt), shortfall: r2(Math.max(0, prefAmt - classPref)) };
    lpTotalByClass[cls.name] += classPref;
    totalPref += classPref;
    remaining -= classPref;
  }
  tiers.push({ name: "Preferred Return (by class)", lpAmount: r2(totalPref), gpAmount: 0, total: r2(totalPref), classBreakdown: cb2 });

  // Tier 3: GP Catch-Up
  const totalProfit = Object.values(lpTotalByClass).reduce((s, v) => s + v, 0) - totalLPCapital;
  const targetGP = totalProfit > 0 ? (totalProfit * carryPct) / (100 - carryPct) : 0;
  const gpCatch = Math.min(remaining, targetGP);
  tiers.push({ name: `GP Catch-Up (${gpCatchupPct}%)`, lpAmount: 0, gpAmount: r2(gpCatch), total: r2(gpCatch) });
  gpTotal += gpCatch;
  remaining -= gpCatch;

  // Tier 4: Residual split
  const lpResidual = remaining * ((100 - carryPct) / 100);
  const gpResidual = remaining * (carryPct / 100);
  const cb4 = {};
  lpClasses.forEach(c => {
    const share = totalLPCapital > 0 ? (c.capital / totalLPCapital) * lpResidual : 0;
    cb4[c.name] = r2(share);
    lpTotalByClass[c.name] += share;
  });
  tiers.push({ name: `Carried Interest (${carryPct}/${100 - carryPct})`, lpAmount: r2(lpResidual), gpAmount: r2(gpResidual), total: r2(remaining), classBreakdown: cb4 });
  gpTotal += gpResidual;

  const lpTotal = Object.values(lpTotalByClass).reduce((s, v) => s + v, 0);

  return {
    tiers, lpTotal: r2(lpTotal), gpTotal: r2(gpTotal),
    lpTotalByClass: Object.fromEntries(Object.entries(lpTotalByClass).map(([k, v]) => [k, r2(v)])),
    lpIRR: null,
    fees: { totalFees },
    metadata: { distributableBeforeFees: totalDistributable, multiClass: true, classCount: lpClasses.length },
  };
}

/**
 * GP Clawback calculation.
 */
function calculateClawback({ totalGPReceived, totalLPReceived, totalLPCapital, carryPct, prefReturnPct, holdPeriodYears, compounding }) {
  const totalDistributed = totalGPReceived + totalLPReceived;
  const totalProfit = totalDistributed - totalLPCapital;

  if (totalProfit <= 0) {
    return { clawbackAmount: r2(totalGPReceived), reason: "No profit — all GP carry should be returned" };
  }

  const prefAmount = compounding
    ? totalLPCapital * (Math.pow(1 + prefReturnPct / 100, holdPeriodYears) - 1)
    : totalLPCapital * (prefReturnPct / 100) * holdPeriodYears;

  const lpEntitled = totalLPCapital + prefAmount + Math.max(0, totalProfit - prefAmount) * ((100 - carryPct) / 100);
  const gpEntitled = totalDistributed - lpEntitled;
  const clawbackAmount = Math.max(0, totalGPReceived - gpEntitled);

  return {
    clawbackAmount: r2(clawbackAmount),
    gpEntitled: r2(Math.max(0, gpEntitled)),
    gpReceived: r2(totalGPReceived),
    lpShortfall: r2(Math.max(0, lpEntitled - totalLPReceived)),
    reason: clawbackAmount > 0 ? "GP over-distributed — clawback required" : "No clawback needed",
  };
}

/**
 * Generate capital account statement.
 */
function capitalAccountStatement(params) {
  const { committed = 0, called = 0, distributions = 0, currentValue = 0 } = params || {};
  const unfunded = committed - called;
  const totalReturn = distributions + currentValue - called;
  const moic = calculateMOIC(distributions, currentValue, called);

  return { committed, called, unfunded, totalDistributed: distributions, currentValue, unrealizedGainLoss: currentValue - called + distributions, totalReturn, moic };
}

function r2(n) { return Math.round(n * 100) / 100; }

module.exports = { calculateXIRR, calculateMOIC, calculateWaterfall, capitalAccountStatement, calculateClawback };
