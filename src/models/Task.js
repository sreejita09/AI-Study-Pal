const mongoose = require("mongoose");

const TaskSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: "Plan", required: true },
    material: { type: mongoose.Schema.Types.ObjectId, ref: "Material" },
    topic: { type: String, required: true },
    allocatedMinutes: { type: Number, default: 30 },
    difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "medium" },
    priorityScore: { type: Number, default: 2 }, // hard=3, medium=2, easy=1
    energyLevel: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    timeSlot: { type: String, enum: ["morning", "afternoon", "evening"], default: "afternoon" },
    assignedDate: { type: String, default: null }, // "YYYY-MM-DD"
    dayIndex: { type: Number, default: 0 }, // order within assigned day
    status: {
      type: String,
      enum: ["pending", "done", "skipped"],
      default: "pending",
    },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Task", TaskSchema);
