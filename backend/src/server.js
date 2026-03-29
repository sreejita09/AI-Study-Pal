const app = require("./app");
const connectDb = require("./config/db");
const env = require("./config/env");
const { runDailyNotifications } = require("./services/notification.service");

/** Schedule notification checks every 4 hours. */
function scheduleDailyNotifications() {
  const INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours

  // Run immediately on startup, then every 4h
  setTimeout(async () => {
    await runDailyNotifications();
  }, 10_000); // 10s after boot to let DB warm up

  setInterval(async () => {
    await runDailyNotifications();
  }, INTERVAL_MS);

  console.log(`[notifications] Scheduled to run every 4 hours`);
}

async function start() {
  try {
    await connectDb();
    app.listen(env.port, () => {
      console.log(`Backend listening on http://localhost:${env.port}`);
    });
    scheduleDailyNotifications();
  } catch (error) {
    console.error("Failed to start backend", error);
    process.exit(1);
  }
}

start();
