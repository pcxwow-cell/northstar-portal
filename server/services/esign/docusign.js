// ─── DOCUSIGN E-SIGNATURE ADAPTER ───────────────────────
// Integrates with DocuSign eSignature API using JWT authentication.
//
// Required env vars:
//   DOCUSIGN_INTEGRATION_KEY  — Integration key (client ID)
//   DOCUSIGN_USER_ID          — The impersonated user's GUID
//   DOCUSIGN_ACCOUNT_ID       — Your DocuSign account ID
//   DOCUSIGN_PRIVATE_KEY_PATH — Path to RSA private key PEM file
//   DOCUSIGN_ENV              — "sandbox" (default) or "production"

const docusign = require("docusign-esign");
const fs = require("fs");
const path = require("path");

const ACCOUNT_ID = process.env.DOCUSIGN_ACCOUNT_ID;
const INTEGRATION_KEY = process.env.DOCUSIGN_INTEGRATION_KEY;
const USER_ID = process.env.DOCUSIGN_USER_ID;
const PRIVATE_KEY_PATH = process.env.DOCUSIGN_PRIVATE_KEY_PATH || "./docusign-private.pem";
const IS_SANDBOX = (process.env.DOCUSIGN_ENV || "sandbox") === "sandbox";

const OAUTH_HOST = IS_SANDBOX ? "account-d.docusign.com" : "account.docusign.com";
const BASE_PATH = IS_SANDBOX ? "https://demo.docusign.net/restapi" : "https://www.docusign.net/restapi";

let accessToken = null;
let tokenExpiry = 0;

function getPrivateKey() {
  // Support private key as env var (for Railway/cloud) or file path
  if (process.env.DOCUSIGN_PRIVATE_KEY) {
    // Env var stores the key with \n escaped — restore real newlines
    return Buffer.from(process.env.DOCUSIGN_PRIVATE_KEY.replace(/\\n/g, "\n"));
  }
  const keyPath = path.resolve(PRIVATE_KEY_PATH);
  if (!fs.existsSync(keyPath)) {
    throw new Error(`DocuSign private key not found. Set DOCUSIGN_PRIVATE_KEY env var or place PEM file at ${keyPath}`);
  }
  return fs.readFileSync(keyPath);
}

async function getToken() {
  if (accessToken && Date.now() < tokenExpiry) return accessToken;

  const apiClient = new docusign.ApiClient();
  apiClient.setOAuthBasePath(OAUTH_HOST);

  const privateKey = getPrivateKey();
  const result = await apiClient.requestJWTUserToken(
    INTEGRATION_KEY,
    USER_ID,
    ["signature"],
    privateKey,
    3600
  );

  accessToken = result.body.access_token;
  tokenExpiry = Date.now() + (result.body.expires_in - 60) * 1000;
  return accessToken;
}

function getApiClient(token) {
  const apiClient = new docusign.ApiClient();
  apiClient.setBasePath(BASE_PATH);
  apiClient.addDefaultHeader("Authorization", `Bearer ${token}`);
  return apiClient;
}

async function createSignatureRequest({ documentId, signers, subject, message, documentBuffer, documentName }) {
  const token = await getToken();
  const apiClient = getApiClient(token);
  const envelopesApi = new docusign.EnvelopesApi(apiClient);

  const envelopeDefinition = {
    emailSubject: subject || "Please sign this document",
    emailBlurb: message || "",
    status: "sent",
    recipients: {
      signers: signers.map((s, i) => ({
        email: s.email,
        name: s.name,
        recipientId: String(i + 1),
        routingOrder: String(i + 1),
        tabs: {
          signHereTabs: [{
            anchorString: "/sn/",
            anchorUnits: "pixels",
            anchorXOffset: "0",
            anchorYOffset: "0",
          }],
        },
      })),
    },
  };

  // Attach document — use provided buffer or create a placeholder
  if (documentBuffer) {
    envelopeDefinition.documents = [{
      documentBase64: documentBuffer.toString("base64"),
      name: documentName || "document.pdf",
      fileExtension: "pdf",
      documentId: "1",
    }];
  } else {
    // Create a minimal placeholder PDF so DocuSign has something to sign
    const placeholder = Buffer.from(
      "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n" +
      "3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Contents 4 0 R>>endobj\n" +
      "4 0 obj<</Length 44>>stream\nBT /F1 12 Tf 100 700 Td (Signature Required) Tj ET\nendstream\nendobj\n" +
      "xref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000210 00000 n \n" +
      "trailer<</Size 5/Root 1 0 R>>\nstartxref\n306\n%%EOF"
    );
    envelopeDefinition.documents = [{
      documentBase64: placeholder.toString("base64"),
      name: documentName || "document.pdf",
      fileExtension: "pdf",
      documentId: "1",
    }];
  }

  const result = await envelopesApi.createEnvelope(ACCOUNT_ID, { envelopeDefinition });

  // Get signing URLs for embedded signing (if needed)
  const signerResults = [];
  for (let i = 0; i < signers.length; i++) {
    signerResults.push({
      signerId: `${result.envelopeId}_${i}`,
      status: "pending",
      signUrl: null, // Email-based signing by default
    });
  }

  return {
    requestId: result.envelopeId,
    signers: signerResults,
  };
}

async function getRequestStatus(requestId) {
  const token = await getToken();
  const apiClient = getApiClient(token);
  const envelopesApi = new docusign.EnvelopesApi(apiClient);

  const envelope = await envelopesApi.getEnvelope(ACCOUNT_ID, requestId);

  const statusMap = {
    created: "pending",
    sent: "pending",
    delivered: "pending",
    completed: "signed",
    declined: "declined",
    voided: "cancelled",
  };

  // Get recipient status
  const recipients = await envelopesApi.listRecipients(ACCOUNT_ID, requestId);
  const signerStatuses = (recipients.signers || []).map(s => ({
    email: s.email,
    name: s.name,
    status: statusMap[s.status] || "pending",
    signedAt: s.signedDateTime || null,
  }));

  return {
    status: statusMap[envelope.status] || "pending",
    signers: signerStatuses,
  };
}

async function cancelRequest(requestId) {
  const token = await getToken();
  const apiClient = getApiClient(token);
  const envelopesApi = new docusign.EnvelopesApi(apiClient);

  await envelopesApi.update(ACCOUNT_ID, requestId, {
    envelope: { status: "voided", voidedReason: "Cancelled by admin" },
  });
}

async function handleWebhook(payload) {
  // DocuSign Connect webhook payload
  const envelopeId = payload.envelopeId || payload.EnvelopeStatus?.EnvelopeID;
  const event = payload.event || payload.EnvelopeStatus?.Status;

  // Map DocuSign events to our standard events
  const eventMap = {
    completed: "signed",
    declined: "declined",
    voided: "cancelled",
    "envelope-completed": "signed",
    "recipient-completed": "signer_signed",
  };

  return {
    requestId: envelopeId,
    event: eventMap[event] || event,
    signer: null,
  };
}

module.exports = { createSignatureRequest, getRequestStatus, cancelRequest, handleWebhook };
