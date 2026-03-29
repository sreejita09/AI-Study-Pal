const express = require("express");
const upload = require("../middleware/upload.middleware");
const { requireAuth } = require("../middleware/auth.middleware");
const {
  uploadFile,
  listUploads,
  downloadUpload
} = require("../controllers/upload.controller");

const router = express.Router();

router.use(requireAuth);
router.get("/", listUploads);
router.post("/", upload.single("file"), uploadFile);
router.get("/:id/download", downloadUpload);

module.exports = router;
