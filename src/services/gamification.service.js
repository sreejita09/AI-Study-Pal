/**
 * Gamification Service
 * XP, levels, streaks, daily goals.
 */

const XP_PER_TASK = 10;
const XP_PER_DAY_COMPLETE = 25;
const XP_STREAK_BONUS = 5; // per streak day

/**
 * Calculate level from XP. 100 XP per level.
 */
function xpToLevel(xp) {
  return Math.floor(xp / 100) + 1;
}

/**
 * Award XP for completing a task. Updates user doc in-place.
 * @param {Object} user - Mongoose User document
 * @param {Object} options
 * @param {boolean} options.dayComplete - All daily tasks now done?
 * @returns {{ xpGained: number, newXp: number, level: number, levelUp: boolean, streakUpdated: boolean }}
 */
function awardTaskXP(user, { dayComplete = false } = {}) {
  const today = new Date().toISOString().slice(0, 10);
  const gam = user.gamification;
  const stats = user.learningStats;
  const prevLevel = xpToLevel(gam.xp);

  let xpGained = XP_PER_TASK;

  // Reset daily counter if new day
  if (gam.dailyGoalDate !== today) {
    gam.dailyGoalDate = today;
    gam.dailyTasksDone = 0;
  }
  gam.dailyTasksDone += 1;

  // Day complete bonus
  if (dayComplete) {
    xpGained += XP_PER_DAY_COMPLETE;
  }

  // Streak management
  let streakUpdated = false;
  if (stats.lastActiveDate !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    if (stats.lastActiveDate === yesterdayStr) {
      stats.currentStreak += 1;
    } else if (stats.lastActiveDate !== today) {
      stats.currentStreak = 1;
    }
    if (stats.currentStreak > (stats.longestStreak || 0)) {
      stats.longestStreak = stats.currentStreak;
    }
    stats.lastActiveDate = today;
    streakUpdated = true;

    // Streak XP bonus
    xpGained += XP_STREAK_BONUS * Math.min(stats.currentStreak, 10);
  }

  gam.xp += xpGained;
  gam.level = xpToLevel(gam.xp);
  const levelUp = gam.level > prevLevel;

  return {
    xpGained,
    newXp: gam.xp,
    level: gam.level,
    levelUp,
    streakUpdated,
    streak: stats.currentStreak,
    dailyTasksDone: gam.dailyTasksDone,
    dailyGoal: gam.dailyGoal,
  };
}

module.exports = { awardTaskXP, xpToLevel, XP_PER_TASK };
