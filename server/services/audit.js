const prisma = require("../prisma");

/**
 * Log an auditable action.
 * @param {object} req - Express request (for userId, IP, user-agent)
 * @param {string} action - Action identifier (login, document_download, etc.)
 * @param {string|null} resource - Resource identifier ("document:15", "project:2")
 * @param {object|null} details - Extra context (will be JSON-stringified)
 */
async function log(req, action, resource = null, details = null) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: req?.user?.id || null,
        action,
        resource: resource || null,
        details: details ? JSON.stringify(details) : null,
        ipAddress: req?.ip || req?.connection?.remoteAddress || null,
        userAgent: req?.headers?.["user-agent"]?.substring(0, 512) || null,
      },
    });
  } catch (err) {
    // Never let audit logging break the main request
    console.error("Audit log error:", err.message);
  }
}

module.exports = { log };
