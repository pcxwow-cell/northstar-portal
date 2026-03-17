const { Router } = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const prisma = require("../prisma");
const { requireRole } = require("../middleware/auth");
const router = Router();

// All admin routes require ADMIN or GP role
router.use(requireRole("ADMIN", "GP"));

// ─── DASHBOARD ───
router.get("/dashboard", async (req, res, next) => {
  try {
    const [projectCount, investorCount, docCount, msgCount, recentDocs] = await Promise.all([
      prisma.project.count(),
      prisma.user.count({ where: { role: "INVESTOR" } }),
      prisma.document.count(),
      prisma.message.count({ where: { unread: true } }),
      prisma.document.findMany({ orderBy: { id: "desc" }, take: 5, include: { project: { select: { name: true } } } }),
    ]);
    res.json({ projectCount, investorCount, docCount, unreadMessages: msgCount, recentDocs });
  } catch (err) { next(err); }
});

// ─── PROJECTS CRUD ───
router.get("/projects", async (req, res, next) => {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { id: "asc" },
      include: { _count: { select: { investorProjects: true, documents: true } } },
    });
    res.json(projects.map(p => ({
      id: p.id, name: p.name, location: p.location, status: p.status,
      completion: p.completionPct, totalRaise: p.totalRaise, units: p.units,
      type: p.type, sqft: p.sqft, description: p.description,
      investorCount: p._count.investorProjects, docCount: p._count.documents,
    })));
  } catch (err) { next(err); }
});

router.put("/projects/:id", async (req, res, next) => {
  try {
    const { name, location, type, status, description, sqft, units, completionPct, totalRaise } = req.body;
    const project = await prisma.project.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...(name !== undefined && { name }),
        ...(location !== undefined && { location }),
        ...(type !== undefined && { type }),
        ...(status !== undefined && { status }),
        ...(description !== undefined && { description }),
        ...(sqft !== undefined && { sqft }),
        ...(units !== undefined && { units }),
        ...(completionPct !== undefined && { completionPct }),
        ...(totalRaise !== undefined && { totalRaise }),
      },
    });
    res.json({ id: project.id, name: project.name, status: project.status, completion: project.completionPct });
  } catch (err) { next(err); }
});

// ─── CONSTRUCTION UPDATES ───
router.post("/projects/:id/updates", async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Update text is required" });
    const date = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const update = await prisma.projectUpdate.create({
      data: { project: { connect: { id: parseInt(req.params.id) } }, date, text },
    });
    res.status(201).json(update);
  } catch (err) { next(err); }
});

// ─── INVESTOR KPI / RETURNS EDITING ───
router.put("/investors/:userId/projects/:projectId", async (req, res, next) => {
  try {
    const { committed, called, currentValue, irr, moic } = req.body;
    const updated = await prisma.investorProject.update({
      where: {
        userId_projectId: {
          userId: parseInt(req.params.userId),
          projectId: parseInt(req.params.projectId),
        },
      },
      data: {
        ...(committed !== undefined && { committed }),
        ...(called !== undefined && { called }),
        ...(currentValue !== undefined && { currentValue }),
        ...(irr !== undefined && { irr }),
        ...(moic !== undefined && { moic }),
      },
    });
    res.json(updated);
  } catch (err) { next(err); }
});

// ─── INVESTORS (with search, filter, sort) ───
router.get("/investors", async (req, res, next) => {
  try {
    const { search, status, projectId, sortBy, sortDir } = req.query;

    const where = { role: "INVESTOR" };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    // Build orderBy
    const orderBy = {};
    if (sortBy === "name") orderBy.name = sortDir === "desc" ? "desc" : "asc";
    else if (sortBy === "email") orderBy.email = sortDir === "desc" ? "desc" : "asc";
    else if (sortBy === "joined") orderBy.createdAt = sortDir === "desc" ? "desc" : "asc";
    else orderBy.id = "asc";

    const investors = await prisma.user.findMany({
      where,
      orderBy,
      include: {
        investorProjects: {
          include: { project: { select: { id: true, name: true } } },
        },
      },
    });

    let results = investors.map(u => ({
      id: u.id, name: u.name, email: u.email, initials: u.initials,
      status: u.status, joined: u.joined,
      totalCommitted: u.investorProjects.reduce((s, ip) => s + ip.committed, 0),
      totalValue: u.investorProjects.reduce((s, ip) => s + ip.currentValue, 0),
      projects: u.investorProjects.map(ip => ({
        projectId: ip.projectId, projectName: ip.project.name,
        committed: ip.committed, called: ip.called,
        currentValue: ip.currentValue, irr: ip.irr, moic: ip.moic,
      })),
    }));

    // Filter by project
    if (projectId) {
      const pid = parseInt(projectId);
      results = results.filter(r => r.projects.some(p => p.projectId === pid));
    }

    res.json(results);
  } catch (err) { next(err); }
});

// ─── TARGETED MESSAGES ───
router.post("/messages", async (req, res, next) => {
  try {
    const { fromName, role, subject, preview, targetType, targetProjectId, recipientIds } = req.body;
    if (!subject || !preview) return res.status(400).json({ error: "Subject and message are required" });
    const date = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

    const messageData = {
      sender: { connect: { id: req.user.id } },
      fromName: fromName || req.user.name,
      role: role || "Northstar Admin",
      date, subject, preview, unread: true,
      targetType: targetType || "ALL",
    };

    // Project targeting
    if (targetType === "PROJECT" && targetProjectId) {
      messageData.targetProject = { connect: { id: parseInt(targetProjectId) } };
    }

    const message = await prisma.message.create({ data: messageData });

    // Individual targeting — create recipient records
    if (targetType === "INDIVIDUAL" && recipientIds && recipientIds.length > 0) {
      await prisma.messageRecipient.createMany({
        data: recipientIds.map(uid => ({ messageId: message.id, userId: parseInt(uid) })),
      });
    }

    res.status(201).json({ id: message.id, from: message.fromName, subject: message.subject, date: message.date, targetType: message.targetType });
  } catch (err) { next(err); }
});

// ─── DOCUMENT ASSIGNMENT ───
router.post("/documents/:id/assign", async (req, res, next) => {
  try {
    const { userIds } = req.body;
    if (!userIds || !userIds.length) return res.status(400).json({ error: "At least one user ID required" });
    const docId = parseInt(req.params.id);

    // Clear existing assignments and set new ones
    await prisma.documentAssignment.deleteMany({ where: { documentId: docId } });
    await prisma.documentAssignment.createMany({
      data: userIds.map(uid => ({ documentId: docId, userId: parseInt(uid) })),
    });
    res.json({ documentId: docId, assignedTo: userIds.length });
  } catch (err) { next(err); }
});

// ─── USER MANAGEMENT ───

// POST /admin/investors/invite — create a new investor with temporary password
router.post("/investors/invite", async (req, res, next) => {
  try {
    const { name, email, initials } = req.body;
    if (!name || !email) return res.status(400).json({ error: "Name and email are required" });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: "Email already registered" });

    // Generate a temporary password
    const tempPassword = crypto.randomBytes(6).toString("hex"); // 12 char random
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    const joined = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

    const user = await prisma.user.create({
      data: {
        email, name,
        initials: initials || name.split(" ").map(n => n[0]).join("").toUpperCase(),
        passwordHash,
        role: "INVESTOR",
        status: "PENDING", // Needs admin approval or first login
        joined,
      },
    });

    res.status(201).json({
      id: user.id, name: user.name, email: user.email, status: user.status,
      tempPassword, // In production, send this via email instead of returning it
    });
  } catch (err) { next(err); }
});

// PUT /admin/investors/:id — edit investor profile
router.put("/investors/:id", async (req, res, next) => {
  try {
    const { name, email, initials, status } = req.body;
    const user = await prisma.user.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(initials !== undefined && { initials }),
        ...(status !== undefined && { status }),
      },
    });
    res.json({ id: user.id, name: user.name, email: user.email, status: user.status, initials: user.initials });
  } catch (err) { next(err); }
});

// POST /admin/investors/:id/approve — approve a pending investor
router.post("/investors/:id/approve", async (req, res, next) => {
  try {
    const user = await prisma.user.update({
      where: { id: parseInt(req.params.id) },
      data: { status: "ACTIVE" },
    });
    res.json({ id: user.id, name: user.name, status: user.status });
  } catch (err) { next(err); }
});

// POST /admin/investors/:id/deactivate — soft-delete / deactivate an investor
router.post("/investors/:id/deactivate", async (req, res, next) => {
  try {
    const user = await prisma.user.update({
      where: { id: parseInt(req.params.id) },
      data: { status: "INACTIVE" },
    });
    res.json({ id: user.id, name: user.name, status: user.status });
  } catch (err) { next(err); }
});

// POST /admin/investors/:id/reset-password — generate new temporary password
router.post("/investors/:id/reset-password", async (req, res, next) => {
  try {
    const tempPassword = crypto.randomBytes(6).toString("hex");
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    await prisma.user.update({
      where: { id: parseInt(req.params.id) },
      data: { passwordHash },
    });
    res.json({ tempPassword }); // In production, send via email
  } catch (err) { next(err); }
});

// POST /admin/investors/:id/assign-project — assign investor to a project
router.post("/investors/:id/assign-project", async (req, res, next) => {
  try {
    const { projectId, committed, called, currentValue, irr, moic } = req.body;
    if (!projectId) return res.status(400).json({ error: "projectId is required" });
    const ip = await prisma.investorProject.create({
      data: {
        user: { connect: { id: parseInt(req.params.id) } },
        project: { connect: { id: parseInt(projectId) } },
        committed: committed || 0,
        called: called || 0,
        currentValue: currentValue || 0,
        irr: irr || null,
        moic: moic || null,
      },
    });
    res.status(201).json(ip);
  } catch (err) { next(err); }
});

module.exports = router;
