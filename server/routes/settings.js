const { Router } = require("express");
const prisma = require("../prisma");
const { requireRole } = require("../middleware/auth");
const audit = require("../services/audit");
const router = Router();

router.use(requireRole("ADMIN"));

// Helper: get or create singleton settings
async function getSettings() {
  let settings = await prisma.emailSettings.findFirst();
  if (!settings) {
    settings = await prisma.emailSettings.create({ data: {} });
  }
  return settings;
}

// GET /api/v1/settings/email — get email settings
router.get("/email", async (req, res, next) => {
  try {
    const settings = await getSettings();
    // Also return current env-level config (read-only)
    res.json({
      ...settings,
      _provider: process.env.EMAIL_PROVIDER || "demo",
      _providerConfigured: !!(process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY),
      _envFromAddress: process.env.EMAIL_FROM_ADDRESS || null,
      _envFromName: process.env.EMAIL_FROM_NAME || null,
    });
  } catch (err) { next(err); }
});

// PUT /api/v1/settings/email — update email settings
router.put("/email", async (req, res, next) => {
  try {
    const settings = await getSettings();
    const {
      enableDocuments, enableSignatures, enableDistributions, enableMessages,
      enableCapitalCalls, enableWelcome, enablePasswordReset,
      fromName, fromAddress, replyToAddress, brandColor,
      companyName, companyAddress, logoUrl, portalUrl,
      subjectWelcome, subjectDocument, subjectSignature,
      subjectDistribution, subjectMessage, subjectCapitalCall, subjectPasswordReset,
      footerText,
    } = req.body;

    const data = {};
    // Toggles
    if (typeof enableDocuments === "boolean") data.enableDocuments = enableDocuments;
    if (typeof enableSignatures === "boolean") data.enableSignatures = enableSignatures;
    if (typeof enableDistributions === "boolean") data.enableDistributions = enableDistributions;
    if (typeof enableMessages === "boolean") data.enableMessages = enableMessages;
    if (typeof enableCapitalCalls === "boolean") data.enableCapitalCalls = enableCapitalCalls;
    if (typeof enableWelcome === "boolean") data.enableWelcome = enableWelcome;
    if (typeof enablePasswordReset === "boolean") data.enablePasswordReset = enablePasswordReset;
    // Branding
    if (fromName !== undefined) data.fromName = fromName || null;
    if (fromAddress !== undefined) data.fromAddress = fromAddress || null;
    if (replyToAddress !== undefined) data.replyToAddress = replyToAddress || null;
    if (brandColor !== undefined) data.brandColor = brandColor || null;
    if (companyName !== undefined) data.companyName = companyName || null;
    if (companyAddress !== undefined) data.companyAddress = companyAddress || null;
    if (logoUrl !== undefined) data.logoUrl = logoUrl || null;
    if (portalUrl !== undefined) data.portalUrl = portalUrl || null;
    // Subject overrides
    if (subjectWelcome !== undefined) data.subjectWelcome = subjectWelcome || null;
    if (subjectDocument !== undefined) data.subjectDocument = subjectDocument || null;
    if (subjectSignature !== undefined) data.subjectSignature = subjectSignature || null;
    if (subjectDistribution !== undefined) data.subjectDistribution = subjectDistribution || null;
    if (subjectMessage !== undefined) data.subjectMessage = subjectMessage || null;
    if (subjectCapitalCall !== undefined) data.subjectCapitalCall = subjectCapitalCall || null;
    if (subjectPasswordReset !== undefined) data.subjectPasswordReset = subjectPasswordReset || null;
    // Footer
    if (footerText !== undefined) data.footerText = footerText || null;

    const updated = await prisma.emailSettings.update({
      where: { id: settings.id },
      data,
    });

    audit.log(req, "email_settings_update", "settings:email", { changes: Object.keys(data) });
    res.json(updated);
  } catch (err) { next(err); }
});

// POST /api/v1/settings/email/test — send a test email to yourself
router.post("/email/test", async (req, res, next) => {
  try {
    const emailService = require("../services/email");
    await emailService.sendEmail({
      to: req.user.email,
      subject: "Northstar Portal — Test Email",
      html: "<div style='font-family:sans-serif;padding:20px;'><h2>Test Email</h2><p>This confirms your email configuration is working correctly.</p><p style='color:#999;font-size:12px;'>Sent from Northstar Portal</p></div>",
      text: "Test Email — This confirms your email configuration is working correctly.",
    });
    res.json({ success: true, sentTo: req.user.email });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/settings/email/log — delivery log (admin view of all notification logs)
router.get("/email/log", async (req, res, next) => {
  try {
    const { type, status, limit = 100, offset = 0 } = req.query;
    const where = {};
    if (type && type !== "all") where.type = type;
    if (status && status !== "all") where.status = status;

    const [logs, total] = await Promise.all([
      prisma.notificationLog.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: Math.min(parseInt(limit) || 100, 500),
        skip: parseInt(offset) || 0,
      }),
      prisma.notificationLog.count({ where }),
    ]);

    res.json({
      logs: logs.map(l => ({
        id: l.id,
        userId: l.userId,
        userName: l.user?.name || "Unknown",
        userEmail: l.user?.email || "",
        type: l.type,
        subject: l.subject,
        channel: l.channel,
        status: l.status,
        metadata: l.metadata ? JSON.parse(l.metadata) : null,
        createdAt: l.createdAt,
      })),
      total,
    });
  } catch (err) { next(err); }
});

// GET /api/v1/settings/email/stats — delivery statistics
router.get("/email/stats", async (req, res, next) => {
  try {
    const [total, sent, failed, skipped] = await Promise.all([
      prisma.notificationLog.count(),
      prisma.notificationLog.count({ where: { status: "sent" } }),
      prisma.notificationLog.count({ where: { status: "failed" } }),
      prisma.notificationLog.count({ where: { status: "skipped" } }),
    ]);

    // Count by type
    const types = ["document_uploaded", "signature_required", "signature_completed", "distribution_paid", "new_message", "capital_call"];
    const byType = {};
    for (const t of types) {
      byType[t] = await prisma.notificationLog.count({ where: { type: t } });
    }

    res.json({ total, sent, failed, skipped, byType });
  } catch (err) { next(err); }
});

module.exports = router;
