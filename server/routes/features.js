const express = require("express");
const router = express.Router();
const { requireRole } = require("../middleware/auth");
const { getFlagsForUser, setUserFlags, getUserOverrides, ROLE_DEFAULTS, GLOBAL_FLAGS } = require("../services/featureFlags");
const audit = require("../services/audit");

// ─── GET /my-flags — Current user's resolved feature flags ───
router.get("/my-flags", async (req, res) => {
  const flags = await getFlagsForUser(req.user);
  res.json({ flags });
});

// ─── GET /flags/:userId — Admin: get flags for any user ───
router.get("/flags/:userId", requireRole("ADMIN"), async (req, res) => {
  const userId = parseInt(req.params.userId);
  const overrides = await getUserOverrides(userId);
  const roleDefaults = ROLE_DEFAULTS[req.user.role] || {};
  res.json({ overrides, roleDefaults, globalFlags: GLOBAL_FLAGS });
});

// ─── PUT /flags/:userId — Admin: set flag overrides for a user ───
router.put("/flags/:userId", requireRole("ADMIN"), async (req, res) => {
  const userId = parseInt(req.params.userId);
  const { flags } = req.body;
  if (!flags || typeof flags !== "object") {
    return res.status(400).json({ error: "flags object is required" });
  }

  // Capture old values before update for audit trail
  const oldOverrides = await getUserOverrides(userId);
  const changedFlags = {};
  for (const [key, newValue] of Object.entries(flags)) {
    const oldValue = oldOverrides[key];
    if (oldValue !== !!newValue) {
      changedFlags[key] = { old: oldValue !== undefined ? oldValue : "(role default)", new: !!newValue };
    }
  }

  await setUserFlags(userId, flags);
  const overrides = await getUserOverrides(userId);

  // Audit log the permission change
  if (Object.keys(changedFlags).length > 0) {
    audit.log(req, "permission_flags_update", `user:${userId}`, {
      targetUserId: userId,
      changedBy: req.user.id,
      changes: changedFlags,
    });
  }

  res.json({ message: "Feature flags updated", overrides });
});

// ─── GET /defaults — Admin: view role defaults and global flags ───
router.get("/defaults", requireRole("ADMIN"), (req, res) => {
  res.json({ roleDefaults: ROLE_DEFAULTS, globalFlags: GLOBAL_FLAGS });
});

module.exports = router;
