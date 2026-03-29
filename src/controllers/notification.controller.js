const asyncHandler = require("../utils/asyncHandler");
const Notification = require("../models/Notification");
const User = require("../models/User");
const { checkUserNotifications } = require("../services/notification.service");

/**
 * GET /api/notifications
 * Returns the latest 20 notifications for the authenticated user.
 */
const listNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  const unreadCount = notifications.filter((n) => !n.read).length;

  res.json({ notifications, unreadCount });
});

/**
 * PATCH /api/notifications/read/:id
 * Mark a single notification as read.
 */
const markRead = asyncHandler(async (req, res) => {
  const notif = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { read: true },
    { new: true }
  );

  if (!notif) return res.status(404).json({ error: "Notification not found" });
  res.json({ notification: notif });
});

/**
 * POST /api/notifications/read-all
 * Mark all notifications as read for the current user.
 */
const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  res.json({ success: true });
});

/**
 * POST /api/notifications/check
 * Manually trigger a notification check for the current user (for testing / on-login hook).
 */
const triggerCheck = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("email username learningStats preferences");
  await checkUserNotifications(user);
  const notifications = await Notification.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();
  const unreadCount = notifications.filter((n) => !n.read).length;
  res.json({ notifications, unreadCount });
});

/**
 * PATCH /api/notifications/settings
 * Toggle email notifications on/off for the current user.
 */
const updateSettings = asyncHandler(async (req, res) => {
  const { emailNotifications } = req.body;
  if (typeof emailNotifications !== "boolean") {
    return res.status(400).json({ error: "emailNotifications must be a boolean" });
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { "preferences.emailNotifications": emailNotifications },
    { new: true }
  ).select("preferences");

  res.json({ emailNotifications: user.preferences.emailNotifications });
});

module.exports = { listNotifications, markRead, markAllRead, triggerCheck, updateSettings };
