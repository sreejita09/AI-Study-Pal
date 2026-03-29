const LearningProfile = require("../../models/LearningProfile");
const { rankWeakTopics } = require("./topicTracker.service");

async function syncLearningProfile(user) {
  const weakTopics = rankWeakTopics(user.topicStats);

  const profile = await LearningProfile.findOneAndUpdate(
    { user: user._id },
    {
      $set: {
        weakTopics,
        "history.nextReviewAt": new Date(Date.now() + 1000 * 60 * 60 * 24)
      }
    },
    { upsert: true, new: true }
  );

  user.learningStats.weakTopics = weakTopics;
  await user.save();

  return profile;
}

module.exports = {
  syncLearningProfile
};
