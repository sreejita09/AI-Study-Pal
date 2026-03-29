const { getDifficultyBand } = require("./difficulty.service");
const { getNextReviewDate } = require("./spacedRepetition.service");

function buildLearningRecommendations(user, profile) {
  const averageScore = user.learningStats?.averageQuizScore || 64;
  const nextDifficulty = getDifficultyBand(averageScore);

  return {
    nextDifficulty,
    nextReviewAt: getNextReviewDate(new Date(), 0.48),
    recommendedTopics: profile?.recommendationQueue || [
      "Interaction Design",
      "Information Architecture",
      "Accessibility"
    ]
  };
}

module.exports = {
  buildLearningRecommendations
};
