const express = require("express");
const {
  listGoals,
  createGoal,
  updateGoal,
  deleteGoal,
} = require("../controllers/goalController");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(requireAuth);
router.get("/", listGoals);
router.post("/", createGoal);
router.put("/:id", updateGoal);
router.delete("/:id", deleteGoal);

module.exports = router;
