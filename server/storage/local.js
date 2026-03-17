// ─── LOCAL DISK STORAGE ──────────────────────────────────
// Stores files in /uploads directory. For development only.
// In production, switch to S3 adapter via STORAGE_PROVIDER=s3

const fs = require("fs");
const path = require("path");

const UPLOADS_DIR = path.resolve(__dirname, "../../uploads");

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

async function upload(key, buffer, mimetype) {
  const filePath = path.join(UPLOADS_DIR, key);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, buffer);
  return `/uploads/${key}`;
}

async function getSignedUrl(key) {
  // Local storage: return a direct path served by Express static middleware
  const filePath = path.join(UPLOADS_DIR, key);
  if (!fs.existsSync(filePath)) return null;
  return `/uploads/${key}`;
}

async function getStream(key) {
  const filePath = path.join(UPLOADS_DIR, key);
  if (!fs.existsSync(filePath)) return null;
  return fs.createReadStream(filePath);
}

async function remove(key) {
  const filePath = path.join(UPLOADS_DIR, key);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

module.exports = { upload, getSignedUrl, getStream, remove };
