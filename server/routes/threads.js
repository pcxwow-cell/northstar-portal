const { Router } = require("express");
const prisma = require("../prisma");
const { notifyMany } = require("../services/notifications");
const { validate, createThreadSchema, replyThreadSchema } = require("../middleware/validate");
const router = Router();

const threadIncludes = {
  messages: { include: { sender: { select: { id: true, name: true, initials: true, role: true } } }, orderBy: { createdAt: "asc" } },
  recipients: { include: { user: { select: { id: true, name: true, initials: true } } } },
  creator: { select: { id: true, name: true, initials: true, role: true } },
  targetProject: { select: { id: true, name: true } },
};

function formatThread(t, userId) {
  const lastMsg = t.messages[t.messages.length - 1];
  const recipient = t.recipients.find(r => r.userId === userId);
  return {
    id: t.id, subject: t.subject,
    targetType: t.targetType,
    project: t.targetProject?.name || null,
    creator: t.creator,
    lastMessage: lastMsg ? { body: lastMsg.body, sender: lastMsg.sender, date: lastMsg.createdAt } : null,
    messageCount: t.messages.length,
    unread: recipient ? recipient.unread : false,
    createdAt: t.createdAt, updatedAt: t.updatedAt,
  };
}

function formatThreadDetail(t, userId) {
  return {
    id: t.id, subject: t.subject,
    targetType: t.targetType,
    project: t.targetProject?.name || null,
    creator: t.creator,
    messages: t.messages.map(m => ({
      id: m.id, body: m.body, createdAt: m.createdAt,
      sender: m.sender,
    })),
    readReceipts: t.recipients.map(r => ({
      userId: r.userId,
      name: r.user?.name || "Unknown",
      initials: r.user?.initials || "?",
      unread: r.unread,
      readAt: r.readAt,
    })),
    createdAt: t.createdAt,
  };
}

// GET /api/v1/threads — list threads visible to this user
router.get("/", async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let where;
    if (userRole === "ADMIN" || userRole === "GP") {
      // Admin/GP sees all threads + threads targeted to STAFF
      where = {};
    } else {
      // Investor sees threads targeted to them
      const investorProjects = await prisma.investorProject.findMany({
        where: { userId }, select: { projectId: true },
      });
      const projectIds = investorProjects.map(ip => ip.projectId);
      where = {
        OR: [
          { targetType: "ALL" },
          { targetType: "PROJECT", targetProjectId: { in: projectIds } },
          { targetType: "INDIVIDUAL", recipients: { some: { userId } } },
          { targetType: "STAFF", creatorId: userId }, // investor's own messages to staff
        ],
      };
    }

    const threads = await prisma.messageThread.findMany({
      where, include: threadIncludes, orderBy: { updatedAt: "desc" },
    });

    res.json(threads.map(t => formatThread(t, userId)));
  } catch (err) { next(err); }
});

// Check if user has access to a thread
async function canAccessThread(thread, userId, userRole) {
  // Admin/GP can access all threads
  if (userRole === "ADMIN" || userRole === "GP") return true;
  // Creator can always access
  if (thread.creatorId === userId) return true;
  // Check if user is a recipient
  const recipient = await prisma.threadRecipient.findUnique({
    where: { threadId_userId: { threadId: thread.id, userId } },
  });
  if (recipient) return true;
  // Check targetType-based access
  if (thread.targetType === "ALL") return true;
  if (thread.targetType === "PROJECT" && thread.targetProjectId) {
    const hasProject = await prisma.investorProject.findFirst({
      where: { userId, projectId: thread.targetProjectId },
    });
    if (hasProject) return true;
  }
  return false;
}

// GET /api/v1/threads/:id — thread detail with all messages
router.get("/:id", async (req, res, next) => {
  try {
    const thread = await prisma.messageThread.findUnique({
      where: { id: parseInt(req.params.id) },
      include: threadIncludes,
    });
    if (!thread) return res.status(404).json({ error: "Thread not found" });

    // Access control: verify user can see this thread
    if (!(await canAccessThread(thread, req.user.id, req.user.role))) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Mark as read for this user + record read timestamp
    await prisma.threadRecipient.updateMany({
      where: { threadId: thread.id, userId: req.user.id, unread: true },
      data: { unread: false, readAt: new Date() },
    });

    res.json(formatThreadDetail(thread, req.user.id));
  } catch (err) { next(err); }
});

// POST /api/v1/threads — create a new thread
router.post("/", validate(createThreadSchema), async (req, res, next) => {
  try {
    const { subject, body, targetType, targetProjectId, recipientIds } = req.body;

    const userId = req.user.id;
    const userRole = req.user.role;

    // Investors can ONLY message staff
    const effectiveTargetType = (userRole === "INVESTOR") ? "STAFF" : (targetType || "ALL");

    const threadData = {
      subject,
      creator: { connect: { id: userId } },
      targetType: effectiveTargetType,
      messages: { create: { sender: { connect: { id: userId } }, body } },
    };

    // Set project target
    if (effectiveTargetType === "PROJECT" && targetProjectId) {
      threadData.targetProject = { connect: { id: parseInt(targetProjectId) } };
    }

    const thread = await prisma.messageThread.create({ data: threadData, include: threadIncludes });

    // Create recipient records for targeting
    const recipientUserIds = [];

    if (effectiveTargetType === "STAFF") {
      // All admin/GP users are recipients
      const staff = await prisma.user.findMany({ where: { role: { in: ["ADMIN", "GP"] } }, select: { id: true } });
      recipientUserIds.push(...staff.map(u => u.id));
    } else if (effectiveTargetType === "INDIVIDUAL" && recipientIds?.length) {
      recipientUserIds.push(...recipientIds.map(id => parseInt(id)));
    } else if (effectiveTargetType === "PROJECT" && targetProjectId) {
      const projectInvestors = await prisma.investorProject.findMany({
        where: { projectId: parseInt(targetProjectId) }, select: { userId: true },
      });
      recipientUserIds.push(...projectInvestors.map(ip => ip.userId));
    } else if (effectiveTargetType === "ALL") {
      const allInvestors = await prisma.user.findMany({ where: { role: "INVESTOR", status: "ACTIVE" }, select: { id: true } });
      recipientUserIds.push(...allInvestors.map(u => u.id));
    }

    // Add recipients (excluding the creator)
    const uniqueRecipients = [...new Set(recipientUserIds)].filter(id => id !== userId);
    if (uniqueRecipients.length > 0) {
      await prisma.threadRecipient.createMany({
        data: uniqueRecipients.map(uid => ({ threadId: thread.id, userId: uid, unread: true })),
      });
    }
    // Creator is also a recipient but read
    await prisma.threadRecipient.create({ data: { threadId: thread.id, userId, unread: false } }).catch(() => {});

    res.status(201).json(formatThread(thread, userId));
  } catch (err) { next(err); }
});

// POST /api/v1/threads/:id/reply — add a message to a thread
router.post("/:id/reply", validate(replyThreadSchema), async (req, res, next) => {
  try {
    const { body } = req.body;

    const threadId = parseInt(req.params.id);
    const thread = await prisma.messageThread.findUnique({ where: { id: threadId } });
    if (!thread) return res.status(404).json({ error: "Thread not found" });

    // Access control: verify user can reply to this thread
    if (!(await canAccessThread(thread, req.user.id, req.user.role))) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Add the reply
    const msg = await prisma.threadMessage.create({
      data: { thread: { connect: { id: threadId } }, sender: { connect: { id: req.user.id } }, body },
      include: { sender: { select: { id: true, name: true, initials: true, role: true } } },
    });

    // Update thread timestamp
    await prisma.messageThread.update({ where: { id: threadId }, data: { updatedAt: new Date() } });

    // Mark all other recipients as unread
    await prisma.threadRecipient.updateMany({
      where: { threadId, userId: { not: req.user.id } },
      data: { unread: true },
    });

    // Ensure sender is a recipient (marked as read)
    await prisma.threadRecipient.upsert({
      where: { threadId_userId: { threadId, userId: req.user.id } },
      create: { threadId, userId: req.user.id, unread: false },
      update: { unread: false },
    });

    // Notify other recipients of new message
    try {
      const recipients = await prisma.threadRecipient.findMany({
        where: { threadId, userId: { not: req.user.id } },
        select: { userId: true },
      });
      const recipientIds = recipients.map(r => r.userId);
      if (recipientIds.length > 0) {
        notifyMany(recipientIds, "new_message", {
          senderName: req.user.name,
          messageSubject: thread.subject,
          messageBody: body,
          threadId,
        }).catch(err => console.error("Thread notification error:", err));
      }
    } catch (notifyErr) {
      console.error("Failed to send thread notifications:", notifyErr);
    }

    res.status(201).json({ id: msg.id, body: msg.body, sender: msg.sender, createdAt: msg.createdAt });
  } catch (err) { next(err); }
});

// POST /api/v1/threads/:id/read — mark thread as read
router.post("/:id/read", async (req, res, next) => {
  try {
    await prisma.threadRecipient.updateMany({
      where: { threadId: parseInt(req.params.id), userId: req.user.id },
      data: { unread: false },
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
