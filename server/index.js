require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const { rateLimit, securityHeaders } = require("./middleware/security");

const app = express();
const PORT = process.env.PORT || process.env.API_PORT || 3001;

// ─── Security headers on all routes ───
app.use(securityHeaders);

// Middleware
// CORS: use CORS_ORIGINS env var in production, localhost defaults for dev
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map(s => s.trim())
  : ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:3003"];
app.use(cors({
  origin: process.env.NODE_ENV === "production" && !process.env.CORS_ORIGINS
    ? true // single-origin Docker deploy — frontend served from same Express server
    : corsOrigins,
  credentials: true,
}));
app.use(express.json());

// Dev request logger
if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });
}

const { authenticate } = require("./middleware/auth");

// ─── Inbound email webhook (no auth — verified by reply-to token HMAC) ───
// The main POST / handler has no auth; the POST /test handler checks req.user internally.
const inboundEmailRouter = require("./routes/inbound-email");
app.use("/api/v1/email/inbound", express.urlencoded({ extended: true }), inboundEmailRouter);

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
app.use("/api/v1/features", authenticate, require("./routes/features"));
app.use("/api/v1/statements", authenticate, require("./routes/statements"));
app.use("/api/v1", authenticate, require("./routes/entities"));

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

// Error tracking (sends to Sentry if SENTRY_DSN is set, otherwise logs)
const { errorTrackingMiddleware } = require("./services/errorTracking");
app.use(errorTrackingMiddleware);

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Northstar API running on http://localhost:${PORT}`);
  });
}

module.exports = app;
