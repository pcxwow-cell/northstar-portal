// ─── FEATURE FLAGS SERVICE ───────────────────────────────
// Controls which features/menus are visible per user, role, or project.
// Flags can be set globally, per role, per user, or per project.

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

// In-memory overrides (per-user). In production, store in DB.
const userOverrides = new Map();

/**
 * Get resolved feature flags for a user.
 * Priority: user override > role default > global flag
 *
 * @param {object} user - { id, role, featureFlags? }
 * @returns {object} merged feature flags
 */
function getFlagsForUser(user) {
  if (!user) return {};

  const roleDefaults = ROLE_DEFAULTS[user.role] || ROLE_DEFAULTS.INVESTOR;
  const overrides = userOverrides.get(user.id) || {};

  // Merge: global → role → user overrides
  const merged = { ...GLOBAL_FLAGS, ...roleDefaults, ...overrides };

  // If user has DB-stored flags, apply those too
  if (user.featureFlags && typeof user.featureFlags === 'object') {
    Object.assign(merged, user.featureFlags);
  }

  return merged;
}

/**
 * Set feature flag override for a specific user.
 */
function setUserFlag(userId, flagName, value) {
  if (!userOverrides.has(userId)) {
    userOverrides.set(userId, {});
  }
  userOverrides.get(userId)[flagName] = value;
}

/**
 * Remove feature flag override for a user (revert to role default).
 */
function clearUserFlag(userId, flagName) {
  const overrides = userOverrides.get(userId);
  if (overrides) {
    delete overrides[flagName];
    if (Object.keys(overrides).length === 0) {
      userOverrides.delete(userId);
    }
  }
}

/**
 * Set multiple flags for a user at once.
 */
function setUserFlags(userId, flags) {
  const current = userOverrides.get(userId) || {};
  userOverrides.set(userId, { ...current, ...flags });
}

/**
 * Get all overrides for a user (for admin display).
 */
function getUserOverrides(userId) {
  return userOverrides.get(userId) || {};
}

/**
 * Check if a specific feature is enabled for a user.
 */
function isEnabled(user, flagName) {
  const flags = getFlagsForUser(user);
  return flags[flagName] === true;
}

/**
 * Filter nav items based on user's feature flags.
 * Returns only the items the user has access to.
 */
function filterNavItems(user, navItems) {
  const flags = getFlagsForUser(user);
  return navItems.filter(item => flags[item.id] !== false);
}

module.exports = {
  getFlagsForUser,
  setUserFlag,
  clearUserFlag,
  setUserFlags,
  getUserOverrides,
  isEnabled,
  filterNavItems,
  ROLE_DEFAULTS,
  GLOBAL_FLAGS,
};
