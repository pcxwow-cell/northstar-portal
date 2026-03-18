// ─── FINANCIAL CALCULATION ENGINE ────────────────────────
// Pure math functions — no database dependencies.

/**
 * Calculate XIRR (Internal Rate of Return) from irregular cash flows
 * using Newton-Raphson method with bisection fallback.
 *
 * @param {Array<{date: Date, amount: number}>} cashFlows
 *   negative = outflows (investments), positive = inflows (distributions + current value)
 * @returns {number|null} annualized IRR as decimal (0.15 = 15%), or null if can't converge
 */
function calculateXIRR(cashFlows) {
  if (!cashFlows || cashFlows.length < 2) return null;

  // Ensure dates are Date objects
  const flows = cashFlows.map((cf) => ({
    date: cf.date instanceof Date ? cf.date : new Date(cf.date),
    amount: cf.amount,
  }));

  // Filter out zero amounts
  const nonZero = flows.filter((cf) => cf.amount !== 0);
  if (nonZero.length < 2) return null;

  // Need at least one negative and one positive
  const hasNeg = nonZero.some((cf) => cf.amount < 0);
  const hasPos = nonZero.some((cf) => cf.amount > 0);
  if (!hasNeg || !hasPos) return null;

  // Sort by date
  nonZero.sort((a, b) => a.date - b.date);
  const d0 = nonZero[0].date;

  // NPV as function of rate
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

  // Derivative of NPV w.r.t. rate
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
  let rate = 0.1; // initial guess 10%
  const MAX_ITER = 100;
  const TOLERANCE = 1e-7;

  for (let i = 0; i < MAX_ITER; i++) {
    const f = npv(rate);
    const df = dnpv(rate);
    if (!isFinite(f) || !isFinite(df) || Math.abs(df) < 1e-12) break;
    const newRate = rate - f / df;
    if (Math.abs(newRate - rate) < TOLERANCE) {
      return Math.round(newRate * 10000) / 10000; // round to 4 decimals
    }
    rate = newRate;
    // Guard against divergence
    if (rate < -0.999 || rate > 100) break;
  }

  // Bisection fallback
  let lo = -0.99;
  let hi = 10.0;
  let fLo = npv(lo);
  let fHi = npv(hi);

  // Find valid bracket
  if (isNaN(fLo) || isNaN(fHi) || fLo * fHi > 0) {
    // Try different brackets
    for (const testHi of [5, 2, 1, 0.5, 0.3]) {
      fHi = npv(testHi);
      if (!isNaN(fHi) && fLo * fHi < 0) {
        hi = testHi;
        break;
      }
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
    if (fMid * fLo < 0) {
      hi = mid;
      fHi = fMid;
    } else {
      lo = mid;
      fLo = fMid;
    }
  }

  return null; // couldn't converge
}

/**
 * Calculate MOIC (Multiple on Invested Capital)
 *
 * @param {number} totalDistributions — sum of all distributions received
 * @param {number} currentValue — current NAV/value of position
 * @param {number} totalInvested — total capital called/invested
 * @returns {number} MOIC multiple (1.5 = 1.5x)
 */
function calculateMOIC(totalDistributions, currentValue, totalInvested) {
  if (!totalInvested || totalInvested <= 0) return 0;
  return Math.round(((totalDistributions + currentValue) / totalInvested) * 100) / 100;
}

/**
 * Run waterfall distribution calculation.
 *
 * Standard 4-tier waterfall:
 *   1. Return of Capital — LP gets 100% until invested capital returned
 *   2. Preferred Return  — LP gets 100% until pref IRR achieved
 *   3. GP Catch-Up       — GP gets gpCatchupPct% until GP has carryPct of total profit
 *   4. Carried Interest   — LP gets (100-carryPct)%, GP gets carryPct%
 *
 * @param {number} totalDistributable — total amount to distribute
 * @param {object} structure — { prefReturnPct, gpCatchupPct, carryPct, lpCapital, holdPeriodYears }
 * @returns {object} { tiers, lpTotal, gpTotal, lpIRR }
 */
function calculateWaterfall(totalDistributable, structure) {
  const {
    prefReturnPct = 8,
    gpCatchupPct = 100,
    carryPct = 20,
    lpCapital = 0,
    holdPeriodYears = 1,
  } = structure || {};

  const tiers = [];
  let remaining = totalDistributable;
  let lpTotal = 0;
  let gpTotal = 0;

  // Tier 1: Return of Capital
  const tier1 = Math.min(remaining, lpCapital);
  tiers.push({ name: "Return of Capital", lpAmount: tier1, gpAmount: 0, total: tier1 });
  lpTotal += tier1;
  remaining -= tier1;

  // Tier 2: Preferred Return
  // Compound the preferred return over the hold period
  const prefAmount = lpCapital * (Math.pow(1 + prefReturnPct / 100, holdPeriodYears) - 1);
  const tier2 = Math.min(remaining, prefAmount);
  tiers.push({ name: `Preferred Return (${prefReturnPct}%)`, lpAmount: tier2, gpAmount: 0, total: tier2 });
  lpTotal += tier2;
  remaining -= tier2;

  // Tier 3: GP Catch-Up
  // GP gets gpCatchupPct% until GP has received carryPct% of total profit
  const totalProfitSoFar = lpTotal - lpCapital; // profit distributed so far (pref return)
  const targetGPProfit = (totalProfitSoFar * carryPct) / (100 - carryPct);
  const catchupGP = Math.min(remaining, targetGPProfit);
  const catchupLP = gpCatchupPct === 100 ? 0 : catchupGP * ((100 - gpCatchupPct) / gpCatchupPct);
  const tier3Total = catchupGP + catchupLP;
  const actualTier3 = Math.min(remaining, tier3Total);
  const gpCatchup = gpCatchupPct === 100 ? actualTier3 : actualTier3 * (gpCatchupPct / 100);
  const lpCatchup = actualTier3 - gpCatchup;
  tiers.push({ name: "GP Catch-Up", lpAmount: Math.round(lpCatchup * 100) / 100, gpAmount: Math.round(gpCatchup * 100) / 100, total: Math.round(actualTier3 * 100) / 100 });
  lpTotal += lpCatchup;
  gpTotal += gpCatchup;
  remaining -= actualTier3;

  // Tier 4: Carried Interest (remaining split)
  const tier4LP = remaining * ((100 - carryPct) / 100);
  const tier4GP = remaining * (carryPct / 100);
  tiers.push({ name: "Carried Interest", lpAmount: Math.round(tier4LP * 100) / 100, gpAmount: Math.round(tier4GP * 100) / 100, total: Math.round(remaining * 100) / 100 });
  lpTotal += tier4LP;
  gpTotal += tier4GP;

  // Estimate LP IRR
  let lpIRR = null;
  if (holdPeriodYears > 0 && lpCapital > 0) {
    const lpCashFlows = [
      { date: new Date("2023-01-01"), amount: -lpCapital },
      { date: new Date(new Date("2023-01-01").getTime() + holdPeriodYears * 365.25 * 24 * 60 * 60 * 1000), amount: lpTotal },
    ];
    lpIRR = calculateXIRR(lpCashFlows);
  }

  return {
    tiers,
    lpTotal: Math.round(lpTotal * 100) / 100,
    gpTotal: Math.round(gpTotal * 100) / 100,
    lpIRR,
  };
}

/**
 * Generate capital account statement.
 *
 * @param {object} params — { committed, called, distributions, currentValue }
 * @returns {object} capital account summary
 */
function capitalAccountStatement(params) {
  const { committed = 0, called = 0, distributions = 0, currentValue = 0 } = params || {};
  const unfunded = committed - called;
  const totalReturn = distributions + currentValue - called;
  const moic = calculateMOIC(distributions, currentValue, called);

  return {
    committed,
    called,
    unfunded,
    totalDistributed: distributions,
    currentValue,
    unrealizedGainLoss: currentValue - called + distributions,
    totalReturn,
    moic,
  };
}

module.exports = {
  calculateXIRR,
  calculateMOIC,
  calculateWaterfall,
  capitalAccountStatement,
};
