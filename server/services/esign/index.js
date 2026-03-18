// ─── E-SIGNATURE ABSTRACTION ────────────────────────────
// Swap between demo, DocuSign, and HelloSign by changing ESIGN_PROVIDER env var.

const provider = process.env.ESIGN_PROVIDER || "demo";

let esign;
try {
  if (provider === "docusign") {
    esign = require("./docusign");
    console.log("✓ DocuSign e-signature configured");
  } else if (provider === "hellosign") {
    esign = require("./hellosign");
    console.log("✓ HelloSign e-signature configured");
  } else {
    esign = require("./demo");
    console.log("✓ E-signature running in demo mode");
  }
} catch (err) {
  console.warn(`⚠ ${provider} e-sign failed to load: ${err.message}. Falling back to demo mode.`);
  esign = require("./demo");
}

module.exports = esign;
