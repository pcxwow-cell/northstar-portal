const jwt = require("jsonwebtoken");
const prisma = require("../prisma");

// In production, JWT_SECRET MUST be set — fail hard if missing
const JWT_SECRET = process.env.JWT_SECRET || (
  process.env.NODE_ENV === "production"
    ? (() => { throw new Error("FATAL: JWT_SECRET environment variable is required in production"); })()
    : "dev-secret"
);
const TOKEN_EXPIRY = "7d";
const MFA_TOKEN_EXPIRY = "5m"; // short-lived token for MFA verification step

// Generate JWT token
function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
}

// Generate a short-lived token that only allows MFA verification
function signMfaToken(user) {
  return jwt.sign(
    { id: user.id, mfaPending: true },
    JWT_SECRET,
    { expiresIn: MFA_TOKEN_EXPIRY }
  );
}

// Verify an MFA-pending token
function verifyMfaToken(token) {
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (!payload.mfaPending) return null;
    return payload;
  } catch {
    return null;
  }
}

// Verify JWT and attach user to req
async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  // Support token via query param for iframe/preview endpoints
  const queryToken = req.query.token;
  if (!header && !queryToken) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const token = queryToken || (header.startsWith("Bearer ") ? header.split(" ")[1] : null);
    if (!token) return res.status(401).json({ error: "Invalid token format" });
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user || user.status !== "ACTIVE") {
      return res.status(401).json({ error: "Invalid token" });
    }
    req.user = { id: user.id, email: user.email, role: user.role, name: user.name };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Require specific roles
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}

module.exports = { signToken, signMfaToken, verifyMfaToken, authenticate, requireRole };
