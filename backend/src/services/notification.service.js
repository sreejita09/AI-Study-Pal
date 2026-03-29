/**
 * Notification Service
 * Checks user activity and creates site + optional email notifications.
 * Max 1 notification per type per user per day (dedupKey).
 */
const Notification = require("../models/Notification");
const User = require("../models/User");
const Task = require("../models/Task");
const { sendMail } = require("./email/email.service");

/** Return YYYY-MM-DD for a Date (local ISO string date part) */
function dateStr(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function yesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dateStr(d);
}

/**
 * Create a notification for a user if one of the same dedupKey doesn't exist today.
 * @returns {Notification|null}
 */
async function createIfNew(userId, type, message) {
  const key = `${type}:${dateStr()}`;
  const exists = await Notification.findOne({ user: userId, dedupKey: key });
  if (exists) return null;

  return Notification.create({
    user: userId,
    type,
    message,
    dedupKey: key,
  });
}

/**
 * Send a brief email notification (fire-and-forget — never throws).
 */
async function sendEmailIfEnabled(user, subject, message) {
  if (!user.preferences?.emailNotifications) return;
  if (!user.email) return;
  try {
    await sendMail({
      to: user.email,
      subject: `AI Study Pal: ${subject}`,
      html: `
        <div style="background:#111;padding:28px;font-family:Arial,sans-serif;color:#f5f5f5">
          <div style="max-width:500px;margin:0 auto;background:#1b1b1b;border:1px solid #2a2a2a;border-radius:16px;padding:24px">
            <p style="color:#facc15;font-size:11px;letter-spacing:.15em;text-transform:uppercase;margin:0 0 12px">AI Study Pal</p>
            <p style="margin:0;font-size:15px;line-height:1.6;">${message}</p>
            <p style="margin:16px 0 0;font-size:12px;color:#888;">
              You can disable email notifications in your dashboard settings.
            </p>
          </div>
        </div>
      `,
    });
  } catch (err) {
    console.error("[notifications] Email send failed:", err.message);
  }
}

/**
 * Run all notification checks for a single user.
 * Called by the daily cron and can also be called on demand.
 */
async function checkUserNotifications(user) {
  const today = dateStr();
  const yday = yesterday();
  const userId = user._id;

  // ── 1. Reminder: pending tasks due today ────────────────────────────────
  const pendingToday = await Task.countDocuments({
    user: userId,
    assignedDate: today,
    status: "pending",
  });

  if (pendingToday > 0) {
    const msg =
      pendingToday === 1
        ? "You have 1 pending task today. Let's keep the momentum going!"
        : `You have ${pendingToday} pending tasks today — don't let them pile up!`;

    const notif = await createIfNew(userId, "reminder", msg);
    if (notif) {
      await sendEmailIfEnabled(user, "Tasks waiting for you today", msg);
    }
  }

  // ── 2. Warning: missed tasks yesterday ──────────────────────────────────
  const missedYesterday = await Task.countDocuments({
    user: userId,
    assignedDate: yday,
    status: "pending",
  });

  if (missedYesterday > 0) {
    const msg = `You missed ${missedYesterday} task${missedYesterday > 1 ? "s" : ""} yesterday. Get back on track today!`;
    const notif = await createIfNew(userId, "warning", msg);
    if (notif) {
      await sendEmailIfEnabled(user, "Missed tasks from yesterday", msg);
    }
  }

  // ── 3. Achievement: all today's tasks done ─────────────────────────────
  const doneToday = await Task.countDocuments({
    user: userId,
    assignedDate: today,
    status: "done",
  });
  const totalToday = pendingToday + doneToday;
  if (totalToday > 0 && pendingToday === 0) {
    const msg = "Great job finishing today's plan! Keep the momentum going.";
    const notif = await createIfNew(userId, "achievement", msg);
    if (notif) {
      await sendEmailIfEnabled(user, "You completed today's plan!", msg);
    }
  }

  // ── 4. Streak: streak at risk ────────────────────────────────────────────
  const streak = user.learningStats?.currentStreak || 0;
  const lastActive = user.learningStats?.lastActiveDate || "";

  // Streak at risk: user has a streak ≥ 2 but wasn't active yesterday
  if (streak >= 2 && lastActive && lastActive < today && lastActive !== yday) {
    const msg = `Your ${streak}-day study streak is at risk! Complete a task today to keep it alive.`;
    const notif = await createIfNew(userId, "streak", msg);
    if (notif) {
      await sendEmailIfEnabled(user, "Your streak is at risk!", msg);
    }
  }
}

/**
 * Run notification checks for ALL users with plans.
 * Called once daily by the cron scheduler.
 */
async function runDailyNotifications() {
  console.log("[notifications] Running daily notification check...");
  try {
    // Only process users who have tasks (active learners)
    const activeUserIds = await Task.distinct("user");
    if (!activeUserIds.length) {
      console.log("[notifications] No active users found.");
      return;
    }

    const users = await User.find({ _id: { $in: activeUserIds } })
      .select("email username learningStats preferences");

    let created = 0;
    for (const user of users) {
      try {
        const before = await Notification.countDocuments({ user: user._id });
        await checkUserNotifications(user);
        const after = await Notification.countDocuments({ user: user._id });
        created += after - before;
      } catch (err) {
        console.error(`[notifications] Failed for user ${user._id}:`, err.message);
      }
    }

    console.log(`[notifications] Done — ${created} new notifications created for ${users.length} users.`);
  } catch (err) {
    console.error("[notifications] Daily run failed:", err.message);
  }
}

module.exports = { checkUserNotifications, runDailyNotifications, createIfNew };
