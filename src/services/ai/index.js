const { summarizeContent } = require("./summarizer.service");
const { generateQuiz } = require("./quiz.service");
const { generateNotes } = require("./notes.service");

module.exports = {
  summarizeContent,
  generateQuiz,
  generateNotes
};
