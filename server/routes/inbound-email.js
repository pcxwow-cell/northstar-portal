// ─── INBOUND EMAIL WEBHOOK ─────────────────────────────
// Handles inbound email replies from SendGrid Inbound Parse,
// Mailgun, or Postmark. Adds the reply as a ThreadMessage.
//
// NO AUTH REQUIRED (webhook from email provider) — verified by reply-to token HMAC.
// Always returns 200 to prevent email provider retries.

const { Router } = require("express");
const prisma = require("../prisma");
const { parseReplyAddress } = require("../services/email/reply-address");
const { extractReplyBody, extractReplyFromHtml } = require("../services/email/body-parser");
const audit = require("../services/audit");

const router = Router();

/**
 * POST /api/v1/email/inbound
 * Webhook endpoint for inbound email replies.
 */
router.post("/", async (req, res) => {
  try {
    // Normalize payload across providers
    const { to, from, subject, text, html } = normalizePayload(req.body);

    if (!to || !from) {
      return res.status(400).json({ error: "Missing to or from" });
    }

    // Parse the reply-to address to get threadId and userId
    const parsed = parseReplyAddress(to);
    if (!parsed) {
      console.log(`[Inbound Email] Invalid reply address: ${to}`);
      return res.status(200).json({ ok: true, skipped: true, reason: "invalid reply address" });
    }

    const { threadId, userId } = parsed;

    // Verify thread exists
    const thread = await prisma.messageThread.findUnique({ where: { id: threadId } });
    if (!thread) {
      console.log(`[Inbound Email] Thread ${threadId} not found`);
      return res.status(200).json({ ok: true, skipped: true, reason: "thread not found" });
    }

    // Verify user exists and email matches
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      console.log(`[Inbound Email] User ${userId} not found`);
      return res.status(200).json({ ok: true, skipped: true, reason: "user not found" });
    }

    // Verify sender email matches (loose match — handle "Name <email>" format)
    const senderEmail = from.match(/<([^>]+)>/)?.[1] || from;
    if (senderEmail.toLowerCase() !== user.email.toLowerCase()) {
      console.log(`[Inbound Email] Email mismatch: expected ${user.email}, got ${senderEmail}`);
      return res.status(200).json({ ok: true, skipped: true, reason: "sender mismatch" });
    }

    // Extract clean reply body
    let body = text ? extractReplyBody(text) : extractReplyFromHtml(html);
    if (!body || body.trim().length === 0) {
      console.log(`[Inbound Email] Empty reply body`);
      return res.status(200).json({ ok: true, skipped: true, reason: "empty body" });
    }

    // Save as ThreadMessage
    const message = await prisma.threadMessage.create({
      data: {
        threadId,
        senderId: userId,
        body: body.trim(),
      },
    });

    // Update thread timestamp
    await prisma.messageThread.update({
      where: { id: threadId },
      data: { updatedAt: new Date() },
    });

    // Mark thread as unread for other recipients
    await prisma.threadRecipient.updateMany({
      where: { threadId, userId: { not: userId } },
      data: { unread: true },
    });

    // Notify other participants
    const recipients = await prisma.threadRecipient.findMany({
      where: { threadId, userId: { not: userId } },
      select: { userId: true },
    });

    const allNotifyIds = new Set(recipients.map((r) => r.userId));
    if (thread.creatorId !== userId) allNotifyIds.add(thread.creatorId);

    const { notify } = require("../services/notifications");
    for (const notifyUserId of allNotifyIds) {
      await notify(notifyUserId, "new_message", {
        senderName: user.name,
        messageSubject: thread.subject,
        threadId,
      }).catch((err) => console.error(`[Inbound Email] Notification error:`, err.message));
    }

    // Audit log
    await audit
      .log(
        { user: { id: userId }, ip: req.ip, headers: req.headers },
        "email_reply",
        `thread:${threadId}`,
        { messageId: message.id, via: "inbound_email" }
      )
      .catch(() => {});

    console.log(`[Inbound Email] Reply saved: thread=${threadId}, user=${user.name}, ${body.trim().length} chars`);
    res.status(200).json({ ok: true, messageId: message.id });
  } catch (err) {
    console.error("[Inbound Email] Error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/v1/email/inbound/test
 * Dev/admin endpoint to simulate an inbound email reply.
 * Uses authenticate middleware inline since the parent route is unauthenticated.
 */
const { authenticate } = require("../middleware/auth");

router.post("/test", authenticate, async (req, res) => {
  try {
    const { threadId, body: replyBody } = req.body;
    if (!threadId || !replyBody) {
      return res.status(400).json({ error: "threadId and body are required" });
    }

    // Only admins can use this test endpoint
    if (!req.user || (req.user.role !== "ADMIN" && req.user.role !== "GP")) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const thread = await prisma.messageThread.findUnique({ where: { id: parseInt(threadId) } });
    if (!thread) return res.status(404).json({ error: "Thread not found" });

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: "User not found" });

    // Generate the reply-to address for display
    const { generateReplyAddress } = require("../services/email/reply-address");
    const replyAddress = generateReplyAddress(thread.id, user.id);

    // Simulate inbound by creating the message directly
    const message = await prisma.threadMessage.create({
      data: {
        threadId: thread.id,
        senderId: user.id,
        body: replyBody.trim(),
      },
    });

    await prisma.messageThread.update({
      where: { id: thread.id },
      data: { updatedAt: new Date() },
    });

    await prisma.threadRecipient.updateMany({
      where: { threadId: thread.id, userId: { not: user.id } },
      data: { unread: true },
    });

    console.log(`[Inbound Email Test] Simulated reply: thread=${thread.id}, user=${user.name}`);
    res.status(200).json({
      ok: true,
      messageId: message.id,
      simulatedReplyAddress: replyAddress,
    });
  } catch (err) {
    console.error("[Inbound Email Test] Error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Normalize webhook payloads from different email providers.
 */
function normalizePayload(body) {
  if (!body) return {};

  // SendGrid Inbound Parse (multipart form data — fields are flat)
  if (body.envelope || body.charsets) {
    const envelope = typeof body.envelope === "string" ? JSON.parse(body.envelope) : body.envelope;
    return {
      to: envelope?.to?.[0] || body.to,
      from: body.from,
      subject: body.subject,
      text: body.text,
      html: body.html,
    };
  }

  // Mailgun
  if (body.recipient || body["body-plain"]) {
    return {
      to: body.recipient,
      from: body.sender || body.from,
      subject: body.subject,
      text: body["body-plain"] || body["stripped-text"],
      html: body["body-html"] || body["stripped-html"],
    };
  }

  // Postmark
  if (body.OriginalRecipient || body.TextBody) {
    return {
      to: body.OriginalRecipient || body.To,
      from: body.FromFull?.Email || body.From,
      subject: body.Subject,
      text: body.TextBody || body.StrippedTextReply,
      html: body.HtmlBody,
    };
  }

  // Generic / demo
  return {
    to: body.to,
    from: body.from,
    subject: body.subject,
    text: body.text || body.body,
    html: body.html,
  };
}

module.exports = router;
