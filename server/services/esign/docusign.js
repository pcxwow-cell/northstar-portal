// ─── DOCUSIGN E-SIGNATURE ADAPTER ───────────────────────
// Integrates with DocuSign eSignature API.
//
// SETUP:
// 1. Create a DocuSign developer account at https://developers.docusign.com
// 2. Create an integration key (client ID) in the Apps & Keys page
// 3. Generate an RSA keypair and configure JWT consent
// 4. Set the following environment variables:
//    DOCUSIGN_ACCOUNT_ID     — Your DocuSign account ID
//    DOCUSIGN_INTEGRATION_KEY — Integration key (client ID)
//    DOCUSIGN_USER_ID         — The impersonated user's GUID
//    DOCUSIGN_PRIVATE_KEY     — RSA private key (PEM format, or path to file)
//    DOCUSIGN_BASE_URL        — https://demo.docusign.net (demo) or https://www.docusign.net (prod)
//
// 5. Install: npm install docusign-esign
// 6. Uncomment the code below and remove the placeholder throw.

// const docusign = require("docusign-esign");
//
// const ACCOUNT_ID = process.env.DOCUSIGN_ACCOUNT_ID;
// const INTEGRATION_KEY = process.env.DOCUSIGN_INTEGRATION_KEY;
// const USER_ID = process.env.DOCUSIGN_USER_ID;
// const PRIVATE_KEY = process.env.DOCUSIGN_PRIVATE_KEY;
// const BASE_URL = process.env.DOCUSIGN_BASE_URL || "https://demo.docusign.net";
//
// let accessToken = null;
// let tokenExpiry = 0;
//
// async function getToken() {
//   if (accessToken && Date.now() < tokenExpiry) return accessToken;
//   const apiClient = new docusign.ApiClient();
//   apiClient.setOAuthBasePath(BASE_URL.replace("https://", ""));
//   const result = await apiClient.requestJWTUserToken(
//     INTEGRATION_KEY, USER_ID, ["signature"],
//     Buffer.from(PRIVATE_KEY), 3600
//   );
//   accessToken = result.body.access_token;
//   tokenExpiry = Date.now() + (result.body.expires_in - 60) * 1000;
//   return accessToken;
// }
//
// async function createSignatureRequest({ documentId, signers, subject, message }) {
//   const token = await getToken();
//   const apiClient = new docusign.ApiClient();
//   apiClient.addDefaultHeader("Authorization", `Bearer ${token}`);
//   apiClient.setBasePath(`${BASE_URL}/restapi`);
//
//   const envelopesApi = new docusign.EnvelopesApi(apiClient);
//
//   const envelope = {
//     emailSubject: subject || "Please sign this document",
//     emailBlurb: message || "",
//     status: "sent",
//     recipients: {
//       signers: signers.map((s, i) => ({
//         email: s.email,
//         name: s.name,
//         recipientId: String(i + 1),
//         routingOrder: String(i + 1),
//       })),
//     },
//     // Note: You would attach the actual document here
//     // documents: [{ documentBase64: "...", name: "document.pdf", fileExtension: "pdf", documentId: "1" }],
//   };
//
//   const result = await envelopesApi.createEnvelope(ACCOUNT_ID, { envelopeDefinition: envelope });
//
//   return {
//     requestId: result.envelopeId,
//     signers: signers.map((s, i) => ({
//       signerId: `${result.envelopeId}_${i}`,
//       status: "pending",
//       signUrl: null, // Use embedded signing or email-based
//     })),
//   };
// }
//
// async function getRequestStatus(requestId) {
//   const token = await getToken();
//   const apiClient = new docusign.ApiClient();
//   apiClient.addDefaultHeader("Authorization", `Bearer ${token}`);
//   apiClient.setBasePath(`${BASE_URL}/restapi`);
//
//   const envelopesApi = new docusign.EnvelopesApi(apiClient);
//   const envelope = await envelopesApi.getEnvelope(ACCOUNT_ID, requestId);
//
//   const statusMap = { sent: "pending", delivered: "pending", completed: "signed", declined: "declined", voided: "cancelled" };
//
//   return {
//     status: statusMap[envelope.status] || "pending",
//     signers: [], // Fetch recipients separately if needed
//   };
// }
//
// async function cancelRequest(requestId) {
//   const token = await getToken();
//   const apiClient = new docusign.ApiClient();
//   apiClient.addDefaultHeader("Authorization", `Bearer ${token}`);
//   apiClient.setBasePath(`${BASE_URL}/restapi`);
//
//   const envelopesApi = new docusign.EnvelopesApi(apiClient);
//   await envelopesApi.update(ACCOUNT_ID, requestId, {
//     envelope: { status: "voided", voidedReason: "Cancelled by admin" },
//   });
// }
//
// async function handleWebhook(payload) {
//   // DocuSign Connect webhook payload
//   const envelopeId = payload.envelopeId || payload.EnvelopeStatus?.EnvelopeID;
//   const event = payload.event || payload.EnvelopeStatus?.Status;
//   return { requestId: envelopeId, event, signer: null };
// }
//
// module.exports = { createSignatureRequest, getRequestStatus, cancelRequest, handleWebhook };

// Placeholder until DocuSign SDK is installed
throw new Error(
  "DocuSign is not configured. Install docusign-esign, " +
  "then uncomment the code in server/services/esign/docusign.js and set " +
  "DOCUSIGN_ACCOUNT_ID, DOCUSIGN_INTEGRATION_KEY, DOCUSIGN_USER_ID, DOCUSIGN_PRIVATE_KEY env vars."
);
