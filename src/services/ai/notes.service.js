function generateNotes({ topic, recommendations }) {
  return {
    topic,
    sections: [
      {
        heading: "Key idea",
        content: `${topic} should be studied using short, repeated review sessions.`
      },
      {
        heading: "Recommended next step",
        content: `After this, review ${recommendations[0] || "the next topic"} with a practical exercise.`
      }
    ]
  };
}

module.exports = {
  generateNotes
};
