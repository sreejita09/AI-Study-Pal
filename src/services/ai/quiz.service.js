function generateQuiz({ topic, difficulty }) {
  return {
    topic,
    difficulty,
    questions: [
      {
        type: "multiple-choice",
        prompt: `Which design choice best improves ${topic}?`,
        options: [
          "Reducing clarity",
          "Improving hierarchy and feedback",
          "Ignoring user flows",
          "Removing labels"
        ],
        answer: "Improving hierarchy and feedback"
      }
    ]
  };
}

module.exports = {
  generateQuiz
};
