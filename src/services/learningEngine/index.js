const { syncLearningProfile } = require("./performance.service");
const { buildLearningRecommendations } = require("./recommendation.service");

module.exports = {
  syncLearningProfile,
  buildLearningRecommendations
};
