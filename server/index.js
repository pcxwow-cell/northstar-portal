require("dotenv").config();
const express = require("express");
const cors = require("cors");

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

// Routes
app.use("/api/v1/projects", require("./routes/projects"));
app.use("/api/v1/investors", require("./routes/investors"));
app.use("/api/v1/documents", require("./routes/documents"));
app.use("/api/v1/distributions", require("./routes/distributions"));
app.use("/api/v1/messages", require("./routes/messages"));

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
