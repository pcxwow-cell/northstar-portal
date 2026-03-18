// ─── EMAIL ABSTRACTION ──────────────────────────────────
// Swap between demo, SendGrid, and Resend by changing EMAIL_PROVIDER env var.
// Interface: sendEmail({ to, subject, html, text }) → { id, status }
//            sendBulk([{ to, subject, html, text }]) → [{ id, status }]

const provider = process.env.EMAIL_PROVIDER || "demo";

let email;
if (provider === "sendgrid") {
  email = require("./sendgrid");
} else if (provider === "resend") {
  email = require("./resend");
} else {
  email = require("./demo");
}

module.exports = email;
