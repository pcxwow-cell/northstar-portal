// ─── SENDGRID EMAIL ADAPTER ─────────────────────────────
// Integrates with SendGrid API for transactional email.
//
// Required env vars:
//   SENDGRID_API_KEY    — Your SendGrid API key
//   EMAIL_FROM_ADDRESS  — Verified sender email (default: noreply@northstardevelopment.ca)
//   EMAIL_FROM_NAME     — Sender display name (default: Northstar Portal)

const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const FROM = {
  email: process.env.EMAIL_FROM_ADDRESS || "noreply@northstardevelopment.ca",
  name: process.env.EMAIL_FROM_NAME || "Northstar Portal",
};

async function sendEmail({ to, subject, html, text, headers }) {
  try {
    const msg = { to, from: FROM, subject, html, text };
    if (headers) msg.headers = headers;
    if (headers?.["Reply-To"]) msg.replyTo = headers["Reply-To"];
    const [response] = await sgMail.send(msg);
    return {
      id: response.headers["x-message-id"] || null,
      status: response.statusCode >= 200 && response.statusCode < 300 ? "sent" : "failed",
    };
  } catch (err) {
    console.error("[SendGrid] Send error:", err.message);
    if (err.response) {
      console.error("[SendGrid] Response body:", JSON.stringify(err.response.body));
    }
    return { id: null, status: "failed" };
  }
}

async function sendBulk(emails) {
  try {
    const messages = emails.map(e => ({
      to: e.to,
      from: FROM,
      subject: e.subject,
      html: e.html,
      text: e.text,
      ...(e.headers ? { headers: e.headers, replyTo: e.headers["Reply-To"] } : {}),
    }));
    await sgMail.send(messages);
    return messages.map(() => ({ id: null, status: "sent" }));
  } catch (err) {
    console.error("[SendGrid] Bulk send error:", err.message);
    return emails.map(() => ({ id: null, status: "failed" }));
  }
}

module.exports = { sendEmail, sendBulk };
