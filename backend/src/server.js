require("dotenv").config();

const app = require("./app");
const connectDb = require("./config/db");
const env = require("./config/env");

// Global error handlers — prevent silent crashes
process.on("uncaughtException", (err) => {
  console.error("[uncaughtException]", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason);
  process.exit(1);
});

/** Schedule notification checks every 4 hours. */
function scheduleDailyNotifications() {
  const INTERVAL_MS = 4 * 60 * 60 * 1000;

  setTimeout(async () => {
    try {
      const { runDailyNotifications } = require("./services/notification.service");
      await runDailyNotifications();
    } catch (err) {
      console.error("[notifications] Error:", err.message);
    }
  }, 10_000);

  setInterval(async () => {
    try {
      const { runDailyNotifications } = require("./services/notification.service");
      await runDailyNotifications();
    } catch (err) {
      console.error("[notifications] Error:", err.message);
    }
  }, INTERVAL_MS);

  console.log("[notifications] Scheduled every 4 hours");
}

async function start() {
  try {
    await connectDb();

    const PORT = env.port || process.env.PORT || 5000;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });

    scheduleDailyNotifications();
  } catch (error) {
    console.error("[startup] Failed to start server:", error.message);
    console.error(error);
    process.exit(1);
  }
}

start();
