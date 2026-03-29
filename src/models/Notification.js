const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    message: { type: String, required: true, maxlength: 200 },
    type: {
      type: String,
      enum: ["reminder", "warning", "streak", "achievement"],
      required: true,
    },
    read: { type: Boolean, default: false },
    // Deduplication: one notification of each type per day per user
    dedupKey: { type: String, default: "" }, // e.g. "reminder:2026-03-27"
  },
  { timestamps: true }
);

// TTL: auto-delete notifications older than 30 days
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// Compound index for dedup check
NotificationSchema.index({ user: 1, dedupKey: 1 }, { sparse: true });

module.exports = mongoose.model("Notification", NotificationSchema);
