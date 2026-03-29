const path = require("path");
const dotenv = require("dotenv");

// Load from backend/.env locally; on Render env vars are injected directly.
dotenv.config({ path: path.join(__dirname, "../../.env") });

function normalizeSecret(value) {
  return String(value || "").trim().replace(/[\s.]+/g, "");
}

// ── Required env vars — server refuses to start if any are missing ──────────
const REQUIRED = ["MONGO_URI", "JWT_SECRET"];

function validateEnv() {
  const missing = REQUIRED.filter((key) => !process.env[key] || process.env[key].trim() === "");
  if (missing.length > 0) {
    console.error(
      `\n[env] FATAL: Missing required environment variables:\n  ${missing.join("\n  ")}\n` +
      `Set them in backend/.env (local) or Render Environment Variables (production).\n`
    );
    process.exit(1);
  }

  // Warn (don't crash) if optional high-value vars are absent
  const optional = ["OPENAI_API_KEY", "SMTP_USER", "SMTP_PASS", "CLIENT_URL"];
  const absent = optional.filter((k) => !process.env[k]);
  if (absent.length > 0) {
    console.warn(
      `[env] Warning: Optional env vars not set (some features will be disabled): ${absent.join(", ")}`
    );
  }
}

validateEnv();

const env = {
  port: Number(process.env.PORT || 5000),
  // CLIENT_URL → primary allowed origin (set in Render env vars to your Vercel URL)
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  // MONGO_URI is the Render-standard name; MONGODB_URI is accepted as alias
  mongoUri:
    process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/ai-study-pal",
  // JWT_SECRET must be set — no insecure fallback
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  cookieName: process.env.COOKIE_NAME || "aistudypal_token",
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpSecure: process.env.SMTP_SECURE === "true",
  smtpUser: String(process.env.SMTP_USER || "").trim(),
  smtpPass: normalizeSecret(process.env.SMTP_PASS),
  mailFrom: process.env.MAIL_FROM || "",
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  isProduction: process.env.NODE_ENV === "production"
};

module.exports = env;
