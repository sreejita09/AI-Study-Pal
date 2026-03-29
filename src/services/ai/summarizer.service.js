function summarizeContent({ content, weakTopics }) {
  const highlightedTopics = weakTopics?.length
    ? `Focus on ${weakTopics.join(", ")} while reviewing this summary.`
    : "Focus on the foundational concepts while reviewing this summary.";

  return {
    title: "Adaptive summary",
    bullets: [
      content.slice(0, 120) || "Upload content to generate a richer summary.",
      "This summary is designed to be short enough for spaced repetition review.",
      highlightedTopics
    ]
  };
}

module.exports = {
  summarizeContent
};
