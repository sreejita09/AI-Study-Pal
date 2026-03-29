// Load env vars first — before any other require
require("dotenv").config();

// Register global handlers immediately so module-load crashes are visible
process.on("uncaughtException", (err) => {
  console.error("[uncaughtException]", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason);
  process.exit(1);
});

const app = require("./app");
const connectDb = require("./config/db");

const PORT = process.env.PORT || 5000;

/** Schedule notification checks every 4 hours (lazy-loaded, non-fatal). */
function scheduleDailyNotifications() {
  const INTERVAL_MS = 4 * 60 * 60 * 1000;

  const run = async () => {
    try {
      const { runDailyNotifications } = require("./services/notification.service");
      await runDailyNotifications();
    } catch (err) {
      console.error("[notifications] Error:", err.message);
    }
  };

  setTimeout(run, 10_000);
  setInterval(run, INTERVAL_MS);
  console.log("[notifications] Scheduled every 4 hours");
}

async function start() {
  try {
    console.log("[startup] Connecting to MongoDB...");
    await connectDb();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`[startup] Server running on port ${PORT}`);
    });

    scheduleDailyNotifications();
  } catch (err) {
    console.error("[startup] FATAL — server failed to start:");
    console.error(err);
    process.exit(1);
  }
}

start();
