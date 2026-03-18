const express = require("express");
const router = express.Router();
const { requireRole } = require("../middleware/auth");
const { getFlagsForUser, setUserFlags, getUserOverrides, ROLE_DEFAULTS, GLOBAL_FLAGS } = require("../services/featureFlags");

// ─── GET /my-flags — Current user's resolved feature flags ───
router.get("/my-flags", (req, res) => {
  const flags = getFlagsForUser(req.user);
  res.json({ flags });
});

// ─── GET /flags/:userId — Admin: get flags for any user ───
router.get("/flags/:userId", requireRole("ADMIN"), (req, res) => {
  const userId = parseInt(req.params.userId);
  const overrides = getUserOverrides(userId);
  const roleDefaults = ROLE_DEFAULTS[req.user.role] || {};
  res.json({ overrides, roleDefaults, globalFlags: GLOBAL_FLAGS });
});

// ─── PUT /flags/:userId — Admin: set flag overrides for a user ───
router.put("/flags/:userId", requireRole("ADMIN"), (req, res) => {
  const userId = parseInt(req.params.userId);
  const { flags } = req.body;
  if (!flags || typeof flags !== "object") {
    return res.status(400).json({ error: "flags object is required" });
  }
  setUserFlags(userId, flags);
  res.json({ message: "Feature flags updated", overrides: getUserOverrides(userId) });
});

// ─── GET /defaults — Admin: view role defaults and global flags ───
router.get("/defaults", requireRole("ADMIN"), (req, res) => {
  res.json({ roleDefaults: ROLE_DEFAULTS, globalFlags: GLOBAL_FLAGS });
});

module.exports = router;
