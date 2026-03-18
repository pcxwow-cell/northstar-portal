// ─── INVESTOR CAPITAL ACCOUNT STATEMENT GENERATOR ──────────────────
// Produces structured statement data from DB records, ready for
// PDF rendering or email delivery.

const prisma = require("../prisma");
const { capitalAccountStatement } = require("./finance");

const DISCLAIMER_TEXT =
  "This statement is provided for informational purposes only and does not " +
  "constitute an offer to sell or a solicitation of an offer to buy any securities. " +
  "Past performance is not indicative of future results. The information contained " +
  "herein has not been audited and is based on data available as of the statement " +
  "date. Investors should refer to their subscription agreements and offering " +
  "documents for definitive terms.";

/**
 * Format a Date to "MMMM D, YYYY" (e.g. "March 18, 2026").
 * @param {Date} d
 * @returns {string}
 */
function fmtDate(d) {
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Format a number as USD currency string.
 * @param {number} n
 * @returns {string}
 */
function fmtCurrency(n) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n);
}

/**
 * Format a decimal as a percentage string (e.g. 0.152 -> "15.20%").
 * @param {number|null} n
 * @returns {string}
 */
function fmtPct(n) {
  if (n == null) return "N/A";
  return (n * 100).toFixed(2) + "%";
}

/**
 * Compute a running-balance transaction history from cash flow records.
 *
 * @param {Array} cashFlows - CashFlow records sorted by date ascending
 * @returns {Array<{date: string, type: string, amount: number, description: string, runningBalance: number}>}
 */
function buildTransactionHistory(cashFlows) {
  let balance = 0;
  return cashFlows.map((cf) => {
    // For running balance: capital calls add to invested balance,
    // distributions reduce it.
    balance += cf.amount < 0 ? Math.abs(cf.amount) : -cf.amount;
    if (balance < 0) balance = 0;

    return {
      date: fmtDate(new Date(cf.date)),
      isoDate: new Date(cf.date).toISOString().slice(0, 10),
      type: cf.type,
      amount: cf.amount,
      description: cf.description || cf.type.replace(/_/g, " "),
      runningBalance: Math.round(balance * 100) / 100,
    };
  });
}

/**
 * Generate a capital account statement for a single investor-project pair.
 *
 * @param {number} userId - User ID of the investor
 * @param {number} projectId - Project ID
 * @param {object} [options]
 * @param {Date}   [options.asOfDate]    - Statement date (defaults to today)
 * @param {Date}   [options.periodStart] - Start of reporting period
 * @param {Date}   [options.periodEnd]   - End of reporting period (defaults to asOfDate)
 * @returns {Promise<object>} Structured statement data
 * @throws {Error} If investor-project record, user, or project not found
 */
async function generateStatement(userId, projectId, options = {}) {
  const asOfDate = options.asOfDate || new Date();
  const periodEnd = options.periodEnd || asOfDate;
  const periodStart = options.periodStart || null;

  // Fetch all required data in parallel
  const [investorProject, user, project, cashFlows] = await Promise.all([
    prisma.investorProject.findUnique({
      where: { userId_projectId: { userId, projectId } },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    }),
    prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true, location: true, status: true },
    }),
    prisma.cashFlow.findMany({
      where: {
        userId,
        projectId,
        ...(periodStart ? { date: { gte: periodStart, lte: periodEnd } } : { date: { lte: periodEnd } }),
      },
      orderBy: { date: "asc" },
    }),
  ]);

  if (!investorProject) {
    throw new Error(`No investment record found for user ${userId} in project ${projectId}`);
  }
  if (!user) {
    throw new Error(`User ${userId} not found`);
  }
  if (!project) {
    throw new Error(`Project ${projectId} not found`);
  }

  // Compute totals from cash flows
  const totalDistributions = cashFlows
    .filter((cf) => cf.amount > 0)
    .reduce((sum, cf) => sum + cf.amount, 0);

  // Use the finance engine for the summary
  const summary = capitalAccountStatement({
    committed: investorProject.committed,
    called: investorProject.called,
    distributions: totalDistributions,
    currentValue: investorProject.currentValue,
  });

  // Build transaction history with running balances
  const transactions = buildTransactionHistory(cashFlows);

  // Period label
  const periodLabel = periodStart
    ? `${fmtDate(periodStart)} — ${fmtDate(periodEnd)}`
    : `Inception — ${fmtDate(periodEnd)}`;

  return {
    header: {
      investorName: user.name,
      investorEmail: user.email,
      projectName: project.name,
      projectLocation: project.location || "",
      projectStatus: project.status,
      statementDate: fmtDate(asOfDate),
      statementDateISO: asOfDate.toISOString().slice(0, 10),
      period: periodLabel,
    },
    summary: {
      committed: investorProject.committed,
      called: investorProject.called,
      unfunded: summary.unfunded,
      distributions: summary.totalDistributed,
      currentValue: investorProject.currentValue,
      unrealizedGainLoss: summary.unrealizedGainLoss,
      totalReturn: summary.totalReturn,
      irr: investorProject.irr,
      moic: investorProject.moic ?? summary.moic,
    },
    transactions,
    footer: {
      disclaimer: DISCLAIMER_TEXT,
      generatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Generate statements for ALL active investor-project pairs.
 *
 * @param {object} [options]
 * @param {Date}   [options.asOfDate]    - Statement date (defaults to today)
 * @param {Date}   [options.periodStart] - Start of reporting period
 * @param {Date}   [options.periodEnd]   - End of reporting period
 * @param {string} [options.projectStatus] - Filter by project status (e.g. "Under Construction")
 * @returns {Promise<Array<{userId: number, projectId: number, statement: object, error: string|null}>>}
 */
async function generateAllStatements(options = {}) {
  const { projectStatus, ...statementOptions } = options;

  // Find all active investor-project pairs
  const investorProjects = await prisma.investorProject.findMany({
    where: {
      user: { status: "ACTIVE" },
      ...(projectStatus ? { project: { status: projectStatus } } : {}),
    },
    select: { userId: true, projectId: true },
  });

  // Generate each statement, capturing errors individually so one
  // failure doesn't block the rest.
  const results = await Promise.all(
    investorProjects.map(async ({ userId, projectId }) => {
      try {
        const statement = await generateStatement(userId, projectId, statementOptions);
        return { userId, projectId, statement, error: null };
      } catch (err) {
        return { userId, projectId, statement: null, error: err.message };
      }
    })
  );

  return results;
}

/**
 * Render a structured statement object to an HTML string suitable for
 * email body or browser preview.
 *
 * @param {object} statementData - Output of generateStatement()
 * @returns {string} Complete HTML document string
 */
function generateStatementHTML(statementData) {
  const { header, summary, transactions, footer } = statementData;

  const transactionRows = transactions
    .map(
      (tx) => `
        <tr>
          <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;">${tx.date}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;">${tx.type.replace(/_/g, " ")}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;">${tx.description}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:right;${tx.amount < 0 ? "color:#dc2626;" : "color:#16a34a;"}">${fmtCurrency(tx.amount)}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${fmtCurrency(tx.runningBalance)}</td>
        </tr>`
    )
    .join("\n");

  const noTransactions = transactions.length === 0
    ? `<tr><td colspan="5" style="padding:16px;text-align:center;color:#6b7280;">No transactions in this period.</td></tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Capital Account Statement — ${header.projectName}</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827;background:#f9fafb;">
  <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;">

    <!-- Header -->
    <div style="padding:32px 32px 24px;border-bottom:2px solid #1e3a5f;">
      <h1 style="margin:0 0 4px;font-size:20px;color:#1e3a5f;">Capital Account Statement</h1>
      <p style="margin:0;font-size:14px;color:#6b7280;">${header.period}</p>
    </div>

    <!-- Investor / Project Info -->
    <div style="padding:20px 32px;display:flex;justify-content:space-between;">
      <table style="font-size:13px;color:#374151;border-collapse:collapse;">
        <tr><td style="padding:2px 12px 2px 0;font-weight:600;">Investor</td><td>${header.investorName}</td></tr>
        <tr><td style="padding:2px 12px 2px 0;font-weight:600;">Project</td><td>${header.projectName}</td></tr>
        <tr><td style="padding:2px 12px 2px 0;font-weight:600;">Location</td><td>${header.projectLocation}</td></tr>
        <tr><td style="padding:2px 12px 2px 0;font-weight:600;">Status</td><td>${header.projectStatus}</td></tr>
        <tr><td style="padding:2px 12px 2px 0;font-weight:600;">Statement Date</td><td>${header.statementDate}</td></tr>
      </table>
    </div>

    <!-- Summary -->
    <div style="padding:0 32px 20px;">
      <h2 style="font-size:15px;color:#1e3a5f;border-bottom:1px solid #e5e7eb;padding-bottom:6px;">Account Summary</h2>
      <table style="width:100%;font-size:13px;border-collapse:collapse;">
        <tr><td style="padding:4px 0;">Committed Capital</td><td style="text-align:right;">${fmtCurrency(summary.committed)}</td></tr>
        <tr><td style="padding:4px 0;">Called Capital</td><td style="text-align:right;">${fmtCurrency(summary.called)}</td></tr>
        <tr><td style="padding:4px 0;">Unfunded Commitment</td><td style="text-align:right;">${fmtCurrency(summary.unfunded)}</td></tr>
        <tr><td colspan="2" style="border-top:1px solid #e5e7eb;padding:2px 0;"></td></tr>
        <tr><td style="padding:4px 0;">Total Distributions</td><td style="text-align:right;">${fmtCurrency(summary.distributions)}</td></tr>
        <tr><td style="padding:4px 0;">Current Value (NAV)</td><td style="text-align:right;">${fmtCurrency(summary.currentValue)}</td></tr>
        <tr><td style="padding:4px 0;">Unrealized Gain / Loss</td><td style="text-align:right;">${fmtCurrency(summary.unrealizedGainLoss)}</td></tr>
        <tr><td colspan="2" style="border-top:1px solid #e5e7eb;padding:2px 0;"></td></tr>
        <tr style="font-weight:600;"><td style="padding:4px 0;">Total Return</td><td style="text-align:right;">${fmtCurrency(summary.totalReturn)}</td></tr>
        <tr><td style="padding:4px 0;">IRR</td><td style="text-align:right;">${fmtPct(summary.irr)}</td></tr>
        <tr><td style="padding:4px 0;">MOIC</td><td style="text-align:right;">${summary.moic != null ? summary.moic + "x" : "N/A"}</td></tr>
      </table>
    </div>

    <!-- Transactions -->
    <div style="padding:0 32px 20px;">
      <h2 style="font-size:15px;color:#1e3a5f;border-bottom:1px solid #e5e7eb;padding-bottom:6px;">Transaction History</h2>
      <table style="width:100%;font-size:12px;border-collapse:collapse;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:6px 12px;text-align:left;font-weight:600;">Date</th>
            <th style="padding:6px 12px;text-align:left;font-weight:600;">Type</th>
            <th style="padding:6px 12px;text-align:left;font-weight:600;">Description</th>
            <th style="padding:6px 12px;text-align:right;font-weight:600;">Amount</th>
            <th style="padding:6px 12px;text-align:right;font-weight:600;">Balance</th>
          </tr>
        </thead>
        <tbody>
          ${transactionRows || noTransactions}
        </tbody>
      </table>
    </div>

    <!-- Footer -->
    <div style="padding:20px 32px;border-top:1px solid #e5e7eb;background:#f9fafb;">
      <p style="font-size:10px;color:#9ca3af;line-height:1.5;margin:0;">${footer.disclaimer}</p>
      <p style="font-size:10px;color:#9ca3af;margin:8px 0 0;">Generated ${footer.generatedAt}</p>
    </div>

  </div>
</body>
</html>`;
}

module.exports = { generateStatement, generateAllStatements, generateStatementHTML };
