function rankWeakTopics(topicStats = []) {
  return [...topicStats]
    .sort((a, b) => b.weakSpotScore - a.weakSpotScore)
    .slice(0, 3)
    .map((topic) => topic.topic);
}

module.exports = {
  rankWeakTopics
};
