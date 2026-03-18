const express = require("express");
const router = express.Router();
const prisma = require("../prisma");
const { authenticate, requireRole } = require("../middleware/auth");
const audit = require("../services/audit");

// ─── POST /api/v1/prospects — PUBLIC (no auth) ───
// Create a new prospect lead
router.post("/", async (req, res) => {
  try {
    const { name, email, phone, entityType, accreditationStatus, investmentRange, interestedProjectId, message } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: "Name and email are required" });
    }

    const prospect = await prisma.prospect.create({
      data: {
        name,
        email,
        phone: phone || null,
        entityType: entityType || null,
        accreditationStatus: accreditationStatus || null,
        investmentRange: investmentRange || null,
        interestedProjectId: interestedProjectId ? parseInt(interestedProjectId) : null,
        message: message || null,
        status: "new",
      },
      include: { interestedProject: { select: { id: true, name: true } } },
    });

    // Send admin notification (log it — in production, integrate email service)
    try {
      const admins = await prisma.user.findMany({ where: { role: "ADMIN", status: "ACTIVE" } });
      for (const admin of admins) {
        await prisma.notificationLog.create({
          data: {
            userId: admin.id,
            type: "new_prospect",
            subject: `New Prospect: ${name} (${investmentRange || "range not specified"})`,
            channel: "email",
            status: "sent",
            metadata: JSON.stringify({
              prospectName: name,
              prospectEmail: email,
              investmentRange,
              interestedProject: prospect.interestedProject?.name || null,
            }),
          },
        });
      }
    } catch (notifErr) {
      console.error("Failed to create admin notification:", notifErr.message);
      // Don't fail the prospect creation if notification fails
    }

    audit.log(req, "prospect_submit", `prospect:${prospect.id}`, { name, email, investmentRange: investmentRange || null });

    res.status(201).json(prospect);
  } catch (err) {
    console.error("Create prospect error:", err);
    res.status(500).json({ error: "Failed to submit interest" });
  }
});

// ─── All routes below require ADMIN auth ───

// GET /api/v1/prospects/stats — admin stats
router.get("/stats", authenticate, requireRole("ADMIN", "GP"), async (req, res) => {
  try {
    const [newCount, contactedCount, qualifiedCount, convertedCount, declinedCount, total] = await Promise.all([
      prisma.prospect.count({ where: { status: "new" } }),
      prisma.prospect.count({ where: { status: "contacted" } }),
      prisma.prospect.count({ where: { status: "qualified" } }),
      prisma.prospect.count({ where: { status: "converted" } }),
      prisma.prospect.count({ where: { status: "declined" } }),
      prisma.prospect.count(),
    ]);
    res.json({ new: newCount, contacted: contactedCount, qualified: qualifiedCount, converted: convertedCount, declined: declinedCount, total });
  } catch (err) {
    console.error("Prospect stats error:", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// GET /api/v1/prospects — admin list
router.get("/", authenticate, requireRole("ADMIN", "GP"), async (req, res) => {
  try {
    const { status, from, to } = req.query;
    const where = {};
    if (status && status !== "all") where.status = status;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const prospects = await prisma.prospect.findMany({
      where,
      include: { interestedProject: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(prospects);
  } catch (err) {
    console.error("List prospects error:", err);
    res.status(500).json({ error: "Failed to fetch prospects" });
  }
});

// PUT /api/v1/prospects/:id — admin update status
router.put("/:id", authenticate, requireRole("ADMIN", "GP"), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["new", "contacted", "qualified", "converted", "declined"];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const prospect = await prisma.prospect.update({
      where: { id: parseInt(id) },
      data: { status },
      include: { interestedProject: { select: { id: true, name: true } } },
    });
    res.json(prospect);
  } catch (err) {
    console.error("Update prospect error:", err);
    res.status(500).json({ error: "Failed to update prospect" });
  }
});

module.exports = router;
