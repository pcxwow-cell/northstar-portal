const { Router } = require("express");
const multer = require("multer");
const path = require("path");
const prisma = require("../prisma");
const storage = require("../storage");
const { requireRole } = require("../middleware/auth");
const router = Router();

// Multer config — store in memory, then pass to storage adapter
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB max

// GET /api/v1/documents?investorId=1&category=Tax&projectId=1
router.get("/", async (req, res, next) => {
  try {
    const { investorId, category, projectId } = req.query;
    const where = {};

    // If investorId provided, scope to investor's projects + general docs + directly assigned docs
    if (investorId) {
      const uid = parseInt(investorId);
      const investorProjects = await prisma.investorProject.findMany({
        where: { userId: uid },
        select: { projectId: true },
      });
      const projectIds = investorProjects.map((ip) => ip.projectId);
      where.OR = [
        { projectId: { in: projectIds } },
        { projectId: null }, // general docs
        { assignments: { some: { userId: uid } } }, // directly assigned docs
      ];
    }

    if (category) where.category = category;
    if (projectId) where.projectId = parseInt(projectId);

    const docs = await prisma.document.findMany({
      where,
      include: { project: { select: { name: true } } },
      orderBy: { id: "desc" },
    });

    res.json(
      docs.map((d) => ({
        id: d.id,
        name: d.name,
        category: d.category,
        date: d.date,
        size: d.size,
        status: d.status,
        file: d.file,
        storageKey: d.storageKey,
        project: d.project ? d.project.name : "General",
      }))
    );
  } catch (err) { next(err); }
});

// GET /api/v1/documents/:id/download — secure download with access check
router.get("/:id/download", async (req, res, next) => {
  try {
    const doc = await prisma.document.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { project: true },
    });
    if (!doc) return res.status(404).json({ error: "Document not found" });

    // Access check: investor can only download docs for their projects or general docs
    if (req.user.role === "INVESTOR" && doc.projectId) {
      const hasAccess = await prisma.investorProject.findFirst({
        where: { userId: req.user.id, projectId: doc.projectId },
      });
      if (!hasAccess) return res.status(403).json({ error: "Access denied" });
    }

    // Track download in DocumentAssignment
    if (req.user.role === "INVESTOR") {
      await prisma.documentAssignment.upsert({
        where: { documentId_userId: { documentId: doc.id, userId: req.user.id } },
        create: { documentId: doc.id, userId: req.user.id, downloadedAt: new Date(), viewedAt: new Date() },
        update: { downloadedAt: new Date(), ...(!doc.viewedAt ? { viewedAt: new Date() } : {}) },
      });
    }

    // If doc has a storage key, serve from storage adapter
    if (doc.storageKey) {
      const stream = await storage.getStream(doc.storageKey);
      if (!stream) return res.status(404).json({ error: "File not found in storage" });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${path.basename(doc.storageKey)}"`);
      stream.pipe(res);
    } else {
      // No storage key — file hasn't been uploaded yet (seed data placeholder)
      res.status(404).json({ error: "File not yet uploaded. This document is a placeholder." });
    }
  } catch (err) { next(err); }
});

// POST /api/v1/documents/upload — admin uploads a document
router.post("/upload", requireRole("ADMIN", "GP"), upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file provided" });

    const { name, category, projectId, status } = req.body;
    if (!name || !category) return res.status(400).json({ error: "Name and category are required" });

    // Generate storage key: documents/<projectId or general>/<timestamp>-<filename>
    const prefix = projectId ? `project-${projectId}` : "general";
    const timestamp = Date.now();
    const ext = path.extname(req.file.originalname) || ".pdf";
    const storageKey = `documents/${prefix}/${timestamp}-${req.file.originalname}`;

    // Upload to storage (local disk or S3)
    await storage.upload(storageKey, req.file.buffer, req.file.mimetype);

    // Format file size
    const bytes = req.file.size;
    const size = bytes >= 1024 * 1024
      ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.round(bytes / 1024)} KB`;

    // Format date
    const now = new Date();
    const date = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

    // Save to database
    const doc = await prisma.document.create({
      data: {
        name,
        category,
        ...(projectId ? { project: { connect: { id: parseInt(projectId) } } } : {}),
        status: status || "published",
        date,
        size,
        file: `/uploads/${storageKey}`,
        storageKey,
      },
    });

    res.status(201).json({
      id: doc.id,
      name: doc.name,
      category: doc.category,
      date: doc.date,
      size: doc.size,
      status: doc.status,
      storageKey: doc.storageKey,
    });
  } catch (err) { next(err); }
});

module.exports = router;
