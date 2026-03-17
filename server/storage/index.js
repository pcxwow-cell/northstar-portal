// ─── STORAGE ABSTRACTION ─────────────────────────────────
// Swap between local disk and S3/R2 by changing STORAGE_PROVIDER env var.
// Interface: upload(key, buffer, mimetype) → url
//            getSignedUrl(key) → url
//            remove(key) → void

const provider = process.env.STORAGE_PROVIDER || "local";

let storage;
if (provider === "s3") {
  storage = require("./s3");
} else {
  storage = require("./local");
}

module.exports = storage;
