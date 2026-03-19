// ─── NOTIFICATION TRIGGER HELPER ────────────────────────
// Checks user preferences, builds email from template, sends, and logs.

const prisma = require("../prisma");
const emailService = require("./email");
const templates = require("./email/templates");

// Map notification types to preference fields
const TYPE_TO_PREF = {
  document_uploaded: "emailDocuments",
  signature_required: "emailSignatures",
  signature_completed: "emailSignatures",
  distribution_paid: "emailDistributions",
  new_message: "emailMessages",
  capital_call: "emailCapitalCalls",
};

/**
 * Send a notification to a user, respecting their preferences.
 * @param {number} userId - Target user ID
 * @param {string} type - Notification type (document_uploaded, signature_required, etc.)
 * @param {object} data - Template-specific data
 */
async function notify(userId, type, data) {
  try {
    // 0. Check global email settings (admin toggles)
    const globalSettings = await prisma.emailSettings.findFirst();
    if (globalSettings) {
      const GLOBAL_TOGGLE_MAP = {
        document_uploaded: "enableDocuments",
        signature_required: "enableSignatures",
        signature_completed: "enableSignatures",
        distribution_paid: "enableDistributions",
        new_message: "enableMessages",
        capital_call: "enableCapitalCalls",
      };
      const globalField = GLOBAL_TOGGLE_MAP[type];
      if (globalField && globalSettings[globalField] === false) {
        await prisma.notificationLog.create({
          data: {
            userId,
            type,
            subject: data.subject || type,
            channel: "email",
            status: "skipped",
            metadata: JSON.stringify({ ...data, reason: "globally_disabled" }),
          },
        });
        return { status: "skipped", reason: "globally_disabled" };
      }
    }

    // 1. Check NotificationPreference
    const prefs = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    const prefField = TYPE_TO_PREF[type];
    // If user has preferences set and this type is disabled, skip email but still log
    if (prefs && prefField && !prefs[prefField]) {
      await prisma.notificationLog.create({
        data: {
          userId,
          type,
          subject: data.subject || type,
          channel: "email",
          status: "skipped",
          metadata: JSON.stringify(data),
        },
      });
      return { status: "skipped", reason: "preference_disabled" };
    }

    // 2. Get user info for email
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });
    if (!user) throw new Error(`User ${userId} not found`);

    // 3. Build email from template
    let emailContent;
    switch (type) {
      case "document_uploaded":
        emailContent = templates.newDocument(user.name, data.docName, data.projectName);
        break;
      case "signature_required":
        emailContent = templates.signatureRequired(user.name, data.docName, data.signUrl);
        break;
      case "signature_completed":
        emailContent = templates.signatureCompleted(user.name, data.investorName, data.docName);
        break;
      case "distribution_paid":
        emailContent = templates.distributionPaid(user.name, data.amount, data.projectName, data.quarter);
        break;
      case "new_message":
        emailContent = templates.newMessage(user.name, data.senderName, data.messageSubject, data.messageBody, data.threadId, userId);
        break;
      case "capital_call":
        emailContent = templates.capitalCall(user.name, data.amount, data.projectName, data.dueDate);
        break;
      default:
        emailContent = { subject: data.subject || type, html: `<p>${data.message || ""}</p>`, text: data.message || "" };
    }

    // Apply custom subject line from global settings if configured
    if (globalSettings) {
      const SUBJECT_MAP = {
        document_uploaded: "subjectDocument",
        signature_required: "subjectSignature",
        signature_completed: "subjectSignature",
        distribution_paid: "subjectDistribution",
        new_message: "subjectMessage",
        capital_call: "subjectCapitalCall",
      };
      const subjectField = SUBJECT_MAP[type];
      if (subjectField && globalSettings[subjectField]) {
        emailContent.subject = globalSettings[subjectField];
      }
    }

    // 4. Send via email service
    let emailResult;
    try {
      emailResult = await emailService.sendEmail({
        to: user.email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
        ...(emailContent.headers ? { headers: emailContent.headers } : {}),
      });
    } catch (emailErr) {
      // Log failure but don't throw
      await prisma.notificationLog.create({
        data: {
          userId,
          type,
          subject: emailContent.subject,
          channel: "email",
          status: "failed",
          metadata: JSON.stringify({ ...data, error: emailErr.message }),
        },
      });
      console.error(`Notification email failed for user ${userId}:`, emailErr.message);
      return { status: "failed", error: emailErr.message };
    }

    // 5. Log to NotificationLog
    await prisma.notificationLog.create({
      data: {
        userId,
        type,
        subject: emailContent.subject,
        channel: "email",
        status: "sent",
        metadata: JSON.stringify({ ...data, emailId: emailResult.id }),
      },
    });

    return { status: "sent", emailId: emailResult.id };
  } catch (err) {
    console.error(`Notification error for user ${userId}:`, err.message);
    return { status: "error", error: err.message };
  }
}

/**
 * Send notifications to multiple users.
 */
async function notifyMany(userIds, type, data) {
  const results = [];
  for (const userId of userIds) {
    const result = await notify(userId, type, data);
    results.push({ userId, ...result });
  }
  return results;
}

module.exports = { notify, notifyMany };
