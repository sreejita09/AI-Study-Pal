const express = require("express");
const validate = require("../middleware/validate.middleware");
const { supportSchema } = require("../validators/support.validators");
const { submitSupportRequest } = require("../controllers/support.controller");
const { supportLimiter } = require("../middleware/rateLimit.middleware");

const router = express.Router();

// POST /api/support/contact
router.post("/contact", supportLimiter, validate(supportSchema), submitSupportRequest);

module.exports = router;
