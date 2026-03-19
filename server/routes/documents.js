const { Router } = require("express");
const multer = require("multer");
const path = require("path");
const prisma = require("../prisma");
const storage = require("../storage");
const { requireRole } = require("../middleware/auth");
const { notifyMany } = require("../services/notifications");
const audit = require("../services/audit");
const { validate, uploadDocumentSchema } = require("../middleware/validate");
const router = Router();

// Multer config — store in memory, then pass to storage adapter
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB max

// GET /api/v1/documents?investorId=1&category=Tax&projectId=1
router.get("/", async (req, res, next) => {
  try {
    let { investorId, category, projectId } = req.query;
    const where = {};

    // IDOR protection: investors can only query their own documents
    if (req.user.role === "INVESTOR") {
      investorId = String(req.user.id); // force to own ID regardless of query param
    }

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
      // Check existing assignment to preserve viewedAt if already set
      const existing = await prisma.documentAssignment.findUnique({
        where: { documentId_userId: { documentId: doc.id, userId: req.user.id } },
      });
      await prisma.documentAssignment.upsert({
        where: { documentId_userId: { documentId: doc.id, userId: req.user.id } },
        create: { documentId: doc.id, userId: req.user.id, downloadedAt: new Date(), viewedAt: new Date() },
        update: { downloadedAt: new Date(), ...(existing && !existing.viewedAt ? { viewedAt: new Date() } : {}) },
      });
    }

    audit.log(req, "document_download", `document:${doc.id}`, { name: doc.name });

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

// GET /api/v1/documents/:id/preview — inline preview (Content-Disposition: inline)
router.get("/:id/preview", async (req, res, next) => {
  try {
    const doc = await prisma.document.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { project: true },
    });
    if (!doc) return res.status(404).json({ error: "Document not found" });

    // Access check: investor can only preview docs for their projects or general docs
    if (req.user.role === "INVESTOR" && doc.projectId) {
      const hasAccess = await prisma.investorProject.findFirst({
        where: { userId: req.user.id, projectId: doc.projectId },
      });
      const directAccess = await prisma.documentAssignment.findFirst({
        where: { documentId: doc.id, userId: req.user.id },
      });
      if (!hasAccess && !directAccess) return res.status(403).json({ error: "Access denied" });
    }

    // Track view in DocumentAssignment
    if (req.user.role === "INVESTOR") {
      await prisma.documentAssignment.upsert({
        where: { documentId_userId: { documentId: doc.id, userId: req.user.id } },
        create: { documentId: doc.id, userId: req.user.id, viewedAt: new Date() },
        update: { viewedAt: new Date() },
      });
    }

    if (doc.storageKey) {
      const stream = await storage.getStream(doc.storageKey);
      if (!stream) return res.status(404).json({ error: "File not found in storage" });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${path.basename(doc.storageKey)}"`);
      stream.pipe(res);
    } else {
      res.status(404).json({ error: "File not yet uploaded. This document is a placeholder." });
    }
  } catch (err) { next(err); }
});

// POST /api/v1/documents/:id/acknowledge — investor acknowledges a document
router.post("/:id/acknowledge", async (req, res, next) => {
  try {
    const docId = parseInt(req.params.id);
    const doc = await prisma.document.findUnique({ where: { id: docId } });
    if (!doc) return res.status(404).json({ error: "Document not found" });

    const assignment = await prisma.documentAssignment.upsert({
      where: { documentId_userId: { documentId: docId, userId: req.user.id } },
      create: { documentId: docId, userId: req.user.id, acknowledgedAt: new Date(), viewedAt: new Date() },
      update: { acknowledgedAt: new Date() },
    });

    audit.log(req, "document_acknowledge", `document:${docId}`, { userId: req.user.id });
    res.json({ ok: true, acknowledgedAt: assignment.acknowledgedAt });
  } catch (err) { next(err); }
});

// POST /api/v1/documents/upload — admin uploads a document
router.post("/upload", requireRole("ADMIN", "GP"), upload.single("file"), validate(uploadDocumentSchema), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file provided" });

    const { name, category, projectId, status } = req.body;

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

    // Notify investors about new document
    try {
      let investorIds = [];
      if (projectId) {
        // Notify investors in the project
        const projectInvestors = await prisma.investorProject.findMany({
          where: { projectId: parseInt(projectId) },
          select: { userId: true },
        });
        investorIds = projectInvestors.map(ip => ip.userId);
      } else {
        // General doc: notify all active investors
        const allInvestors = await prisma.user.findMany({
          where: { role: "INVESTOR", status: "ACTIVE" },
          select: { id: true },
        });
        investorIds = allInvestors.map(u => u.id);
      }
      if (investorIds.length > 0) {
        const project = projectId ? await prisma.project.findUnique({ where: { id: parseInt(projectId) }, select: { name: true } }) : null;
        notifyMany(investorIds, "document_uploaded", { docName: name, projectName: project?.name || null }).catch(err => console.error("Notification error:", err));
      }
    } catch (notifyErr) {
      console.error("Failed to send document notifications:", notifyErr);
    }

    audit.log(req, "document_upload", `document:${doc.id}`, { name: doc.name, category, projectId: projectId || null });

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

// POST /api/v1/documents/bulk-k1 — bulk upload K-1 documents with auto-matching
router.post("/bulk-k1", requireRole("ADMIN", "GP"), upload.array("files", 50), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: "No files provided" });

    const { projectId, taxYear } = req.body;

    // Get all investors for matching
    const investors = await prisma.user.findMany({
      where: { role: "INVESTOR" },
      select: { id: true, name: true, email: true },
    });

    const results = [];

    for (const file of req.files) {
      const filename = file.originalname.replace(/\.[^.]+$/, ""); // strip extension

      // Auto-match by investor name in filename
      // Patterns: "K-1_JamesChen_2025", "K1-James Chen-2025", "james.chen_k1", etc.
      const cleanName = filename.toLowerCase().replace(/[_\-\.]/g, " ").replace(/k\s*1/g, "").replace(/\d{4}/g, "").trim();
      let matched = null;

      for (const inv of investors) {
        const invNameClean = inv.name.toLowerCase().replace(/\s+/g, "");
        const invNameParts = inv.name.toLowerCase().split(/\s+/);
        const fileNameClean = cleanName.replace(/\s+/g, "");

        // Match: full name (no spaces), or first+last name parts in filename
        if (fileNameClean.includes(invNameClean) || invNameParts.every(part => cleanName.includes(part))) {
          matched = inv;
          break;
        }
      }

      // Upload file
      const prefix = projectId ? `project-${projectId}` : "general";
      const storageKey = `documents/${prefix}/k1-${Date.now()}-${file.originalname}`;
      await storage.upload(storageKey, file.buffer, file.mimetype);

      const bytes = file.size;
      const size = bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
      const year = taxYear || new Date().getFullYear().toString();

      // Create document record
      const doc = await prisma.document.create({
        data: {
          name: `K-1 Tax Document — ${matched ? matched.name : "Unmatched"} (${year})`,
          category: "Tax",
          date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          size,
          status: matched ? "action_required" : "pending",
          file: `/documents/${storageKey}`,
          storageKey,
          ...(projectId ? { projectId: parseInt(projectId) } : {}),
        },
      });

      // Assign to matched investor
      if (matched) {
        await prisma.documentAssignment.create({
          data: { documentId: doc.id, userId: matched.id },
        });
      }

      results.push({
        filename: file.originalname,
        documentId: doc.id,
        matched: matched ? { id: matched.id, name: matched.name } : null,
        status: matched ? "matched" : "unmatched",
      });

      audit.log(req, "document_upload", `document:${doc.id}`, { name: doc.name, category: "Tax", bulk: true, matched: !!matched });
    }

    // Notify matched investors about their K-1 documents
    const matchedResults = results.filter(r => r.status === "matched" && r.matched);
    if (matchedResults.length > 0) {
      let projectName = "Tax Documents";
      if (projectId) {
        try {
          const project = await prisma.project.findUnique({ where: { id: parseInt(projectId) }, select: { name: true } });
          if (project) projectName = project.name;
        } catch (e) { /* use default */ }
      }
      for (const r of matchedResults) {
        try {
          await notifyMany([r.matched.id], "document_uploaded", {
            docName: r.filename,
            projectName,
          });
        } catch (e) { console.warn("K-1 notification failed:", e.message); }
      }
    }

    res.status(201).json({
      total: results.length,
      matched: results.filter(r => r.status === "matched").length,
      unmatched: results.filter(r => r.status === "unmatched").length,
      results,
    });
  } catch (err) { next(err); }
});

// DELETE /api/v1/documents/:id — delete a document (ADMIN/GP)
router.delete("/:id", requireRole("ADMIN", "GP"), async (req, res, next) => {
  try {
    const docId = parseInt(req.params.id);
    const doc = await prisma.document.findUnique({ where: { id: docId } });
    if (!doc) return res.status(404).json({ error: "Document not found" });

    // Delete assignments first
    await prisma.documentAssignment.deleteMany({ where: { documentId: docId } });
    // Delete the document record
    await prisma.document.delete({ where: { id: docId } });

    // Delete file from storage if it exists
    if (doc.storageKey) {
      try { await storage.delete(doc.storageKey); } catch (e) { console.warn("File delete warning:", e.message); }
    }

    audit.log(req, "document_delete", `document:${docId}`, { name: doc.name });
    res.json({ ok: true, name: doc.name });
  } catch (err) { next(err); }
});

module.exports = router;
