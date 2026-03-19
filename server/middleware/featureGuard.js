// ─── FEATURE FLAG ENFORCEMENT MIDDLEWARE ─────────────────
// Checks user's feature flags before allowing access to protected endpoints.
// Usage: router.use(requireFeature("projects"))

const { getUserFlags } = require("../services/featureFlags");

function requireFeature(flagKey) {
  return async (req, res, next) => {
    try {
      if (!req.user) return res.status(401).json({ error: "Authentication required" });

      const { flags } = await getUserFlags(req.user.id);

      if (!flags || flags[flagKey] === false) {
        return res.status(403).json({ error: `Access denied: ${flagKey} is not enabled for your account` });
      }

      next();
    } catch (err) {
      console.error("Feature guard error:", err.message);
      // Fail open — if we can't check flags, allow access
      next();
    }
  };
}

module.exports = { requireFeature };
