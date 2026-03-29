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

// Read CLIENT_URL directly from process.env — do NOT fall back to localhost
// so a missing value is visible rather than silently blocked
const CLIENT_URL = process.env.CLIENT_URL;
if (!CLIENT_URL) {
  console.error(
    "[CORS] WARNING: CLIENT_URL env var is not set — " +
    "requests from the production frontend will be blocked. " +
    "Set CLIENT_URL=https://<your-vercel-app>.vercel.app on Render."
  );
}

const corsOptions = {
  origin: (origin, callback) => {
    // Log every incoming origin so Render logs make it obvious what's happening
    console.log(`[CORS] origin: ${origin || "(none — curl/Postman/mobile)"}`);

    // Allow requests with no origin (Postman, mobile apps, curl)
    if (!origin) return callback(null, true);

    const allowed = [
      /^https?:\/\/localhost(:\d+)?$/,   // any localhost port — dev only
      ...(CLIENT_URL ? [CLIENT_URL] : []),
    ];

    const ok = allowed.some((rule) =>
      rule instanceof RegExp ? rule.test(origin) : rule === origin
    );

    if (ok) return callback(null, true);

    // Return false (no Access-Control-Allow-Origin header) instead of throwing
    // an error — throwing causes Express to return 500 on OPTIONS preflight.
    console.warn(`[CORS] Blocked origin: ${origin}`);
    callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

const app = express();

app.use(helmet({ crossOriginResourcePolicy: false }));

// 1. Handle CORS preflight (OPTIONS) before anything else — prevents 500 on preflight
app.options("*", cors(corsOptions));

// 2. Apply CORS to all routes
app.use(cors(corsOptions));

app.use(morgan("dev"));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
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
