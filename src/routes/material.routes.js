const express = require("express");
const { requireAuth } = require("../middleware/auth.middleware");
const {
  processMaterial,
  listMaterials,
  getMaterial,
  deleteMaterial,
  reprocessMaterial,
} = require("../controllers/material.controller");

const router = express.Router();
router.use(requireAuth);

router.post("/process", processMaterial);
router.post("/:id/reprocess", reprocessMaterial);
router.get("/", listMaterials);
router.get("/:id", getMaterial);
router.delete("/:id", deleteMaterial);

module.exports = router;
