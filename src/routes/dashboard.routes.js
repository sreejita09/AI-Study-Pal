const express = require("express");
const { requireAuth } = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const { summarizeSchema, topicSchema } = require("../validators/ai.validators");
const {
  getDashboard,
  summarize,
  quiz,
  notes,
  toggleTask
} = require("../controllers/ai.controller");

const router = express.Router();

router.use(requireAuth);
router.get("/", getDashboard);
router.patch("/tasks/:taskId/toggle", toggleTask);
router.post("/ai/summarize", validate(summarizeSchema), summarize);
router.post("/ai/quiz", validate(topicSchema), quiz);
router.post("/ai/notes", validate(topicSchema), notes);

module.exports = router;
