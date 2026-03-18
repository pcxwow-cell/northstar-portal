// ─── SCHEDULED TASK SERVICE ─────────────────────────────
// Manages recurring jobs (statement generation, email delivery, etc.)
// using node-cron. All schedules are configurable via environment variables.
//
// NOTE: "node-cron" must be added to server/package.json:
//   npm install node-cron
//

const cron = require("node-cron");
const prisma = require("../prisma");
const email = require("./email");

// ─── Job Registry ───────────────────────────────────────

const jobs = new Map();

const JOB_DEFINITIONS = {
  QUARTERLY_STATEMENTS: {
    description: "Generate quarterly investor statements and queue email delivery",
    // 1st of Jan, Apr, Jul, Oct at 6:00 AM
    schedule: process.env.CRON_QUARTERLY_STATEMENTS || "0 6 1 1,4,7,10 *",
    enabled: true,
    handler: runQuarterlyStatements,
  },
  MONTHLY_STATEMENTS: {
    description: "Generate monthly investor statements (optional)",
    // 1st of every month at 6:00 AM
    schedule: process.env.CRON_MONTHLY_STATEMENTS || "0 6 1 * *",
    enabled: process.env.ENABLE_MONTHLY_STATEMENTS === "true",
    handler: runMonthlyStatements,
  },
};

// ─── Job Handlers ───────────────────────────────────────

async function runQuarterlyStatements() {
  return await generateAndDeliverStatements("quarterly");
}

async function runMonthlyStatements() {
  return await generateAndDeliverStatements("monthly");
}

/**
 * Core routine: generate all investor statements for the given period
 * and email each one. Requires a statementGenerator service to exist
 * at ./statementGenerator with a generateAllStatements(period) export.
 */
async function generateAndDeliverStatements(period) {
  const { generateAllStatements } = require("./statementGenerator");

  console.log(`[scheduler] Generating ${period} statements...`);
  const statements = await generateAllStatements(period);
  console.log(`[scheduler] Generated ${statements.length} statements`);

  if (statements.length === 0) return { generated: 0, emailed: 0 };

  const emails = statements.map((stmt) => ({
    to: stmt.investorEmail,
    subject: `Your ${period} investment statement is ready`,
    html: stmt.html,
    text: stmt.text || `Your ${period} statement is available in the investor portal.`,
  }));

  const results = await email.sendBulk(emails);
  const sent = results.filter((r) => r.status === "sent").length;
  console.log(`[scheduler] Emailed ${sent}/${statements.length} statements`);

  return { generated: statements.length, emailed: sent };
}

// ─── Job State Tracking ─────────────────────────────────

const jobState = new Map(); // jobName → { lastRunAt, lastResult, lastError }

function wrapHandler(name, handler) {
  return async () => {
    const start = new Date();
    console.log(`[scheduler] Job "${name}" started at ${start.toISOString()}`);
    try {
      const result = await handler();
      const end = new Date();
      jobState.set(name, {
        lastRunAt: start,
        durationMs: end - start,
        lastResult: result || null,
        lastError: null,
      });
      console.log(`[scheduler] Job "${name}" completed in ${end - start}ms`);
    } catch (err) {
      const end = new Date();
      jobState.set(name, {
        lastRunAt: start,
        durationMs: end - start,
        lastResult: null,
        lastError: err.message,
      });
      console.error(`[scheduler] Job "${name}" failed:`, err.message);
    }
  };
}

// ─── Public API ─────────────────────────────────────────

/**
 * Register and start all enabled cron jobs.
 */
function startScheduler() {
  for (const [name, def] of Object.entries(JOB_DEFINITIONS)) {
    if (!def.enabled) {
      console.log(`[scheduler] Skipping disabled job: ${name}`);
      continue;
    }

    if (!cron.validate(def.schedule)) {
      console.error(`[scheduler] Invalid cron expression for ${name}: "${def.schedule}"`);
      continue;
    }

    const task = cron.schedule(def.schedule, wrapHandler(name, def.handler), {
      scheduled: true,
      timezone: process.env.CRON_TIMEZONE || "America/Los_Angeles",
    });

    jobs.set(name, { task, definition: def });
    console.log(`[scheduler] Registered job: ${name} (${def.schedule})`);
  }

  console.log(`[scheduler] Started with ${jobs.size} active job(s)`);
}

/**
 * Stop all running cron jobs.
 */
function stopScheduler() {
  for (const [name, { task }] of jobs) {
    task.stop();
    console.log(`[scheduler] Stopped job: ${name}`);
  }
  jobs.clear();
  console.log("[scheduler] All jobs stopped");
}

/**
 * Manually trigger a job by name (for admin API usage).
 * @param {string} jobName — key from JOB_DEFINITIONS
 */
async function runJobNow(jobName) {
  const def = JOB_DEFINITIONS[jobName];
  if (!def) {
    throw new Error(`Unknown job: "${jobName}". Available: ${Object.keys(JOB_DEFINITIONS).join(", ")}`);
  }
  console.log(`[scheduler] Manual trigger: ${jobName}`);
  await wrapHandler(jobName, def.handler)();
  return jobState.get(jobName);
}

/**
 * Return status of all defined jobs including schedule, next run,
 * and last run information.
 */
function getJobStatus() {
  return Object.entries(JOB_DEFINITIONS).map(([name, def]) => {
    const running = jobs.has(name);
    const state = jobState.get(name) || null;

    return {
      name,
      description: def.description,
      schedule: def.schedule,
      enabled: def.enabled,
      running,
      lastRun: state
        ? {
            at: state.lastRunAt,
            durationMs: state.durationMs,
            result: state.lastResult,
            error: state.lastError,
          }
        : null,
    };
  });
}

module.exports = { startScheduler, stopScheduler, runJobNow, getJobStatus };
