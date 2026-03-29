const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth.middleware");
const { getProgress, getMotivation, updatePreferences, getWeakTopics, syncWeakTopics } = require("../controllers/progress.controller");

router.use(requireAuth);

router.get("/", getProgress);
router.post("/motivation", getMotivation);
router.patch("/preferences", updatePreferences);
router.get("/weak-topics", getWeakTopics);
router.patch("/weak-topics", syncWeakTopics);

module.exports = router;
