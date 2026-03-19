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

module.exports = { createSignatureRequest, getRequestStatus, cancelRequest, handleWebhook, markSigned };
