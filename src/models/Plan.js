const mongoose = require("mongoose");

const PlanSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, default: "Study Plan", trim: true },
    mode: {
      type: String,
      enum: ["auto", "custom", "finish_today"],
      default: "auto",
    },
    totalHours: { type: Number, required: true },
    days: { type: Number, default: 1 },
    startDate: { type: String }, // "YYYY-MM-DD"
    materials: [{ type: mongoose.Schema.Types.ObjectId, ref: "Material" }],
    // For custom mode: per-day hour allocations
    dailyHours: { type: [Number], default: [] }, // e.g. [3, 1, 2, 4]
    status: {
      type: String,
      enum: ["active", "completed", "archived"],
      default: "active",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Plan", PlanSchema);
