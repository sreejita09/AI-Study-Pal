/**
 * Motivation & Support Engine
 * Generates contextual, rotating motivational messages.
 */

const SUCCESS_MESSAGES = [
  "Nice, you're building momentum.",
  "That's one step closer. Keep going.",
  "Solid work. Every task counts.",
  "You're making progress — stay locked in.",
  "Another one down. You're doing great.",
  "Consistency is everything. Well done.",
  "You crushed that. On to the next.",
  "Momentum is on your side now.",
];

const DAY_COMPLETE_MESSAGES = [
  "Day complete! You earned this rest.",
  "Flawless day. Come back stronger tomorrow.",
  "All tasks done — that's discipline.",
  "Today was a win. Carry it forward.",
];

const BEHIND_MESSAGES = [
  "You're slightly behind, but you can recover today.",
  "Let's tackle just one task to restart.",
  "A small step today beats zero steps.",
  "Behind schedule? Focus on the next task, not the gap.",
  "One task at a time. You've got this.",
];

const CONSISTENCY_MESSAGES = [
  "You've been consistent for {streak} days. That's powerful.",
  "{streak}-day streak! Keep the chain going.",
  "Discipline over motivation — {streak} days strong.",
  "Your streak speaks louder than any plan.",
];

const LOW_ACTIVITY_MESSAGES = [
  "Start small. Even 20 minutes counts.",
  "Open one topic. That's all it takes.",
  "The hardest part is starting. Do it now.",
  "Just one task today. You'll feel better after.",
];

const COMEBACK_MESSAGES = [
  "Welcome back. Let's pick up where you left off.",
  "You skipped yesterday. Let's get back on track today.",
  "Breaks happen. What matters is showing up again.",
];

// Track last used index per category to avoid repeats
const usedIndices = {};

function pickMessage(pool, category) {
  if (!usedIndices[category]) usedIndices[category] = -1;
  let idx = usedIndices[category];
  idx = (idx + 1) % pool.length;
  usedIndices[category] = idx;
  return pool[idx];
}

/**
 * Generate a motivation message based on user state.
 * @param {Object} params
 * @param {number} params.streak - Current streak
 * @param {number} params.todayDone - Tasks completed today
 * @param {number} params.todayTotal - Total tasks today
 * @param {number} params.overdueTasks - Number of overdue tasks
 * @param {boolean} params.dayComplete - All today's tasks done?
 * @param {boolean} params.taskJustCompleted - Did user just finish a task?
 * @param {number} params.daysSinceActive - Days since last activity
 * @returns {{ message: string, type: string }}
 */
function generateMotivation({
  streak = 0,
  todayDone = 0,
  todayTotal = 0,
  overdueTasks = 0,
  dayComplete = false,
  taskJustCompleted = false,
  daysSinceActive = 0,
}) {
  // Priority order: comeback > day complete > task complete > consistency > behind > low activity

  if (daysSinceActive >= 2) {
    return { message: pickMessage(COMEBACK_MESSAGES, "comeback"), type: "comeback" };
  }

  if (dayComplete && todayTotal > 0) {
    return { message: pickMessage(DAY_COMPLETE_MESSAGES, "day_complete"), type: "day_complete" };
  }

  if (taskJustCompleted) {
    return { message: pickMessage(SUCCESS_MESSAGES, "success"), type: "success" };
  }

  if (streak >= 3) {
    const msg = pickMessage(CONSISTENCY_MESSAGES, "consistency").replace(/\{streak\}/g, streak);
    return { message: msg, type: "consistency" };
  }

  if (overdueTasks > 0 || (todayTotal > 0 && todayDone === 0)) {
    return { message: pickMessage(BEHIND_MESSAGES, "behind"), type: "behind" };
  }

  if (todayTotal === 0 && daysSinceActive >= 1) {
    return { message: pickMessage(LOW_ACTIVITY_MESSAGES, "low_activity"), type: "low_activity" };
  }

  // Default
  return { message: pickMessage(SUCCESS_MESSAGES, "success"), type: "neutral" };
}

module.exports = { generateMotivation };
