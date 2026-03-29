export const WEAK_TOPICS_KEY  = "sp_weak_topics";
const TOPIC_STATS_KEY = "sp_topic_stats";

/* ── Topic-stats schema ──────────────────────────────────────────────────
   sp_topic_stats: { [topicName]: { wrong: number, total: number, lastSeen: number } }

   Built up across every quiz the user finishes, so error rates reflect real
   long-term performance rather than a single quiz session.
──────────────────────────────────────────────────────────────────────── */

/** Load the raw per-topic stats map. Returns {} on any failure. */
export function loadTopicStats() {
  try {
    const raw = localStorage.getItem(TOPIC_STATS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

/** Persist the stats map. */
function saveTopicStats(stats) {
  try { localStorage.setItem(TOPIC_STATS_KEY, JSON.stringify(stats)); } catch { /* ignore */ }
}

/**
 * Accumulate quiz results into the persistent per-topic stats.
 * Called after every quiz completion.
 *
 * @param {Array} questions  - quiz question objects (with optional `.topic`)
 * @param {Array} answers    - parallel answer objects { correct, topic?, ... }
 * @returns {object}  updated stats map
 */
export function updateTopicStats(questions = [], answers = []) {
  const stats = loadTopicStats();
  questions.forEach((q, i) => {
    const a = answers[i];
    if (!a) return;
    const topic = (q.topic || a.topic || "General").trim();
    if (!stats[topic]) stats[topic] = { wrong: 0, total: 0, lastSeen: 0 };
    stats[topic].total   += 1;
    if (!a.correct) stats[topic].wrong += 1;
    stats[topic].lastSeen = Date.now();
  });
  saveTopicStats(stats);
  return stats;
}

/**
 * Derive canonical weak topics from the accumulated stats.
 *
 * A topic qualifies as "weak" when:
 *   - at least 2 attempts recorded (avoids noise from a single question)
 *   - error rate ≥ 30 %
 *
 * Returns up to 3 topics sorted by descending error rate.
 */
export function computeWeakFromStats(stats = {}) {
  return Object.entries(stats)
    .filter(([, s]) => s.total >= 2 && s.wrong / s.total >= 0.3)
    .sort((a, b) => b[1].wrong / b[1].total - a[1].wrong / a[1].total)
    .slice(0, 3)
    .map(([topic]) => topic);
}

/**
 * Total questions answered across all tracked topics — used in the UI to
 * show the user how much data backs their weak-topic assessment.
 */
export function getTotalAnswered(stats = {}) {
  return Object.values(stats).reduce((s, t) => s + t.total, 0);
}

/**
 * Single-session fallback: derive weak topics directly from one quiz result.
 * Used in the QuizScreen result view (immediate feedback) and when stats
 * haven't accumulated enough data yet.
 *
 * @param {Array} questions
 * @param {Array} answers
 * @returns {string[]}
 */
export function getWeakTopics(questions = [], answers = []) {
  const errors = {};
  questions.forEach((q, i) => {
    const a = answers[i];
    if (!a || a.correct) return;
    const t = (q.topic || a.topic || "General").trim();
    errors[t] = (errors[t] || 0) + 1;
  });
  return Object.entries(errors)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([topic]) => topic);
}

/** Persist the canonical weak-topics list. */
export function saveWeakTopics(topics) {
  if (!Array.isArray(topics)) return;
  try { localStorage.setItem(WEAK_TOPICS_KEY, JSON.stringify(topics)); } catch { /* ignore */ }
}

/** Load the canonical weak-topics list. Returns [] on any failure. */
export function loadWeakTopics() {
  try {
    const raw = localStorage.getItem(WEAK_TOPICS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
