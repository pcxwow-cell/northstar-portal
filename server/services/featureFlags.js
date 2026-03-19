// ─── FEATURE FLAGS SERVICE ───────────────────────────────
// Controls which features/menus are visible per user, role, or project.
// Flags can be set globally, per role, per user, or per project.
// Overrides are persisted to the FeatureFlagOverride table via Prisma.

const prisma = require("../prisma");

/**
 * Default feature flags by role.
 * Each flag controls a menu item or functional area.
 * true = visible/enabled, false = hidden/disabled.
 */
const ROLE_DEFAULTS = {
  INVESTOR: {
    overview: true,
    portfolio: true,
    captable: true,
    modeler: true,
    documents: true,
    distributions: true,
    messages: true,
    profile: true,
    // Sub-features
    capitalAccount: true,
    downloadDocuments: true,
    signDocuments: true,
    viewWaterfall: true,
    exportData: true,
    mfa: true,
  },
  ADMIN: {
    dashboard: true,
    projects: true,
    investors: true,
    documents: true,
    inbox: true,
    signatures: true,
    finance: true,
    staff: true,
    groups: true,
    prospects: true,
    audit: true,
    settings: true,
    // Sub-features
    uploadDocuments: true,
    editKPIs: true,
    manageWaterfall: true,
    inviteUsers: true,
    deactivateUsers: true,
    viewAuditLog: true,
    exportData: true,
    bulkOperations: true,
  },
  GP: {
    dashboard: true,
    projects: true,
    investors: true,
    documents: true,
    inbox: true,
    signatures: true,
    finance: true,
    staff: false,         // GP can't manage staff by default
    groups: true,
    prospects: true,
    audit: true,
    settings: false,      // GP can't change system settings
    // Sub-features
    uploadDocuments: true,
    editKPIs: true,
    manageWaterfall: true,
    inviteUsers: false,
    deactivateUsers: false,
    viewAuditLog: true,
    exportData: true,
    bulkOperations: false,
  },
};

/**
 * Global feature flags (apply to all users regardless of role).
 * Use this to enable/disable features system-wide for staged rollouts.
 */
const GLOBAL_FLAGS = {
  mfa: true,              // MFA enabled system-wide
  prospectPortal: true,   // Public prospect portal enabled
  eSignatures: true,      // E-signature functionality enabled
  emailNotifications: true,
  financialModeler: true,
  multiClassWaterfall: true,
  clawbackCalculation: true,
  scheduledStatements: true,
  inboundEmail: true,
  darkMode: true,
};

/**
 * Get resolved feature flags for a user by userId.
 * Queries the database for the user's role and persisted overrides.
 * Priority: user override > role default > global flag
 *
 * @param {number} userId
 * @returns {object} { flags, overrides, role }
 */
async function getUserFlags(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user) return {};

  const roleDefaults = ROLE_DEFAULTS[user.role] || {};

  // Get persisted overrides from database
  const overrides = await prisma.featureFlagOverride.findMany({
    where: { userId },
  });
  const overrideMap = {};
  for (const o of overrides) {
    overrideMap[o.flagKey] = o.value;
  }

  // Merge: override > role default > global default
  const merged = { ...GLOBAL_FLAGS };
  for (const [key, val] of Object.entries(roleDefaults)) {
    merged[key] = val;
  }
  for (const [key, val] of Object.entries(overrideMap)) {
    merged[key] = val;
  }

  return { flags: merged, overrides: overrideMap, role: user.role };
}

/**
 * Get resolved feature flags for a user object (convenience wrapper).
 * Priority: user override > role default > global flag
 *
 * @param {object} user - { id, role, featureFlags? }
 * @returns {object} merged feature flags
 */
async function getFlagsForUser(user) {
  if (!user) return {};

  const result = await getUserFlags(user.id);
  if (!result.flags) return {};

  const merged = { ...result.flags };

  // If user has DB-stored flags on the user object, apply those too
  if (user.featureFlags && typeof user.featureFlags === 'object') {
    Object.assign(merged, user.featureFlags);
  }

  return merged;
}

/**
 * Set feature flag override for a specific user (single flag).
 */
async function setUserFlag(userId, flagName, value) {
  await prisma.featureFlagOverride.upsert({
    where: { userId_flagKey: { userId, flagKey: flagName } },
    create: { userId, flagKey: flagName, value: !!value },
    update: { value: !!value },
  });
}

/**
 * Remove feature flag override for a user (revert to role default).
 */
async function clearUserFlag(userId, flagName) {
  await prisma.featureFlagOverride.deleteMany({
    where: { userId, flagKey: flagName },
  });
}

/**
 * Set multiple flags for a user at once. Persists each to the database.
 */
async function setUserFlags(userId, flags) {
  for (const [key, value] of Object.entries(flags)) {
    await prisma.featureFlagOverride.upsert({
      where: { userId_flagKey: { userId, flagKey: key } },
      create: { userId, flagKey: key, value: !!value },
      update: { value: !!value },
    });
  }
  return getUserFlags(userId);
}

/**
 * Get all overrides for a user (for admin display).
 */
async function getUserOverrides(userId) {
  const overrides = await prisma.featureFlagOverride.findMany({
    where: { userId },
  });
  const overrideMap = {};
  for (const o of overrides) {
    overrideMap[o.flagKey] = o.value;
  }
  return overrideMap;
}

/**
 * Check if a specific feature is enabled for a user.
 */
async function isEnabled(user, flagName) {
  const flags = await getFlagsForUser(user);
  return flags[flagName] === true;
}

/**
 * Filter nav items based on user's feature flags.
 * Returns only the items the user has access to.
 */
async function filterNavItems(user, navItems) {
  const flags = await getFlagsForUser(user);
  return navItems.filter(item => flags[item.id] !== false);
}

module.exports = {
  getFlagsForUser,
  getUserFlags,
  setUserFlag,
  clearUserFlag,
  setUserFlags,
  getUserOverrides,
  isEnabled,
  filterNavItems,
  ROLE_DEFAULTS,
  GLOBAL_FLAGS,
};
