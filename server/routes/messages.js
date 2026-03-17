const { Router } = require("express");
const prisma = require("../prisma");
const router = Router();

// GET /api/v1/messages — filtered by targeting for the authenticated user
router.get("/", async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get investor's project IDs for project-targeted messages
    const investorProjects = await prisma.investorProject.findMany({
      where: { userId },
      select: { projectId: true },
    });
    const projectIds = investorProjects.map(ip => ip.projectId);

    // Fetch messages that target this user:
    // 1. ALL messages (targetType = ALL)
    // 2. PROJECT messages where user is in that project
    // 3. INDIVIDUAL messages where user is a recipient
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { targetType: "ALL" },
          { targetType: "PROJECT", targetProjectId: { in: projectIds } },
          { targetType: "INDIVIDUAL", recipients: { some: { userId } } },
        ],
      },
      orderBy: { id: "desc" },
    });

    res.json(
      messages.map((m) => ({
        id: m.id,
        from: m.fromName,
        role: m.role,
        date: m.date,
        subject: m.subject,
        preview: m.preview,
        unread: m.unread,
      }))
    );
  } catch (err) { next(err); }
});

module.exports = router;
