const { Router } = require("express");
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

// ─── INVESTORS ───
router.get("/investors", async (req, res, next) => {
  try {
    const investors = await prisma.user.findMany({
      where: { role: "INVESTOR" },
      include: { investorProjects: { include: { project: { select: { name: true } } } } },
    });
    res.json(investors.map(u => ({
      id: u.id, name: u.name, email: u.email, status: u.status, joined: u.joined,
      projects: u.investorProjects.map(ip => ({
        projectId: ip.projectId, projectName: ip.project.name,
        committed: ip.committed, called: ip.called, currentValue: ip.currentValue,
      })),
    })));
  } catch (err) { next(err); }
});

// ─── MESSAGES ───
router.post("/messages", async (req, res, next) => {
  try {
    const { fromName, role, subject, preview } = req.body;
    if (!subject || !preview) return res.status(400).json({ error: "Subject and message are required" });
    const date = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const message = await prisma.message.create({
      data: {
        sender: { connect: { id: req.user.id } },
        fromName: fromName || req.user.name,
        role: role || "Northstar Admin",
        date, subject, preview, unread: true,
      },
    });
    res.status(201).json({ id: message.id, from: message.fromName, subject: message.subject, date: message.date });
  } catch (err) { next(err); }
});

module.exports = router;
