const { Router } = require("express");
const prisma = require("../prisma");
const esign = require("../services/esign");
const { requireRole } = require("../middleware/auth");
const { notify } = require("../services/notifications");
const router = Router();

// POST /api/v1/signatures/request — create signature request (ADMIN/GP)
router.post("/request", requireRole("ADMIN", "GP"), async (req, res, next) => {
  try {
    const { documentId, signerIds, subject, message } = req.body;
    if (!documentId || !signerIds?.length) {
      return res.status(400).json({ error: "documentId and signerIds are required" });
    }

    // Validate document exists
    const doc = await prisma.document.findUnique({
      where: { id: parseInt(documentId) },
      include: { project: { select: { name: true } } },
    });
    if (!doc) return res.status(404).json({ error: "Document not found" });

    // Get signer details
    const signerUsers = await prisma.user.findMany({
      where: { id: { in: signerIds.map(id => parseInt(id)) } },
      select: { id: true, name: true, email: true },
    });
    if (!signerUsers.length) return res.status(400).json({ error: "No valid signers found" });

    // Create request with e-sign provider
    const providerResult = await esign.createSignatureRequest({
      documentId: doc.id,
      signers: signerUsers.map(u => ({ name: u.name, email: u.email })),
      subject: subject || `Please sign: ${doc.name}`,
      message: message || "",
    });

    // Save to database
    const sigRequest = await prisma.signatureRequest.create({
      data: {
        documentId: doc.id,
        requestId: providerResult.requestId,
        subject: subject || `Please sign: ${doc.name}`,
        message: message || "",
        createdById: req.user.id,
        signers: {
          create: signerUsers.map((u, i) => ({
            userId: u.id,
            name: u.name,
            email: u.email,
            signUrl: providerResult.signers[i]?.signUrl || null,
          })),
        },
      },
      include: { signers: true, document: { select: { name: true } } },
    });

    // Update document status
    await prisma.document.update({
      where: { id: doc.id },
      data: { status: "pending_signature" },
    });

    // Notify each signer
    for (const signer of sigRequest.signers) {
      if (signer.userId) {
        await notify(signer.userId, "signature_required", {
          docName: doc.name,
          signUrl: signer.signUrl || "https://portal.northstardevelopment.ca/documents",
        });
      }
    }

    res.status(201).json({
      id: sigRequest.id,
      requestId: sigRequest.requestId,
      status: sigRequest.status,
      document: sigRequest.document,
      signers: sigRequest.signers.map(s => ({
        id: s.id,
        name: s.name,
        email: s.email,
        status: s.status,
        signUrl: s.signUrl,
      })),
    });
  } catch (err) { next(err); }
});

// GET /api/v1/signatures — list signature requests
router.get("/", async (req, res, next) => {
  try {
    let where = {};

    if (req.user.role === "INVESTOR") {
      // Investor sees only requests where they are a signer
      where = { signers: { some: { userId: req.user.id } } };
    }

    const requests = await prisma.signatureRequest.findMany({
      where,
      include: {
        signers: { select: { id: true, name: true, email: true, status: true, userId: true } },
        document: { select: { id: true, name: true, category: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(requests.map(r => ({
      id: r.id,
      requestId: r.requestId,
      status: r.status,
      subject: r.subject,
      document: r.document,
      createdBy: r.createdBy,
      signers: r.signers,
      createdAt: r.createdAt,
      completedAt: r.completedAt,
    })));
  } catch (err) { next(err); }
});

// GET /api/v1/signatures/:id — get request detail
router.get("/:id", async (req, res, next) => {
  try {
    const request = await prisma.signatureRequest.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        signers: true,
        document: { select: { id: true, name: true, category: true, date: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });
    if (!request) return res.status(404).json({ error: "Signature request not found" });

    // Access check: investor can only see their own
    if (req.user.role === "INVESTOR" && !request.signers.some(s => s.userId === req.user.id)) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json({
      id: request.id,
      requestId: request.requestId,
      status: request.status,
      subject: request.subject,
      message: request.message,
      document: request.document,
      createdBy: request.createdBy,
      signers: request.signers.map(s => ({
        id: s.id,
        name: s.name,
        email: s.email,
        status: s.status,
        signedAt: s.signedAt,
        signUrl: s.signUrl,
      })),
      createdAt: request.createdAt,
      completedAt: request.completedAt,
    });
  } catch (err) { next(err); }
});

// POST /api/v1/signatures/:signerId/sign — demo: mark signer as signed
router.post("/:signerId/sign", async (req, res, next) => {
  try {
    const signerId = parseInt(req.params.signerId);
    const signer = await prisma.signatureSigner.findUnique({
      where: { id: signerId },
      include: {
        request: {
          include: {
            signers: true,
            document: { select: { id: true, name: true } },
            createdBy: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!signer) return res.status(404).json({ error: "Signer not found" });

    // Access check: only the signer or admin can sign
    if (req.user.role === "INVESTOR" && signer.userId !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Update signer status
    await prisma.signatureSigner.update({
      where: { id: signerId },
      data: { status: "signed", signedAt: new Date() },
    });

    // Check if all signers have signed
    const allSigners = await prisma.signatureSigner.findMany({
      where: { requestId: signer.requestId },
    });
    const allSigned = allSigners.every(s => s.id === signerId ? true : s.status === "signed");

    if (allSigned) {
      await prisma.signatureRequest.update({
        where: { id: signer.requestId },
        data: { status: "signed", completedAt: new Date() },
      });
      // Update document status back to published
      await prisma.document.update({
        where: { id: signer.request.documentId },
        data: { status: "published" },
      });
    }

    // Notify admin that signer has signed
    if (signer.request.createdBy) {
      await notify(signer.request.createdBy.id, "signature_completed", {
        investorName: signer.name,
        docName: signer.request.document.name,
      });
    }

    res.json({ ok: true, status: "signed", allSigned });
  } catch (err) { next(err); }
});

// POST /api/v1/signatures/:id/cancel — cancel a request (ADMIN/GP)
router.post("/:id/cancel", requireRole("ADMIN", "GP"), async (req, res, next) => {
  try {
    const request = await prisma.signatureRequest.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { document: true },
    });
    if (!request) return res.status(404).json({ error: "Signature request not found" });

    // Cancel with provider
    try {
      await esign.cancelRequest(request.requestId);
    } catch (e) {
      // Provider cancel may fail if already completed — that's okay
      console.warn("Provider cancel warning:", e.message);
    }

    // Update database
    await prisma.signatureRequest.update({
      where: { id: request.id },
      data: { status: "cancelled" },
    });
    await prisma.signatureSigner.updateMany({
      where: { requestId: request.id, status: "pending" },
      data: { status: "cancelled" },
    });

    // Reset document status
    await prisma.document.update({
      where: { id: request.documentId },
      data: { status: "published" },
    });

    res.json({ ok: true });
  } catch (err) { next(err); }
});

// POST /api/v1/signatures/webhook — webhook endpoint for provider callbacks
router.post("/webhook", async (req, res, next) => {
  try {
    const result = await esign.handleWebhook(req.body);

    if (result.requestId) {
      // Find the signature request by provider requestId
      const sigReq = await prisma.signatureRequest.findUnique({
        where: { requestId: result.requestId },
      });
      if (sigReq && result.event === "signed") {
        // Update status via provider sync
        const providerStatus = await esign.getRequestStatus(result.requestId);
        if (providerStatus.status === "signed") {
          await prisma.signatureRequest.update({
            where: { id: sigReq.id },
            data: { status: "signed", completedAt: new Date() },
          });
        }
      }
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("Webhook error:", err.message);
    res.status(200).json({ ok: false, error: err.message }); // Always 200 for webhooks
  }
});

module.exports = router;
