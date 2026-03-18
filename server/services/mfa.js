/**
 * MFA (TOTP) service — implements RFC 6238 TOTP using Node.js crypto.
 * No external TOTP dependency needed. QR code generation uses the qrcode package.
 */

const crypto = require("crypto");
const QRCode = require("qrcode");

const ISSUER = "Northstar Portal";
const BACKUP_CODE_COUNT = 8;
const TOTP_STEP = 30; // seconds
const TOTP_DIGITS = 6;
const TOTP_WINDOW = 1; // allow 1 step before/after for clock skew

/**
 * Generate a random base32-encoded secret (20 bytes = 32 chars in base32).
 */
function generateSecretKey() {
  const bytes = crypto.randomBytes(20);
  return base32Encode(bytes);
}

/**
 * Base32 encode a buffer (RFC 4648).
 */
function base32Encode(buffer) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const byte of buffer) bits += byte.toString(2).padStart(8, "0");
  let result = "";
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5).padEnd(5, "0");
    result += alphabet[parseInt(chunk, 2)];
  }
  return result;
}

/**
 * Base32 decode a string to a Buffer.
 */
function base32Decode(str) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const c of str.toUpperCase()) {
    const idx = alphabet.indexOf(c);
    if (idx < 0) continue; // skip padding/invalid
    bits += idx.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

/**
 * Generate HOTP value (RFC 4226).
 */
function hotp(secret, counter) {
  const key = base32Decode(secret);
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac("sha1", key).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code = ((hmac[offset] & 0x7f) << 24 | hmac[offset + 1] << 16 | hmac[offset + 2] << 8 | hmac[offset + 3]) % (10 ** TOTP_DIGITS);
  return code.toString().padStart(TOTP_DIGITS, "0");
}

/**
 * Generate TOTP for current time.
 */
function totp(secret, timeStepOffset = 0) {
  const counter = Math.floor(Date.now() / 1000 / TOTP_STEP) + timeStepOffset;
  return hotp(secret, counter);
}

/**
 * Generate a new TOTP secret and QR code data URL.
 * @param {string} email — user's email (used as account name in otpauth URI)
 * @returns {{ secret: string, otpauthUri: string, qrCodeDataUrl: string }}
 */
async function generateSecret(email) {
  const secret = generateSecretKey();
  const otpauthUri = `otpauth://totp/${encodeURIComponent(ISSUER)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(ISSUER)}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_STEP}`;
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUri);
  return { secret, otpauthUri, qrCodeDataUrl };
}

/**
 * Verify a 6-digit TOTP token against a secret.
 * Checks current time step +/- window for clock skew tolerance.
 * @param {string} token — 6-digit code
 * @param {string} secret — TOTP secret (base32)
 * @returns {boolean}
 */
function verifyToken(token, secret) {
  if (!token || !secret) return false;
  const normalizedToken = token.replace(/\s/g, "");
  for (let i = -TOTP_WINDOW; i <= TOTP_WINDOW; i++) {
    if (totp(secret, i) === normalizedToken) return true;
  }
  return false;
}

/**
 * Generate backup codes (plaintext + hashed).
 * @returns {{ codes: string[], hashed: string[] }}
 */
function generateBackupCodes() {
  const codes = [];
  const hashed = [];
  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    const code = crypto.randomBytes(4).toString("hex"); // 8-char hex
    codes.push(code);
    hashed.push(hashBackupCode(code));
  }
  return { codes, hashed };
}

/**
 * Hash a backup code for storage.
 */
function hashBackupCode(code) {
  return crypto.createHash("sha256").update(code.toLowerCase().trim()).digest("hex");
}

/**
 * Check a backup code against stored hashed codes.
 * Returns the index of the matching code, or -1 if not found.
 * @param {string} code — plaintext backup code
 * @param {string[]} hashedCodes — array of hashed backup codes
 * @returns {number} index or -1
 */
function verifyBackupCode(code, hashedCodes) {
  const hash = hashBackupCode(code);
  return hashedCodes.indexOf(hash);
}

module.exports = {
  generateSecret,
  generateSecretKey,
  verifyToken,
  totp,
  generateBackupCodes,
  hashBackupCode,
  verifyBackupCode,
};
