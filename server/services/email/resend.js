// ─── RESEND EMAIL ADAPTER ───────────────────────────────
const { Resend } = require("resend");

const apiKey = process.env.RESEND_API_KEY;
const fromAddress = process.env.EMAIL_FROM_ADDRESS || "onboarding@resend.dev";
const fromName = process.env.EMAIL_FROM_NAME || "Northstar Portal";
const FROM = `${fromName} <${fromAddress}>`;

let resend;
if (apiKey) {
  resend = new Resend(apiKey);
  console.log("✓ Resend email configured");
} else {
  console.warn("⚠ RESEND_API_KEY not set — emails will be logged to console");
}

async function sendEmail({ to, subject, html, text, headers }) {
  if (!resend) {
    console.log(`[EMAIL-DEMO] To: ${to} | Subject: ${subject}`);
    return { id: `demo-${Date.now()}`, status: "demo" };
  }

  const { data, error } = await resend.emails.send({
    from: FROM,
    to,
    subject,
    html,
    text,
    ...(headers?.["Reply-To"] ? { reply_to: headers["Reply-To"] } : {}),
  });

  if (error) throw new Error(error.message);
  return { id: data.id, status: "sent" };
}

async function sendBulk(emails) {
  const results = [];
  for (const email of emails) {
    const result = await sendEmail(email);
    results.push(result);
  }
  return results;
}

module.exports = { sendEmail, sendBulk };
