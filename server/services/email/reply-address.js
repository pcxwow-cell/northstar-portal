// ─── REPLY-TO ADDRESS ENCODING ─────────────────────────
// Generates unique reply-to addresses for thread+user combinations.
// Format: reply+<token>@<domain>
// Token = base64url(threadId:userId:hmac)

const crypto = require("crypto");

const REPLY_DOMAIN = process.env.REPLY_DOMAIN || "mail.northstardevelopment.ca";
const REPLY_SECRET = process.env.REPLY_SECRET || "dev-reply-secret";

/**
 * Generate a unique reply-to address for a thread+user combination.
 * @param {number} threadId
 * @param {number} userId
 * @returns {string} reply+<token>@<domain>
 */
function generateReplyAddress(threadId, userId) {
  const payload = `${threadId}:${userId}`;
  const hmac = crypto
    .createHmac("sha256", REPLY_SECRET)
    .update(payload)
    .digest("hex")
    .slice(0, 12);
  const token = Buffer.from(`${payload}:${hmac}`).toString("base64url");
  return `reply+${token}@${REPLY_DOMAIN}`;
}

/**
 * Parse and verify a reply-to address.
 * @param {string} address - The reply-to email address
 * @returns {{ threadId: number, userId: number } | null}
 */
function parseReplyAddress(address) {
  try {
    const match = address.match(/^reply\+([^@]+)@/);
    if (!match) return null;

    const decoded = Buffer.from(match[1], "base64url").toString();
    const parts = decoded.split(":");
    if (parts.length !== 3) return null;

    const [threadId, userId, hmac] = parts;

    // Verify HMAC
    const payload = `${threadId}:${userId}`;
    const expectedHmac = crypto
      .createHmac("sha256", REPLY_SECRET)
      .update(payload)
      .digest("hex")
      .slice(0, 12);
    if (hmac !== expectedHmac) return null;

    return { threadId: parseInt(threadId), userId: parseInt(userId) };
  } catch {
    return null;
  }
}

module.exports = { generateReplyAddress, parseReplyAddress, REPLY_DOMAIN };
