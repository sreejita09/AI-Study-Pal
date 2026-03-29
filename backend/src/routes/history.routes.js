const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth.middleware");
const { deleteHistoryItem } = require("../controllers/history.controller");

router.use(requireAuth);

router.delete("/:id", deleteHistoryItem);

module.exports = router;
