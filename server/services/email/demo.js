// ─── DEMO EMAIL PROVIDER ────────────────────────────────
// Logs emails to console instead of sending. For development only.

const crypto = require("crypto");

async function sendEmail({ to, subject, html, text, headers }) {
  const id = "demo_email_" + crypto.randomBytes(6).toString("hex");
  console.log(`\n📧 [DEMO EMAIL] ─────────────────────────────`);
  console.log(`   To:      ${to}`);
  console.log(`   Subject: ${subject}`);
  if (headers?.["Reply-To"]) {
    console.log(`   Reply-To: ${headers["Reply-To"]}`);
  }
  console.log(`   Text:    ${(text || "").substring(0, 120)}...`);
  console.log(`   ID:      ${id}`);
  console.log(`─────────────────────────────────────────────\n`);
  return { id, status: "sent" };
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
