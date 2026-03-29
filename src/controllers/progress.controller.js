const asyncHandler = require("../utils/asyncHandler");
const Task = require("../models/Task");
const Plan = require("../models/Plan");
const Material = require("../models/Material");
const User = require("../models/User");
const { generateMotivation } = require("../services/motivation.service");
const { awardTaskXP } = require("../services/gamification.service");

/**
 * GET /api/progress
 * Returns comprehensive progress stats for the dashboard.
 */
const getProgress = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const today = new Date().toISOString().slice(0, 10);

  // All tasks for user
  const allTasks = await Task.find({ user: userId });
  const totalTasks = allTasks.length;
  const doneTasks = allTasks.filter((t) => t.status === "done").length;

  // Today's tasks
  const todayTasks = allTasks.filter((t) => t.assignedDate === today);
  const todayDone = todayTasks.filter((t) => t.status === "done").length;

  // Overdue tasks
  const overdueTasks = allTasks.filter(
    (t) => t.status === "pending" && t.assignedDate && t.assignedDate < today
  ).length;

  // Weekly stats (last 7 days)
  const weekDays = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dk = d.toISOString().slice(0, 10);
    const dayLabel = d.toLocaleDateString("en-US", { weekday: "short" });
    const dt = allTasks.filter((t) => t.assignedDate === dk);
    const dd = dt.filter((t) => t.status === "done").length;
    weekDays.push({ date: dk, label: dayLabel, total: dt.length, done: dd });
  }

  // Total study minutes (from completed tasks)
  const totalStudyMinutes = allTasks
    .filter((t) => t.status === "done")
    .reduce((s, t) => s + (t.allocatedMinutes || 0), 0);

  // Per-material completion
  const materialIds = [...new Set(allTasks.filter((t) => t.material).map((t) => t.material.toString()))];
  const materials = await Material.find({ _id: { $in: materialIds } }).select("title");
  const materialMap = {};
  materials.forEach((m) => { materialMap[m._id.toString()] = m.title; });

  const perMaterial = {};
  allTasks.forEach((t) => {
    if (!t.material) return;
    const mid = t.material.toString();
    if (!perMaterial[mid]) perMaterial[mid] = { title: materialMap[mid] || "Unknown", total: 0, done: 0 };
    perMaterial[mid].total++;
    if (t.status === "done") perMaterial[mid].done++;
  });

  // On track calculation
  const completionRate = totalTasks > 0 ? doneTasks / totalTasks : 0;
  const onTrack = overdueTasks <= 2 && completionRate >= 0.3 ? "on_track"
    : overdueTasks > 5 ? "behind" : "slightly_behind";

  // User gamification stats
  const user = await User.findById(userId).select("gamification learningStats");
  const gamification = user?.gamification || {};
  const streak = user?.learningStats?.currentStreak || 0;

  res.json({
    overall: {
      totalTasks,
      doneTasks,
      completionPercent: totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0,
      totalStudyMinutes,
      onTrack,
    },
    today: {
      total: todayTasks.length,
      done: todayDone,
      overdue: overdueTasks,
    },
    weekly: weekDays,
    perMaterial: Object.values(perMaterial),
    gamification: {
      xp: gamification.xp || 0,
      level: gamification.level || 1,
      streak,
      longestStreak: user?.learningStats?.longestStreak || 0,
      dailyTasksDone: gamification.dailyTasksDone || 0,
      dailyGoal: gamification.dailyGoal || 3,
    },
  });
});

/**
 * POST /api/progress/motivation
 * Returns a contextual motivation message.
 */
const getMotivation = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const today = new Date().toISOString().slice(0, 10);
  const { taskJustCompleted = false } = req.body;

  const user = await User.findById(userId).select("learningStats gamification");
  const allTasks = await Task.find({ user: userId });

  const todayTasks = allTasks.filter((t) => t.assignedDate === today);
  const todayDone = todayTasks.filter((t) => t.status === "done").length;
  const overdueTasks = allTasks.filter(
    (t) => t.status === "pending" && t.assignedDate && t.assignedDate < today
  ).length;

  const streak = user?.learningStats?.currentStreak || 0;
  const lastActive = user?.learningStats?.lastActiveDate || "";

  let daysSinceActive = 0;
  if (lastActive) {
    daysSinceActive = Math.floor((Date.now() - new Date(lastActive + "T12:00:00").getTime()) / 86400000);
  } else {
    daysSinceActive = 99;
  }

  const motivation = generateMotivation({
    streak,
    todayDone,
    todayTotal: todayTasks.length,
    overdueTasks,
    dayComplete: todayTasks.length > 0 && todayDone === todayTasks.length,
    taskJustCompleted,
    daysSinceActive,
  });

  res.json(motivation);
});

/**
 * PATCH /api/progress/preferences
 * Update user preferences (energy time, daily goal).
 */
const updatePreferences = asyncHandler(async (req, res) => {
  const { peakEnergyTime, dailyGoal } = req.body;
  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ error: "User not found" });

  if (peakEnergyTime && ["morning", "afternoon", "night"].includes(peakEnergyTime)) {
    user.preferences.peakEnergyTime = peakEnergyTime;
  }
  if (dailyGoal && dailyGoal >= 1 && dailyGoal <= 20) {
    user.gamification.dailyGoal = dailyGoal;
  }

  await user.save();
  res.json({
    preferences: user.preferences,
    gamification: { dailyGoal: user.gamification.dailyGoal },
  });
});

/**
 * GET /api/progress/weak-topics
 * Returns weak topics from the user's learningStats.
 */
const getWeakTopics = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("learningStats");
  const topics = user?.learningStats?.weakTopics || [];
  res.json({ weakTopics: topics });
});

/**
 * PATCH /api/progress/weak-topics
 * Merges client-derived weak topics into the user's learningStats.
 * Accepts { weakTopics: string[] } — stores top 5 unique entries.
 */
const syncWeakTopics = asyncHandler(async (req, res) => {
  const { weakTopics } = req.body;
  if (!Array.isArray(weakTopics)) {
    return res.status(400).json({ error: "weakTopics must be an array" });
  }

  const sanitized = weakTopics
    .filter((t) => typeof t === "string" && t.trim().length > 0)
    .map((t) => t.trim())
    .slice(0, 5);

  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ error: "User not found" });

  // Merge: client topics take priority, keep unique, cap at 5
  const merged = [...new Set([...sanitized, ...(user.learningStats.weakTopics || [])])].slice(0, 5);
  user.learningStats.weakTopics = merged;
  await user.save();

  res.json({ weakTopics: merged });
});

module.exports = { getProgress, getMotivation, updatePreferences, getWeakTopics, syncWeakTopics };
