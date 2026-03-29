const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth.middleware");
const { generateStudyContent, getStudyContent, clearStudyContent } = require("../controllers/study.controller");

router.use(requireAuth);

router.post("/generate", generateStudyContent);
router.get("/content/:materialId", getStudyContent);
router.delete("/content/:materialId/:type", clearStudyContent);

module.exports = router;
