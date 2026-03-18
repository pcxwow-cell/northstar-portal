// ─── E-SIGNATURE ABSTRACTION ────────────────────────────
// Swap between demo, DocuSign, and HelloSign by changing ESIGN_PROVIDER env var.
// Interface: createSignatureRequest({ documentId, signers, subject, message }) → { requestId, signers }
//            getRequestStatus(requestId) → { status, signers }
//            cancelRequest(requestId) → void
//            handleWebhook(payload) → { requestId, event, signer }

const provider = process.env.ESIGN_PROVIDER || "demo";

let esign;
if (provider === "docusign") {
  esign = require("./docusign");
} else if (provider === "hellosign") {
  esign = require("./hellosign");
} else {
  esign = require("./demo");
}

module.exports = esign;
