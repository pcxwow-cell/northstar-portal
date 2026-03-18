const { Router } = require("express");
const bcrypt = require("bcryptjs");
const prisma = require("../prisma");
const { signToken, authenticate } = require("../middleware/auth");
const audit = require("../services/audit");
const router = Router();

// POST /api/v1/auth/login
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.status !== "ACTIVE") {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
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

// POST /api/v1/auth/logout — client-side token deletion, server just acknowledges
router.post("/logout", (req, res) => {
  audit.log(req, "logout", null, null);
  res.json({ message: "Logged out" });
});

module.exports = router;
