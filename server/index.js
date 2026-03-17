require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.API_PORT || 3001;

// Middleware
app.use(cors({ origin: ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"] }));
app.use(express.json());

// Dev request logger
if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });
}

const { authenticate } = require("./middleware/auth");

// Public routes
app.use("/api/v1/auth", require("./routes/auth"));

// Protected routes (require valid JWT)
app.use("/api/v1/projects", authenticate, require("./routes/projects"));
app.use("/api/v1/investors", authenticate, require("./routes/investors"));
app.use("/api/v1/documents", authenticate, require("./routes/documents"));
app.use("/api/v1/distributions", authenticate, require("./routes/distributions"));
app.use("/api/v1/messages", authenticate, require("./routes/messages"));
app.use("/api/v1/admin", authenticate, require("./routes/admin"));

// Serve uploaded files (local storage only — S3 uses signed URLs)
app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));

// Health check
app.get("/api/v1/health", (req, res) => res.json({ status: "ok" }));

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
