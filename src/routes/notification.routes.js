const express = require("express");
const { requireAuth } = require("../middleware/auth.middleware");
const {
  listNotifications,
  markRead,
  markAllRead,
  triggerCheck,
  updateSettings,
} = require("../controllers/notification.controller");

const router = express.Router();
router.use(requireAuth);

router.get("/", listNotifications);
router.patch("/read-all", markAllRead);
router.patch("/read/:id", markRead);
router.post("/check", triggerCheck);
router.patch("/settings", updateSettings);

module.exports = router;
