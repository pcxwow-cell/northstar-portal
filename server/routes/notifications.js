const { Router } = require("express");
const prisma = require("../prisma");
const { requireRole } = require("../middleware/auth");
const { notify } = require("../services/notifications");
const router = Router();

// GET /api/v1/notifications — get user's notification log
router.get("/", async (req, res, next) => {
  try {
    const logs = await prisma.notificationLog.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    res.json(logs.map(l => ({
      id: l.id,
      type: l.type,
      subject: l.subject,
      channel: l.channel,
      status: l.status,
      metadata: l.metadata ? JSON.parse(l.metadata) : null,
      createdAt: l.createdAt,
    })));
  } catch (err) { next(err); }
});

// GET /api/v1/notifications/preferences — get notification preferences
router.get("/preferences", async (req, res, next) => {
  try {
    let prefs = await prisma.notificationPreference.findUnique({
      where: { userId: req.user.id },
    });

    // Return defaults if no preferences exist yet
    if (!prefs) {
      prefs = {
        emailDocuments: true,
        emailSignatures: true,
        emailDistributions: true,
        emailMessages: true,
        emailCapitalCalls: true,
      };
    }

    res.json({
      emailDocuments: prefs.emailDocuments,
      emailSignatures: prefs.emailSignatures,
      emailDistributions: prefs.emailDistributions,
      emailMessages: prefs.emailMessages,
      emailCapitalCalls: prefs.emailCapitalCalls,
    });
  } catch (err) { next(err); }
});

// PUT /api/v1/notifications/preferences — update preferences
router.put("/preferences", async (req, res, next) => {
  try {
    const { emailDocuments, emailSignatures, emailDistributions, emailMessages, emailCapitalCalls } = req.body;

    const data = {};
    if (typeof emailDocuments === "boolean") data.emailDocuments = emailDocuments;
    if (typeof emailSignatures === "boolean") data.emailSignatures = emailSignatures;
    if (typeof emailDistributions === "boolean") data.emailDistributions = emailDistributions;
    if (typeof emailMessages === "boolean") data.emailMessages = emailMessages;
    if (typeof emailCapitalCalls === "boolean") data.emailCapitalCalls = emailCapitalCalls;

    const prefs = await prisma.notificationPreference.upsert({
      where: { userId: req.user.id },
      create: { userId: req.user.id, ...data },
      update: data,
    });

    res.json({
      emailDocuments: prefs.emailDocuments,
      emailSignatures: prefs.emailSignatures,
      emailDistributions: prefs.emailDistributions,
      emailMessages: prefs.emailMessages,
      emailCapitalCalls: prefs.emailCapitalCalls,
    });
  } catch (err) { next(err); }
});

// POST /api/v1/notifications/test — send test notification (ADMIN)
router.post("/test", requireRole("ADMIN", "GP"), async (req, res, next) => {
  try {
    const { userId, type } = req.body;
    const targetUserId = userId || req.user.id;

    const testData = {
      document_uploaded: { docName: "Test Document", projectName: "Test Project" },
      signature_required: { docName: "Test Agreement", signUrl: "https://portal.northstardevelopment.ca/documents" },
      signature_completed: { investorName: "Test Investor", docName: "Test Agreement" },
      distribution_paid: { amount: 5000, projectName: "Test Project", quarter: "Q1 2026" },
      new_message: { senderName: "Northstar Admin", messageSubject: "Test Message" },
      capital_call: { amount: 100000, projectName: "Test Project", dueDate: "April 30, 2026" },
    };

    const data = testData[type] || testData.document_uploaded;
    const result = await notify(targetUserId, type || "document_uploaded", data);

    res.json(result);
  } catch (err) { next(err); }
});

// POST /api/v1/notifications/:id/read — mark a notification as read
router.post("/:id/read", async (req, res, next) => {
  try {
    // Only allow marking own notifications as read
    const log = await prisma.notificationLog.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!log || log.userId !== req.user.id) return res.status(404).json({ error: "Not found" });
    await prisma.notificationLog.update({
      where: { id: log.id },
      data: { status: "read" },
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
