const { Router } = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const prisma = require("../prisma");
const { signToken, signMfaToken, verifyMfaToken, authenticate } = require("../middleware/auth");
const audit = require("../services/audit");
const { validatePassword } = require("../services/password");
const mfa = require("../services/mfa");
const router = Router();

// POST /api/v1/auth/login
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Record login attempt (even for non-existent users, find userId if possible)
    const recordLogin = async (userId, success) => {
      try {
        await prisma.loginHistory.create({
          data: {
            userId,
            ip: req.ip || req.connection?.remoteAddress || null,
            userAgent: req.headers?.["user-agent"]?.substring(0, 512) || null,
            success,
          },
        });
      } catch (e) { console.error("Login history error:", e.message); }
    };

    if (!user || user.status !== "ACTIVE") {
      if (user) await recordLogin(user.id, false);
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      await recordLogin(user.id, false);
      return res.status(401).json({ error: "Invalid email or password" });
    }

    await recordLogin(user.id, true);

    // If MFA is enabled, return a temporary token and require MFA verification
    if (user.mfaEnabled) {
      const mfaToken = signMfaToken(user);
      return res.json({
        requiresMfa: true,
        userId: user.id,
        mfaToken,
      });
    }

    const token = signToken(user);
    audit.log(req, "login", `user:${user.id}`, { email: user.email, role: user.role });
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        initials: user.initials,
        email: user.email,
        role: user.role === "INVESTOR" ? "Limited Partner" : user.role,
      },
    });
  } catch (err) { next(err); }
});

// GET /api/v1/auth/me — get current user from token
router.get("/me", authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { investorProjects: { select: { projectId: true } } },
    });
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({
      id: user.id,
      name: user.name,
      initials: user.initials,
      email: user.email,
      role: user.role === "INVESTOR" ? "Limited Partner" : user.role,
      joined: user.joined,
      projectIds: user.investorProjects.map((ip) => ip.projectId),
    });
  } catch (err) { next(err); }
});

// PUT /api/v1/auth/profile — investor updates own profile
router.put("/profile", authenticate, async (req, res, next) => {
  try {
    const { name, email, initials } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(initials !== undefined && { initials }),
      },
    });
    audit.log(req, "profile_update", `user:${user.id}`, { name: user.name, email: user.email });
    res.json({ id: user.id, name: user.name, email: user.email, initials: user.initials });
  } catch (err) { next(err); }
});

// PUT /api/v1/auth/change-password — self-service password change
router.put("/change-password", authenticate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current password and new password are required" });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    // Validate new password strength
    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.errors.join(". ") });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash },
    });

    audit.log(req, "password_change", `user:${user.id}`, { email: user.email });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// POST /api/v1/auth/forgot-password
router.post("/forgot-password", async (req, res, next) => {
  try {
    const { email } = req.body;
    // Always return success (don't reveal if email exists)
    if (!email) return res.json({ success: true });

    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken, resetTokenExpiry },
      });

      // In production, send email via notification service
      const resetUrl = `${process.env.PORTAL_URL || "http://localhost:3003"}/#/reset-password?token=${resetToken}`;
      console.log(`[DEMO] Password reset link for ${user.email}: ${resetUrl}`);

      // Try to send email if service is configured
      try {
        const { passwordReset } = require("../services/email/templates");
        const emailService = require("../services/email");
        const template = passwordReset(user.name, resetUrl);
        await emailService.send({ to: user.email, ...template });
      } catch (e) {
        // Email service may not be configured — that's OK in demo mode
        console.log("[DEMO] Email service not available, reset token logged to console");
      }

      audit.log(req, "password_reset_request", `user:${user.id}`, { email: user.email });
    }

    res.json({ success: true });
  } catch (err) { next(err); }
});

// POST /api/v1/auth/reset-password
router.post("/reset-password", async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: "Token and new password are required" });
    }

    const user = await prisma.user.findFirst({
      where: { resetToken: token },
    });

    if (!user || !user.resetTokenExpiry || new Date() > user.resetTokenExpiry) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    // Validate new password strength
    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.errors.join(". ") });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, resetToken: null, resetTokenExpiry: null },
    });

    audit.log(req, "password_reset_complete", `user:${user.id}`, { email: user.email });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// GET /api/v1/auth/login-history — last 20 login records for current user
router.get("/login-history", authenticate, async (req, res, next) => {
  try {
    const records = await prisma.loginHistory.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    res.json(records.map(r => ({
      id: r.id,
      ip: r.ip,
      userAgent: r.userAgent,
      success: r.success,
      createdAt: r.createdAt,
    })));
  } catch (err) { next(err); }
});

// POST /api/v1/auth/logout — client-side token deletion, server just acknowledges
router.post("/logout", (req, res) => {
  audit.log(req, "logout", null, null);
  res.json({ message: "Logged out" });
});

// ─── MFA ROUTES ─────────────────────────────────────────

// GET /api/v1/auth/mfa/status — check if MFA is enabled for current user
router.get("/mfa/status", authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ mfaEnabled: user.mfaEnabled });
  } catch (err) { next(err); }
});

// POST /api/v1/auth/mfa/setup — generate MFA secret + QR code
router.post("/mfa/setup", authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.mfaEnabled) return res.status(400).json({ error: "MFA is already enabled" });

    const { secret, otpauthUri, qrCodeDataUrl } = await mfa.generateSecret(user.email);

    // Store secret (not yet enabled — user must verify first)
    await prisma.user.update({
      where: { id: user.id },
      data: { mfaSecret: secret },
    });

    audit.log(req, "mfa_setup_initiated", `user:${user.id}`, { email: user.email });
    res.json({ secret, otpauthUri, qrCodeDataUrl });
  } catch (err) { next(err); }
});

// POST /api/v1/auth/mfa/verify-setup — verify token and enable MFA
router.post("/mfa/verify-setup", authenticate, async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "Verification code is required" });

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (!user.mfaSecret) return res.status(400).json({ error: "MFA setup not initiated" });
    if (user.mfaEnabled) return res.status(400).json({ error: "MFA is already enabled" });

    const valid = mfa.verifyToken(token, user.mfaSecret);
    if (!valid) return res.status(400).json({ error: "Invalid verification code" });

    // Generate backup codes
    const { codes, hashed } = mfa.generateBackupCodes();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        mfaEnabled: true,
        mfaBackupCodes: JSON.stringify(hashed),
      },
    });

    audit.log(req, "mfa_enabled", `user:${user.id}`, { email: user.email });
    res.json({ success: true, backupCodes: codes });
  } catch (err) { next(err); }
});

// POST /api/v1/auth/mfa/verify — verify MFA token during login
router.post("/mfa/verify", async (req, res, next) => {
  try {
    const { token, userId, mfaToken } = req.body;
    if (!token || !userId || !mfaToken) {
      return res.status(400).json({ error: "Token, userId, and mfaToken are required" });
    }

    // Verify the temporary MFA token
    const payload = verifyMfaToken(mfaToken);
    if (!payload || payload.id !== userId) {
      return res.status(401).json({ error: "Invalid or expired MFA session" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.mfaEnabled) {
      return res.status(400).json({ error: "MFA not enabled for this user" });
    }

    // Try TOTP token first
    let valid = mfa.verifyToken(token, user.mfaSecret);

    // If not valid, try as a backup code
    if (!valid && user.mfaBackupCodes) {
      const hashedCodes = JSON.parse(user.mfaBackupCodes);
      const idx = mfa.verifyBackupCode(token, hashedCodes);
      if (idx >= 0) {
        valid = true;
        // Remove used backup code
        hashedCodes.splice(idx, 1);
        await prisma.user.update({
          where: { id: user.id },
          data: { mfaBackupCodes: JSON.stringify(hashedCodes) },
        });
      }
    }

    if (!valid) {
      return res.status(401).json({ error: "Invalid verification code" });
    }

    const fullToken = signToken(user);
    audit.log(req, "login", `user:${user.id}`, { email: user.email, role: user.role, mfa: true });
    res.json({
      token: fullToken,
      user: {
        id: user.id,
        name: user.name,
        initials: user.initials,
        email: user.email,
        role: user.role === "INVESTOR" ? "Limited Partner" : user.role,
      },
    });
  } catch (err) { next(err); }
});

// DELETE /api/v1/auth/mfa/disable — disable MFA (requires password)
router.delete("/mfa/disable", authenticate, async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: "Password is required" });

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: "Invalid password" });

    await prisma.user.update({
      where: { id: user.id },
      data: { mfaEnabled: false, mfaSecret: null, mfaBackupCodes: null },
    });

    audit.log(req, "mfa_disabled", `user:${user.id}`, { email: user.email });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// POST /api/v1/auth/mfa/regenerate-backup — regenerate backup codes
router.post("/mfa/regenerate-backup", authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (!user.mfaEnabled) return res.status(400).json({ error: "MFA is not enabled" });

    const { codes, hashed } = mfa.generateBackupCodes();
    await prisma.user.update({
      where: { id: user.id },
      data: { mfaBackupCodes: JSON.stringify(hashed) },
    });

    audit.log(req, "mfa_backup_regenerated", `user:${user.id}`, { email: user.email });
    res.json({ backupCodes: codes });
  } catch (err) { next(err); }
});

module.exports = router;
