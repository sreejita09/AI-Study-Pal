/**
 * Difficulty Detection Service
 * Assigns difficulty (easy/medium/hard) to topics based on heuristics.
 */

const HARD_KEYWORDS = [
  "algorithm", "theorem", "proof", "differential", "integral", "complexity",
  "concurrency", "encryption", "quantum", "optimization", "regression",
  "neural", "distributed", "recursive", "deadlock", "synchronization",
  "polymorphism", "inheritance", "multithreading", "advanced", "analysis",
];

const EASY_KEYWORDS = [
  "introduction", "overview", "basics", "definition", "history",
  "summary", "review", "terminology", "glossary", "getting started",
  "fundamentals", "simple", "beginner", "elementary", "what is",
];

/**
 * Detect difficulty based on topic name and estimated time.
 * @param {string} topicName
 * @param {number} estimatedMinutes
 * @returns {"easy"|"medium"|"hard"}
 */
function detectDifficulty(topicName, estimatedMinutes = 30) {
  const lower = topicName.toLowerCase();

  const hardScore = HARD_KEYWORDS.filter((kw) => lower.includes(kw)).length;
  const easyScore = EASY_KEYWORDS.filter((kw) => lower.includes(kw)).length;

  // Time-based bonus
  const timeBonus = estimatedMinutes > 60 ? 1 : estimatedMinutes < 20 ? -1 : 0;

  const score = hardScore - easyScore + timeBonus;

  if (score >= 2) return "hard";
  if (score <= -1) return "easy";
  if (hardScore > 0 && estimatedMinutes > 45) return "hard";
  if (easyScore > 0 && estimatedMinutes < 30) return "easy";
  return "medium";
}

/**
 * Assign difficulty to an array of topics.
 * Only assigns if `difficulty` is not already set.
 * @param {Array<{name: string, estimatedMinutes: number, difficulty?: string}>} topics
 * @returns {Array<{name: string, estimatedMinutes: number, difficulty: string}>}
 */
function assignDifficulties(topics) {
  return topics.map((t) => ({
    ...t,
    difficulty: t.difficulty || detectDifficulty(t.name, t.estimatedMinutes),
  }));
}

/**
 * Estimate study time in minutes from raw text chunk length.
 * @param {string} chunkText
 * @returns {number}
 */
function estimateMinutesFromChunk(chunkText) {
  const len = (chunkText || "").trim().length;
  if (len < 300) return 15;
  if (len < 800) return 30;
  if (len < 1500) return 45;
  return 60;
}

/**
 * Detect difficulty from raw text chunk content using length + keyword heuristics.
 * @param {string} chunkText
 * @returns {"easy"|"medium"|"hard"}
 */
function detectDifficultyFromChunk(chunkText) {
  const text = (chunkText || "").trim();
  const lower = text.toLowerCase();
  const hardScore = HARD_KEYWORDS.filter((kw) => lower.includes(kw)).length;
  const easyScore = EASY_KEYWORDS.filter((kw) => lower.includes(kw)).length;
  if (text.length >= 800 || hardScore >= 2) return "hard";
  if (text.length < 300 || (easyScore > 0 && hardScore === 0)) return "easy";
  return "medium";
}

/**
 * Split raw text into topic-sized chunks (~400 words each) with name, time, and difficulty.
 * Used as a fallback when AI extraction fails or text has no headings.
 * @param {string} text
 * @param {string} title  material title (used to name chunks)
 * @returns {Array<{name: string, estimatedMinutes: number, difficulty: string}>}
 */
function chunkTextIntoTopics(text, title) {
  const WORDS_PER_CHUNK = 400;
  const MIN_CHUNK_CHARS = 80;

  // Try paragraph splitting first
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter((p) => p.length >= MIN_CHUNK_CHARS);

  const rawChunks = [];
  let current = "";

  for (const para of paragraphs) {
    const combined = current ? current + "\n\n" + para : para;
    if (combined.split(/\s+/).length > WORDS_PER_CHUNK && current) {
      rawChunks.push(current);
      current = para;
    } else {
      current = combined;
    }
  }
  if (current) rawChunks.push(current);

  // If paragraph splitting didn't work, split by words directly
  if (rawChunks.length < 2) {
    const words = text.split(/\s+/).filter(Boolean);
    const numChunks = Math.min(6, Math.max(2, Math.ceil(words.length / WORDS_PER_CHUNK)));
    const wordsPerChunk = Math.ceil(words.length / numChunks);
    rawChunks.length = 0;
    for (let i = 0; i < numChunks; i++) {
      rawChunks.push(words.slice(i * wordsPerChunk, (i + 1) * wordsPerChunk).join(" "));
    }
  }

  // Cap at 8 chunks, ensure at least 2
  const chunks = rawChunks.slice(0, 8);
  while (chunks.length < 2) chunks.push(`Study Part ${chunks.length + 1}: ${title}`);

  const sectionLabels = [
    "Introduction", "Core Concepts", "Key Principles",
    "Deep Dive", "Applications", "Advanced Topics",
    "Practice & Examples", "Summary & Review",
  ];

  return chunks.map((chunk, i) => {
    // Try to extract a name from the first line of the chunk
    const firstLine = chunk.split("\n")[0].replace(/^#+\s*/, "").replace(/^\d+\.\s*/, "").trim();
    const name = firstLine.length > 10 && firstLine.length < 80
      ? firstLine
      : `${sectionLabels[i] || `Part ${i + 1}`}: ${title}`;

    return {
      name,
      estimatedMinutes: estimateMinutesFromChunk(chunk),
      difficulty: detectDifficultyFromChunk(chunk),
    };
  });
}

/**
 * Extract meaningful topics from raw text by splitting on headings, paragraphs, and bullet points.
 * Returns structured topics with name, estimatedMinutes, and difficulty.
 * Guaranteed to return at least 1 topic (uses fallbackTitle).
 * @param {string} text
 * @param {string} fallbackTitle
 * @returns {Array<{name: string, estimatedMinutes: number, difficulty: string}>}
 */
function extractTopics(text, fallbackTitle = "General Study") {
  if (!text || !text.trim()) {
    return [{
      name: fallbackTitle,
      estimatedMinutes: 30,
      difficulty: "medium",
    }];
  }

  // Split by double newlines, sentence-ending periods, or bullet points
  const rawSections = text
    .split(/\n{2,}|\. |\n-/)
    .map((s) => s.trim())
    .filter((s) => s.length > 30);

  // Limit to max 20 topics
  const sections = rawSections.slice(0, 20);

  if (sections.length === 0) {
    return [{
      name: fallbackTitle,
      estimatedMinutes: 30,
      difficulty: "medium",
    }];
  }

  return sections.map((section) => {
    const wordCount = section.split(/\s+/).length;

    let difficulty = "easy";
    if (wordCount > 120) difficulty = "hard";
    else if (wordCount > 60) difficulty = "medium";

    // Use first line (cleaned) as topic name, capped at 60 chars
    const firstLine = section.split("\n")[0].replace(/^#+\s*/, "").replace(/^\d+\.\s*/, "").trim();
    const topicName = (firstLine.length > 10 ? firstLine : section).substring(0, 60).trim();

    return {
      name: topicName,
      estimatedMinutes: Math.min(Math.max(Math.round(wordCount / 10), 15), 60),
      difficulty,
    };
  });
}

module.exports = { detectDifficulty, assignDifficulties, detectDifficultyFromChunk, estimateMinutesFromChunk, chunkTextIntoTopics, extractTopics };
