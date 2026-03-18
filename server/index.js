require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const { rateLimit, securityHeaders } = require("./middleware/security");

const app = express();
const PORT = process.env.API_PORT || 3001;

// ─── Security headers on all routes ───
app.use(securityHeaders);

// Middleware
app.use(cors({ origin: ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:3003"] }));
app.use(express.json());

// Dev request logger
if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });
}

const { authenticate } = require("./middleware/auth");

// ─── Rate-limited public routes ───
const authLimiter = rateLimit({ windowMs: 60000, max: 10 }); // 10 attempts per minute
const prospectLimiter = rateLimit({ windowMs: 60000, max: 5 }); // 5 submissions per minute

app.use("/api/v1/auth", authLimiter, require("./routes/auth"));
app.use("/api/v1/prospects", prospectLimiter, require("./routes/prospects"));

// Protected routes (require valid JWT)
app.use("/api/v1/projects", authenticate, require("./routes/projects"));
app.use("/api/v1/investors", authenticate, require("./routes/investors"));
app.use("/api/v1/documents", authenticate, require("./routes/documents"));
app.use("/api/v1/distributions", authenticate, require("./routes/distributions"));
app.use("/api/v1/messages", authenticate, require("./routes/messages"));
app.use("/api/v1/threads", authenticate, require("./routes/threads"));
app.use("/api/v1/signatures", authenticate, require("./routes/signatures"));
app.use("/api/v1/notifications", authenticate, require("./routes/notifications"));
app.use("/api/v1/admin", authenticate, require("./routes/admin"));
app.use("/api/v1/finance", authenticate, require("./routes/finance"));

// Serve uploaded files (local storage only — S3 uses signed URLs)
app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));

// Health check
app.get("/api/v1/health", (req, res) => res.json({ status: "ok" }));

// ─── Production: serve built frontend ───
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.resolve(__dirname, "../dist")));
  // SPA fallback — serve index.html for any non-API route
  app.get("*", (req, res) => {
    if (!req.url.startsWith("/api/")) {
      res.sendFile(path.resolve(__dirname, "../dist/index.html"));
    }
  });
}

// 404
app.use((req, res) => res.status(404).json({ error: "Not found" }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`Northstar API running on http://localhost:${PORT}`);
});
