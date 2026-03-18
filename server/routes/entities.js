const { Router } = require("express");
const prisma = require("../prisma");
const { requireRole } = require("../middleware/auth");
const audit = require("../services/audit");
const router = Router();

// ─── GET /investors/:id/entities — list investor's entities ───
router.get("/investors/:id/entities", async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    // Investors can only see their own entities; admins can see any
    if (req.user.role === "INVESTOR" && req.user.id !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const entities = await prisma.investorEntity.findMany({
      where: { userId },
      include: { _count: { select: { investments: true } } },
      orderBy: { isDefault: "desc" },
    });
    res.json(entities.map(e => ({
      id: e.id, name: e.name, type: e.type, taxId: e.taxId, address: e.address,
      state: e.state, isDefault: e.isDefault, investmentCount: e._count.investments,
      createdAt: e.createdAt,
    })));
  } catch (err) { next(err); }
});

// ─── POST /investors/:id/entities — create entity for investor ───
router.post("/investors/:id/entities", async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    if (req.user.role === "INVESTOR" && req.user.id !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const { name, type, taxId, address, state, isDefault } = req.body;
    if (!name || !type) return res.status(400).json({ error: "Name and type are required" });

    // If setting as default, unset all others
    if (isDefault) {
      await prisma.investorEntity.updateMany({ where: { userId }, data: { isDefault: false } });
    }

    const entity = await prisma.investorEntity.create({
      data: { userId, name, type, taxId: taxId || null, address: address || null, state: state || null, isDefault: !!isDefault },
    });
    audit.log(req, "entity_create", `entity:${entity.id}`, { name, userId });
    res.status(201).json(entity);
  } catch (err) { next(err); }
});

// ─── PUT /entities/:id — update entity ───
router.put("/entities/:id", async (req, res, next) => {
  try {
    const entityId = parseInt(req.params.id);
    const existing = await prisma.investorEntity.findUnique({ where: { id: entityId } });
    if (!existing) return res.status(404).json({ error: "Entity not found" });
    if (req.user.role === "INVESTOR" && req.user.id !== existing.userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { name, type, taxId, address, state, isDefault } = req.body;

    // If setting as default, unset all others
    if (isDefault) {
      await prisma.investorEntity.updateMany({ where: { userId: existing.userId }, data: { isDefault: false } });
    }

    const entity = await prisma.investorEntity.update({
      where: { id: entityId },
      data: {
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type }),
        ...(taxId !== undefined && { taxId }),
        ...(address !== undefined && { address }),
        ...(state !== undefined && { state }),
        ...(isDefault !== undefined && { isDefault }),
      },
    });
    res.json(entity);
  } catch (err) { next(err); }
});

// ─── DELETE /entities/:id — delete entity (only if no investments linked) ───
router.delete("/entities/:id", async (req, res, next) => {
  try {
    const entityId = parseInt(req.params.id);
    const existing = await prisma.investorEntity.findUnique({
      where: { id: entityId },
      include: { _count: { select: { investments: true } } },
    });
    if (!existing) return res.status(404).json({ error: "Entity not found" });
    if (req.user.role === "INVESTOR" && req.user.id !== existing.userId) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (existing._count.investments > 0) {
      return res.status(400).json({ error: "Cannot delete entity with linked investments" });
    }
    await prisma.investorEntity.delete({ where: { id: entityId } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
