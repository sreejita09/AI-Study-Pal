const express = require("express");
const { requireAuth } = require("../middleware/auth.middleware");
const {
  createPlan,
  listPlans,
  getPlan,
  toggleTask,
  rebalancePlan,
  downloadPlan,
  deletePlan,
} = require("../controllers/plan.controller");

const router = express.Router();
router.use(requireAuth);

router.post("/create", createPlan);
router.get("/", listPlans);
router.get("/:id", getPlan);
router.patch("/tasks/:id", toggleTask);
router.post("/:id/rebalance", rebalancePlan);
router.get("/:id/download", downloadPlan);
router.delete("/:id", deletePlan);

module.exports = router;
