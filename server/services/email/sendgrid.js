// ─── SENDGRID EMAIL ADAPTER ─────────────────────────────
// Integrates with SendGrid API for transactional email.
//
// SETUP:
// 1. Create a SendGrid account at https://sendgrid.com
// 2. Create an API key with Mail Send permissions
// 3. Verify a sender identity (domain or single sender)
// 4. Set the following environment variables:
//    SENDGRID_API_KEY    — Your SendGrid API key
//    EMAIL_FROM_ADDRESS  — Verified sender email (e.g., portal@northstardevelopment.ca)
//    EMAIL_FROM_NAME     — Sender display name (e.g., Northstar Portal)
//
// 5. Install: npm install @sendgrid/mail
// 6. Uncomment the code below and remove the placeholder throw.

// const sgMail = require("@sendgrid/mail");
// sgMail.setApiKey(process.env.SENDGRID_API_KEY);
//
// const FROM = {
//   email: process.env.EMAIL_FROM_ADDRESS || "portal@northstardevelopment.ca",
//   name: process.env.EMAIL_FROM_NAME || "Northstar Portal",
// };
//
// async function sendEmail({ to, subject, html, text }) {
//   const msg = { to, from: FROM, subject, html, text };
//   const [response] = await sgMail.send(msg);
//   return {
//     id: response.headers["x-message-id"] || null,
//     status: response.statusCode >= 200 && response.statusCode < 300 ? "sent" : "failed",
//   };
// }
//
// async function sendBulk(emails) {
//   const messages = emails.map(e => ({ to: e.to, from: FROM, subject: e.subject, html: e.html, text: e.text }));
//   await sgMail.send(messages);
//   return messages.map(() => ({ id: null, status: "sent" }));
// }
//
// module.exports = { sendEmail, sendBulk };

// Placeholder until SendGrid SDK is installed
throw new Error(
  "SendGrid is not configured. Install @sendgrid/mail, " +
  "then uncomment the code in server/services/email/sendgrid.js and set SENDGRID_API_KEY, EMAIL_FROM_ADDRESS env vars."
);
