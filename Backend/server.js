// Backend/server.js
const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const app = express();
app.use(express.json());

// CORS: allow only FRONTEND_URL if provided, otherwise allow all (use '*' only for quick testing)
const FRONTEND_URL = process.env.FRONTEND_URL || process.env.VITE_FRONTEND_URL || null;
if (FRONTEND_URL) {
  app.use(cors({ origin: FRONTEND_URL }));
  console.log("CORS configured for origin:", FRONTEND_URL);
} else {
  app.use(cors());
  console.log("CORS configured: allowing all origins (not recommended for production)");
}

// --- Connect MongoDB ---
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGOURL || "mongodb://localhost:27017/ai_rfp";
mongoose
  .connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => {
    console.error("MongoDB connect error:", err);
    // don't exit - allow app to continue (so Render logs show the error)
  });

// --- Route wiring ---
// try to load routers safely (support common filename variants)
try {
  const rfpRouter = require("./routes/rfp");
  app.use("/api/rfps", rfpRouter);
  console.log("Loaded routes: /api/rfps -> ./routes/rfp");
} catch (err) {
  console.error("Failed to load ./routes/rfp:", err.message || err);
}

try {
  // attempt plural 'vendors' first, then singular 'vendor'
  let vendorRouter;
  try {
    vendorRouter = require("./routes/vendors");
    console.log("Loaded routes: /api/vendors -> ./routes/vendors");
  } catch (_) {
    vendorRouter = require("./routes/vendor");
    console.log("Loaded routes: /api/vendors -> ./routes/vendor");
  }
  app.use("/api/vendors", vendorRouter);
} catch (err) {
  console.error("Failed to load vendor routes (./routes/vendors or ./routes/vendor):", err.message || err);
}

// health
app.get("/api/health", (req, res) => res.json({ ok: true }));

// static / catch-all for production (optional)
// If you want to serve the built frontend from the same service, build the frontend into Backend/../Frontend/dist
// and uncomment the lines below.
// const frontendDist = path.join(__dirname, "../Frontend/dist");
// if (process.env.SERVE_FRONTEND === "true" && require("fs").existsSync(frontendDist)) {
//   app.use(express.static(frontendDist));
//   app.get("*", (req, res) => res.sendFile(path.join(frontendDist, "index.html")));
//   console.log("Serving frontend from:", frontendDist);
// }

// Graceful process handling & unhandled rejections
process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED REJECTION:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
});

// Start server
const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => console.log(`Backend listening at ${PORT}`));
