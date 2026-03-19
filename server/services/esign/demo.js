// ─── DEMO E-SIGNATURE PROVIDER ──────────────────────────
// Simulates signing flow with in-memory state. No external API needed.
// Perfect for development and demos.

const crypto = require("crypto");

// In-memory store for demo signature requests
const requests = new Map();

function generateId() {
  return "demo_sig_" + crypto.randomBytes(8).toString("hex");
}

async function createSignatureRequest({ documentId, signers, subject, message }) {
  const requestId = generateId();

  const signerRecords = signers.map((s, i) => ({
    signerId: `${requestId}_signer_${i}`,
    name: s.name,
    email: s.email,
    status: "pending",
    signUrl: null, // Actual Prisma signer IDs will be used by the frontend
  }));

  const record = {
    requestId,
    documentId,
    subject: subject || "Signature requested",
    message: message || "",
    status: "pending",
    signers: signerRecords,
    createdAt: new Date(),
  };

  requests.set(requestId, record);
  return { requestId, signers: signerRecords };
}

async function getRequestStatus(requestId) {
  const record = requests.get(requestId);
  if (!record) throw new Error(`Signature request ${requestId} not found`);

  return {
    status: record.status,
    signers: record.signers.map(s => ({
      signerId: s.signerId,
      name: s.name,
      email: s.email,
      status: s.status,
      signUrl: s.signUrl,
    })),
  };
}

async function cancelRequest(requestId) {
  const record = requests.get(requestId);
  if (!record) throw new Error(`Signature request ${requestId} not found`);
  record.status = "cancelled";
  record.signers.forEach(s => {
    if (s.status === "pending") s.status = "cancelled";
  });
}

// Demo: mark a signer as signed
function markSigned(signerId) {
  for (const [, record] of requests) {
    const signer = record.signers.find(s => s.signerId === signerId);
    if (signer) {
      signer.status = "signed";
      signer.signedAt = new Date();
      // If all signers have signed, update request status
      if (record.signers.every(s => s.status === "signed")) {
        record.status = "signed";
        record.completedAt = new Date();
      }
      return { requestId: record.requestId, signer };
    }
  }
  throw new Error(`Signer ${signerId} not found`);
}

async function getEmbeddedSignUrl({ requestId, signerId, returnUrl }) {
  // Demo mode: return a fake URL that the frontend will detect as demo
  // In production, the provider returns a real embedded signing URL
  return {
    signUrl: `${returnUrl}?event=signing_complete&demo=true`,
  };
}

async function getSignedDocument(requestId) {
  // Demo mode: return a minimal PDF buffer indicating the document was signed
  const record = requests.get(requestId);
  const subject = record ? record.subject : "Document";
  const signedDate = record?.completedAt ? record.completedAt.toISOString() : new Date().toISOString();

  // Minimal valid PDF with "SIGNED" stamp text
  const content = `Signed Document: ${subject}\nCompleted: ${signedDate}\n\nThis is a demo-mode signed document placeholder.`;
  const pdfBytes = Buffer.from(
    "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n" +
    `3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n` +
    `5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n` +
    `4 0 obj<</Length ${44 + content.length}>>stream\nBT /F1 12 Tf 72 700 Td (${content.replace(/[()\\]/g, "\\$&").replace(/\n/g, ") Tj T* (")}) Tj ET\nendstream\nendobj\n` +
    "xref\n0 6\n" +
    "trailer<</Size 6/Root 1 0 R>>\nstartxref\n0\n%%EOF"
  );

  return {
    buffer: pdfBytes,
    filename: `${subject.replace(/[^a-zA-Z0-9 ]/g, "")}_signed.pdf`,
    contentType: "application/pdf",
  };
}

async function handleWebhook(payload) {
  // Demo mode: webhook is simulated via the /sign endpoint
  // In production, this would parse the provider's webhook payload
  const { signerId, event } = payload;
  if (event === "signed") {
    const result = markSigned(signerId);
    return { requestId: result.requestId, event: "signed", signer: result.signer };
  }
  throw new Error(`Unknown webhook event: ${event}`);
}

module.exports = { createSignatureRequest, getRequestStatus, cancelRequest, handleWebhook, markSigned, getEmbeddedSignUrl, getSignedDocument };
