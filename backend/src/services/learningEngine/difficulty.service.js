function getDifficultyBand(averageScore) {
  if (averageScore >= 85) return "challenge";
  if (averageScore >= 60) return "core";
  return "foundation";
}

module.exports = {
  getDifficultyBand
};
