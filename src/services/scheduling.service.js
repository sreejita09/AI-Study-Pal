/**
 * Energy-Based Scheduling Service
 * Sorts topics so that hard topics land in peak-energy slots.
 *
 * Slot mapping:
 *   morning  → first half of day = peak
 *   afternoon → middle of day = peak
 *   night → second half of day = peak
 */

const DIFFICULTY_ORDER = { hard: 0, medium: 1, easy: 2 };

/**
 * Sort topics within a day based on user's peak energy time.
 * Hard topics go to peak slots, easy topics to low-energy slots.
 *
 * @param {Array} topics - Topics with difficulty field
 * @param {"morning"|"afternoon"|"night"} peakTime - User's peak energy preference
 * @returns {Array} Reordered topics
 */
function scheduleByEnergy(topics, peakTime = "morning") {
  if (!topics.length) return topics;

  const sorted = [...topics].sort(
    (a, b) => (DIFFICULTY_ORDER[a.difficulty] || 1) - (DIFFICULTY_ORDER[b.difficulty] || 1)
  );

  // For morning: hard first (already sorted)
  if (peakTime === "morning") return sorted;

  // For night: easy first, hard at end
  if (peakTime === "night") return sorted.reverse();

  // For afternoon: easy → hard → easy (hard in middle)
  if (peakTime === "afternoon") {
    const hard = sorted.filter((t) => t.difficulty === "hard");
    const medium = sorted.filter((t) => t.difficulty === "medium");
    const easy = sorted.filter((t) => t.difficulty === "easy");
    const firstHalf = easy.slice(0, Math.ceil(easy.length / 2));
    const secondHalf = easy.slice(Math.ceil(easy.length / 2));
    return [...firstHalf, ...hard, ...medium, ...secondHalf];
  }

  return sorted;
}

module.exports = { scheduleByEnergy };
