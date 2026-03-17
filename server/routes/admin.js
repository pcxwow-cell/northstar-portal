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

// ─── DOCUMENT MANAGEMENT ───
router.get("/documents", async (req, res, next) => {
  try {
    const { projectId, category, search } = req.query;
    const where = {};
    if (projectId) where.projectId = parseInt(projectId);
    if (category) where.category = category;
    if (search) where.name = { contains: search };

    const docs = await prisma.document.findMany({
      where,
      include: {
        project: { select: { name: true } },
        assignments: { include: { user: { select: { id: true, name: true } } } },
      },
      orderBy: { id: "desc" },
    });

    // For project-scoped docs, count investors in that project
    const projectInvestorCounts = {};
    for (const d of docs) {
      if (d.projectId && !projectInvestorCounts[d.projectId]) {
        projectInvestorCounts[d.projectId] = await prisma.investorProject.count({ where: { projectId: d.projectId } });
      }
    }

    res.json(docs.map(d => {
      const totalInvestors = d.projectId ? (projectInvestorCounts[d.projectId] || 0) : (d.assignments.length || 0);
      const viewed = d.assignments.filter(a => a.viewedAt).length;
      const downloaded = d.assignments.filter(a => a.downloadedAt).length;
      return {
        id: d.id, name: d.name, category: d.category, date: d.date, size: d.size,
        status: d.status, project: d.project?.name || "General", projectId: d.projectId,
        storageKey: d.storageKey,
        totalInvestors, viewed, downloaded,
        assignments: d.assignments.map(a => ({
          userId: a.user.id, userName: a.user.name,
          viewedAt: a.viewedAt, downloadedAt: a.downloadedAt, acknowledgedAt: a.acknowledgedAt,
        })),
      };
    }));
  } catch (err) { next(err); }
});

// Document detail with full access audit
router.get("/documents/:id", async (req, res, next) => {
  try {
    const doc = await prisma.document.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        project: { select: { id: true, name: true } },
        assignments: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    });
    if (!doc) return res.status(404).json({ error: "Document not found" });

    // If project-scoped, also show all investors in the project
    let projectInvestors = [];
    if (doc.projectId) {
      const ips = await prisma.investorProject.findMany({
        where: { projectId: doc.projectId },
        include: { user: { select: { id: true, name: true, email: true } } },
      });
      projectInvestors = ips.map(ip => {
        const assignment = doc.assignments.find(a => a.userId === ip.userId);
        return {
          id: ip.user.id, name: ip.user.name, email: ip.user.email,
          hasAccess: true,
          viewedAt: assignment?.viewedAt || null,
          downloadedAt: assignment?.downloadedAt || null,
          acknowledgedAt: assignment?.acknowledgedAt || null,
        };
      });
    }

    // Individually assigned investors (not via project)
    const directAssignments = doc.assignments
      .filter(a => !projectInvestors.some(pi => pi.id === a.userId))
      .map(a => ({
        id: a.user.id, name: a.user.name, email: a.user.email,
        hasAccess: true, directAssignment: true,
        viewedAt: a.viewedAt, downloadedAt: a.downloadedAt, acknowledgedAt: a.acknowledgedAt,
      }));

    res.json({
      id: doc.id, name: doc.name, category: doc.category, date: doc.date, size: doc.size,
      status: doc.status, file: doc.file, storageKey: doc.storageKey,
      project: doc.project ? { id: doc.project.id, name: doc.project.name } : null,
      accessList: [...projectInvestors, ...directAssignments],
    });
  } catch (err) { next(err); }
});

// ─── INVESTOR PROFILE (single investor detail) ───
router.get("/investors/:id/profile", async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        investorProjects: { include: { project: { select: { id: true, name: true, status: true } } } },
        documentAssignments: { include: { document: { select: { id: true, name: true, category: true, date: true, status: true } } } },
        groupMemberships: { include: { group: { select: { id: true, name: true, color: true } } } },
        threadRecipients: {
          include: { thread: { select: { id: true, subject: true, updatedAt: true, targetType: true } } },
          orderBy: { thread: { updatedAt: "desc" } },
          take: 10,
        },
      },
    });
    if (!user) return res.status(404).json({ error: "Investor not found" });

    // Also get project-scoped docs this investor can see
    const projectIds = user.investorProjects.map(ip => ip.projectId);
    const projectDocs = await prisma.document.findMany({
      where: { projectId: { in: projectIds } },
      select: { id: true, name: true, category: true, date: true, status: true, projectId: true },
    });
    const generalDocs = await prisma.document.findMany({
      where: { projectId: null },
      select: { id: true, name: true, category: true, date: true, status: true },
    });

    res.json({
      id: user.id, name: user.name, email: user.email, initials: user.initials,
      role: user.role, status: user.status, joined: user.joined,
      projects: user.investorProjects.map(ip => ({
        projectId: ip.projectId, projectName: ip.project.name, projectStatus: ip.project.status,
        committed: ip.committed, called: ip.called, currentValue: ip.currentValue, irr: ip.irr, moic: ip.moic,
      })),
      groups: user.groupMemberships.map(gm => ({ id: gm.group.id, name: gm.group.name, color: gm.group.color })),
      documents: {
        assigned: user.documentAssignments.map(da => da.document),
        projectDocs,
        generalDocs,
      },
      recentThreads: user.threadRecipients.map(tr => ({
        id: tr.thread.id, subject: tr.thread.subject, updatedAt: tr.thread.updatedAt, targetType: tr.thread.targetType, unread: tr.unread,
      })),
    });
  } catch (err) { next(err); }
});

// ─── INVESTOR GROUPS CRUD ───
router.get("/groups", async (req, res, next) => {
  try {
    const groups = await prisma.investorGroup.findMany({
      include: { _count: { select: { members: true } } },
      orderBy: { name: "asc" },
    });
    res.json(groups.map(g => ({ id: g.id, name: g.name, description: g.description, color: g.color, memberCount: g._count.members })));
  } catch (err) { next(err); }
});

router.post("/groups", async (req, res, next) => {
  try {
    const { name, description, color } = req.body;
    if (!name) return res.status(400).json({ error: "Group name is required" });
    const group = await prisma.investorGroup.create({ data: { name, description, color } });
    res.status(201).json({ id: group.id, name: group.name, description: group.description, color: group.color, memberCount: 0 });
  } catch (err) { next(err); }
});

router.put("/groups/:id", async (req, res, next) => {
  try {
    const { name, description, color } = req.body;
    const group = await prisma.investorGroup.update({
      where: { id: parseInt(req.params.id) },
      data: { ...(name !== undefined && { name }), ...(description !== undefined && { description }), ...(color !== undefined && { color }) },
    });
    res.json(group);
  } catch (err) { next(err); }
});

router.delete("/groups/:id", async (req, res, next) => {
  try {
    await prisma.investorGroup.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// Add/remove members from a group
router.post("/groups/:id/members", async (req, res, next) => {
  try {
    const { userIds } = req.body;
    if (!userIds?.length) return res.status(400).json({ error: "userIds required" });
    const groupId = parseInt(req.params.id);
    await prisma.groupMember.createMany({
      data: userIds.map(uid => ({ groupId, userId: parseInt(uid) })),
      skipDuplicates: true,
    });
    res.json({ ok: true, added: userIds.length });
  } catch (err) { next(err); }
});

router.delete("/groups/:id/members/:userId", async (req, res, next) => {
  try {
    await prisma.groupMember.deleteMany({
      where: { groupId: parseInt(req.params.id), userId: parseInt(req.params.userId) },
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// Get group with full member list
router.get("/groups/:id", async (req, res, next) => {
  try {
    const group = await prisma.investorGroup.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { members: { include: { user: { select: { id: true, name: true, email: true, status: true } } } } },
    });
    if (!group) return res.status(404).json({ error: "Group not found" });
    res.json({
      id: group.id, name: group.name, description: group.description, color: group.color,
      members: group.members.map(m => ({ id: m.user.id, name: m.user.name, email: m.user.email, status: m.user.status })),
    });
  } catch (err) { next(err); }
});

// ─── STAFF MANAGEMENT ───
router.get("/staff", async (req, res, next) => {
  try {
    const staff = await prisma.user.findMany({
      where: { role: { in: ["ADMIN", "GP"] } },
      orderBy: { name: "asc" },
    });
    res.json(staff.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, status: u.status, joined: u.joined })));
  } catch (err) { next(err); }
});

router.post("/staff", async (req, res, next) => {
  try {
    const { name, email, role } = req.body;
    if (!name || !email || !role) return res.status(400).json({ error: "Name, email, and role required" });
    if (!["ADMIN", "GP"].includes(role)) return res.status(400).json({ error: "Role must be ADMIN or GP" });
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: "Email already registered" });
    const tempPassword = crypto.randomBytes(6).toString("hex");
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    const joined = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const user = await prisma.user.create({
      data: { email, name, initials: name.split(" ").map(n => n[0]).join("").toUpperCase(), passwordHash, role, status: "ACTIVE", joined },
    });
    res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role, tempPassword });
  } catch (err) { next(err); }
});

router.put("/staff/:id", async (req, res, next) => {
  try {
    const { name, email, role, status } = req.body;
    const user = await prisma.user.update({
      where: { id: parseInt(req.params.id) },
      data: { ...(name !== undefined && { name }), ...(email !== undefined && { email }), ...(role !== undefined && { role }), ...(status !== undefined && { status }) },
    });
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role, status: user.status });
  } catch (err) { next(err); }
});

module.exports = router;
