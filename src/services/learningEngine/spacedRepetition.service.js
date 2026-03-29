function getNextReviewDate(lastReviewedAt, weakSpotScore = 0.5) {
  const baseDays = weakSpotScore > 0.5 ? 1 : weakSpotScore > 0.25 ? 3 : 5;
  const date = new Date(lastReviewedAt || Date.now());
  date.setDate(date.getDate() + baseDays);
  return date;
}

module.exports = {
  getNextReviewDate
};
