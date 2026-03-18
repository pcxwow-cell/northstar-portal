// ─── EMAIL BODY PARSER ─────────────────────────────────
// Strips quoted text, signatures, and email cruft from reply bodies.

/**
 * Extract just the new reply text from a plain-text email body.
 * Strips: quoted replies, signature blocks, forwarded headers,
 * "Sent from my iPhone", etc.
 * @param {string} text
 * @returns {string}
 */
function extractReplyBody(text) {
  if (!text) return "";

  const lines = text.split("\n");
  const cleanLines = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Stop at quoted reply markers
    if (/^On .+ wrote:$/i.test(trimmed)) break;
    if (/^>/.test(trimmed)) break;
    if (/^-{2,}\s*$/.test(trimmed)) break; // signature delimiter
    if (/^_{2,}\s*$/.test(trimmed)) break;
    if (/^={2,}\s*$/.test(trimmed)) break;
    if (/^Sent from my/i.test(trimmed)) break;
    if (/^Get Outlook/i.test(trimmed)) break;
    if (/^---------- Forwarded message/i.test(trimmed)) break;
    if (/^From:.*@/i.test(trimmed)) break;
    if (/^-{3,}\s*Original Message/i.test(trimmed)) break;

    cleanLines.push(line);
  }

  // Trim trailing whitespace
  const result = cleanLines.join("\n").trim();

  // Fallback to original if everything was stripped
  return result || text.trim();
}

/**
 * Extract reply from HTML email body.
 * Converts to plain text first, then strips quoted content.
 * @param {string} html
 * @returns {string}
 */
function extractReplyFromHtml(html) {
  if (!html) return "";

  // Simple HTML to text conversion
  let text = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, "") // strip all tags
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  return extractReplyBody(text);
}

module.exports = { extractReplyBody, extractReplyFromHtml };
