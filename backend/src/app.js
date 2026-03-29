const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const morgan = require("morgan");
const env = require("./config/env");
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

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: false
  })
);
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, mobile)
      if (!origin) return callback(null, true);
      const allowed = [
        // Any localhost port (development)
        /^https?:\/\/localhost(:\d+)?$/,
        // Production frontend URL set via CLIENT_URL env var on Render
        ...(env.clientUrl ? [env.clientUrl] : []),
      ];
      const ok = allowed.some((rule) =>
        rule instanceof RegExp ? rule.test(origin) : rule === origin
      );
      if (ok) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  })
);
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
