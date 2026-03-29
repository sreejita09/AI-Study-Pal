const mongoose = require("mongoose");

const TopicStatSchema = new mongoose.Schema(
  {
    topic: { type: String, required: true },
    mastery: { type: Number, default: 0.35, min: 0, max: 1 },
    weakSpotScore: { type: Number, default: 0.65, min: 0, max: 1 },
    lastReviewedAt: Date,
    recommendedDifficulty: {
      type: String,
      enum: ["foundation", "core", "challenge"],
      default: "foundation"
    }
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    isEmailVerified: {
      type: Boolean,
      default: false
    },
    emailVerificationToken: String,
    emailVerificationExpiresAt: Date,
    avatarColor: {
      type: String,
      default: "#facc15"
    },
    learningStats: {
      totalStudyMinutes: { type: Number, default: 0 },
      averageQuizScore: { type: Number, default: 0 },
      currentStreak: { type: Number, default: 0 },
      longestStreak: { type: Number, default: 0 },
      lastActiveDate: { type: String, default: "" }, // YYYY-MM-DD
      weakTopics: { type: [String], default: [] }
    },
    gamification: {
      xp: { type: Number, default: 0 },
      level: { type: Number, default: 1 },
      dailyGoal: { type: Number, default: 3 }, // tasks per day
      dailyTasksDone: { type: Number, default: 0 },
      dailyGoalDate: { type: String, default: "" }, // reset tracking
    },
    preferences: {
      peakEnergyTime: {
        type: String,
        enum: ["morning", "afternoon", "night"],
        default: "morning",
      },
      emailNotifications: { type: Boolean, default: false },
      inAppNotifications: { type: Boolean, default: true },
      pomodoroMinutes: { type: Number, default: 25, min: 5, max: 90 },
      breakMinutes: { type: Number, default: 5, min: 1, max: 60 },
    },
    topicStats: {
      type: [TopicStatSchema],
      default: [
        {
          topic: "Visual Design",
          mastery: 0.72,
          weakSpotScore: 0.28,
          lastReviewedAt: new Date(),
          recommendedDifficulty: "core"
        },
        {
          topic: "UX Research",
          mastery: 0.54,
          weakSpotScore: 0.46,
          lastReviewedAt: new Date(),
          recommendedDifficulty: "core"
        }
      ]
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("User", UserSchema);
