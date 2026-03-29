const express = require("express");
const { requireAuth } = require("../middleware/auth.middleware");
const { generate, summary } = require("../controllers/aiSummary.controller");

const router = express.Router();

router.use(requireAuth);
router.post("/generate", generate);
router.post("/summary", summary); // backward compat

module.exports = router;
