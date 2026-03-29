const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const morgan = require("morgan");
const authRoutes = require("./routes/auth.routes");
const uploadRoutes = require("./routes/upload.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const aiRoutes = require("./routes/ai.routes");
const materialRoutes = require("./routes/material.routes");
const planRoutes = require("./routes/plan.routes");
const studyRoutes = require("./routes/study.routes");
const progressRoutes = require("./routes/progress.routes");
const testEmailRoutes = require("./routes/test-email.routes");
const notificationRoutes = require("./routes/notification.routes");
const historyRoutes = require("./routes/history.routes");
const supportRoutes = require("./routes/support.routes");
const { apiLimiter } = require("./middleware/rateLimit.middleware");
const { notFound, errorHandler } = require("./middleware/error.middleware");

// ---------------------------------------------------------------------------
// CORS configuration
// CLIENT_URL should be set to the Vercel frontend URL on Render.
// Falls back to the known production URL so the app works even before the
// env var is configured.
// ---------------------------------------------------------------------------
const KNOWN_PRODUCTION_ORIGIN = "https://ai-study-pal-eight.vercel.app";
const CLIENT_URL = process.env.CLIENT_URL || KNOWN_PRODUCTION_ORIGIN;

if (!process.env.CLIENT_URL) {
  console.warn(
    `[CORS] CLIENT_URL env var not set — falling back to ${KNOWN_PRODUCTION_ORIGIN}. ` +
    "Set CLIENT_URL on Render to silence this warning."
  );
}

console.log(`[CORS] Allowed origin: ${CLIENT_URL}`);

const allowedOrigins = new Set([
  CLIENT_URL,
  KNOWN_PRODUCTION_ORIGIN, // always allow the deployed frontend
]);

const corsOptions = {
  origin(origin, callback) {
    console.log(`[CORS] request origin: ${origin || "(none — Postman/curl/mobile)"}`);

    // No origin header → Postman / curl / server-to-server / mobile — allow
    if (!origin) return callback(null, true);

    // localhost (any port) — allow for local development
    if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return callback(null, true);

    if (allowedOrigins.has(origin)) return callback(null, true);

    console.warn(`[CORS] Blocked unknown origin: ${origin}`);
    // Pass false — cors will suppress CORS headers but NOT throw → no 500
    callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  // 200 instead of default 204 — some older browsers reject 204 on preflight
  optionsSuccessStatus: 200,
};

const app = express();

// ---------------------------------------------------------------------------
// Middleware order — strictly enforced
// ---------------------------------------------------------------------------

// STEP 1 — Preflight handler: must be absolute first, before helmet and everything.
// Two-handler chain: cors() sets headers (or skips), then our explicit handler
// sends 200. This guarantees OPTIONS NEVER falls through to route handlers.
app.options("*", cors(corsOptions), (_req, res) => res.sendStatus(200));

// STEP 2 — Apply CORS headers to all non-OPTIONS requests
app.use(cors(corsOptions));

// STEP 3 — Security headers (after CORS so preflight isn't affected)
app.use(helmet({ crossOriginResourcePolicy: false }));

// STEP 4 — Logging
app.use(morgan("dev"));

// STEP 5 — Body parsing
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// STEP 6 — Rate limiting (OPTIONS never reaches here due to step 1)
app.use(apiLimiter);

// Root route — used by Render as a health check
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "API is running" });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});


app.use("/api/auth", authRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/materials", materialRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/study", studyRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/support", supportRoutes);
app.use("/api", testEmailRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
