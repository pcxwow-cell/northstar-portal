// ─── RESEND EMAIL ADAPTER ───────────────────────────────
// Integrates with Resend API for transactional email.
//
// SETUP:
// 1. Create a Resend account at https://resend.com
// 2. Add and verify your domain
// 3. Create an API key
// 4. Set the following environment variables:
//    RESEND_API_KEY      — Your Resend API key
//    EMAIL_FROM_ADDRESS  — Verified sender email (e.g., portal@northstardevelopment.ca)
//    EMAIL_FROM_NAME     — Sender display name (e.g., Northstar Portal)
//
// 5. Install: npm install resend
// 6. Uncomment the code below and remove the placeholder throw.

// const { Resend } = require("resend");
//
// const resend = new Resend(process.env.RESEND_API_KEY);
//
// const FROM = `${process.env.EMAIL_FROM_NAME || "Northstar Portal"} <${process.env.EMAIL_FROM_ADDRESS || "portal@northstardevelopment.ca"}>`;
//
// async function sendEmail({ to, subject, html, text, headers }) {
//   const { data, error } = await resend.emails.send({
//     from: FROM,
//     to,
//     subject,
//     html,
//     text,
//     ...(headers?.["Reply-To"] ? { reply_to: headers["Reply-To"] } : {}),
//     ...(headers ? { headers } : {}),
//   });
//
//   if (error) throw new Error(error.message);
//
//   return { id: data.id, status: "sent" };
// }
//
// async function sendBulk(emails) {
//   const results = [];
//   for (const email of emails) {
//     const result = await sendEmail(email);
//     results.push(result);
//   }
//   return results;
// }
//
// module.exports = { sendEmail, sendBulk };

// Placeholder until Resend SDK is installed
throw new Error(
  "Resend is not configured. Install resend, " +
  "then uncomment the code in server/services/email/resend.js and set RESEND_API_KEY, EMAIL_FROM_ADDRESS env vars."
);
