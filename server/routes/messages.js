const { Router } = require("express");
const prisma = require("../prisma");
const router = Router();

// GET /api/v1/messages
router.get("/", async (req, res, next) => {
  try {
    const messages = await prisma.message.findMany({
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
