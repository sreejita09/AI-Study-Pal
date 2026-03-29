const mongoose = require("mongoose");

const LearningProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },
    history: {
      completedLessons: { type: Number, default: 18 },
      activeModules: { type: Number, default: 4 },
      hoursSpent: { type: Number, default: 42 },
      nextReviewAt: Date
    },
    weakTopics: {
      type: [String],
      default: ["Typography", "Interaction Patterns"]
    },
    recommendationQueue: {
      type: [String],
      default: ["Interaction Design", "Usability Testing", "Design Systems"]
    },
    taskChecklist: {
      type: [
        {
          id: String,
          label: String,
          complete: Boolean
        }
      ],
      default: [
        { id: "site-map", label: "Site Map", complete: false },
        { id: "mood-board", label: "Mood Board", complete: false }
      ]
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("LearningProfile", LearningProfileSchema);
