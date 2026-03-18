// ─── HELLOSIGN / DROPBOX SIGN ADAPTER ───────────────────
// Integrates with Dropbox Sign (formerly HelloSign) API.
//
// SETUP:
// 1. Create a Dropbox Sign account at https://www.hellosign.com
// 2. Get your API key from Settings > API
// 3. Set the following environment variables:
//    HELLOSIGN_API_KEY — Your Dropbox Sign API key
//
// 4. Install: npm install @dropbox/sign
// 5. Uncomment the code below and remove the placeholder throw.

// const DropboxSign = require("@dropbox/sign");
//
// const API_KEY = process.env.HELLOSIGN_API_KEY;
//
// const signatureRequestApi = new DropboxSign.SignatureRequestApi();
// signatureRequestApi.username = API_KEY;
//
// async function createSignatureRequest({ documentId, signers, subject, message }) {
//   const data = {
//     title: subject || "Signature Request",
//     subject: subject || "Please sign this document",
//     message: message || "Please review and sign this document.",
//     signers: signers.map((s, i) => ({
//       emailAddress: s.email,
//       name: s.name,
//       order: i,
//     })),
//     testMode: process.env.NODE_ENV !== "production",
//     // fileUrls: ["https://..."] // or file: [buffer]
//   };
//
//   const result = await signatureRequestApi.signatureRequestSend(data);
//   const sr = result.body.signatureRequest;
//
//   return {
//     requestId: sr.signatureRequestId,
//     signers: sr.signatures.map(sig => ({
//       signerId: sig.signatureId,
//       status: sig.statusCode === "signed" ? "signed" : "pending",
//       signUrl: null, // Use embedded signing URL if needed
//     })),
//   };
// }
//
// async function getRequestStatus(requestId) {
//   const result = await signatureRequestApi.signatureRequestGet(requestId);
//   const sr = result.body.signatureRequest;
//
//   const allSigned = sr.signatures.every(s => s.statusCode === "signed");
//   const anyDeclined = sr.signatures.some(s => s.statusCode === "declined");
//
//   return {
//     status: allSigned ? "signed" : anyDeclined ? "declined" : "pending",
//     signers: sr.signatures.map(sig => ({
//       signerId: sig.signatureId,
//       name: sig.signerName,
//       email: sig.signerEmailAddress,
//       status: sig.statusCode === "signed" ? "signed" : sig.statusCode === "declined" ? "declined" : "pending",
//     })),
//   };
// }
//
// async function cancelRequest(requestId) {
//   await signatureRequestApi.signatureRequestCancel(requestId);
// }
//
// async function handleWebhook(payload) {
//   // Dropbox Sign webhook payload
//   const event = payload.event?.event_type;
//   const sr = payload.signature_request;
//   const requestId = sr?.signature_request_id;
//
//   const eventMap = {
//     signature_request_signed: "signed",
//     signature_request_declined: "declined",
//     signature_request_all_signed: "signed",
//   };
//
//   return {
//     requestId,
//     event: eventMap[event] || event,
//     signer: null,
//   };
// }
//
// module.exports = { createSignatureRequest, getRequestStatus, cancelRequest, handleWebhook };

// Placeholder until Dropbox Sign SDK is installed
throw new Error(
  "HelloSign/Dropbox Sign is not configured. Install @dropbox/sign, " +
  "then uncomment the code in server/services/esign/hellosign.js and set HELLOSIGN_API_KEY env var."
);
