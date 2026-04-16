const express = require("express");

const { requireAuth } = require("../middleware/auth");
const { VALID_STATUSES, createGoal, deleteGoal, listGoals, updateGoal } = require("../store/dataStore");

async function broadcastGoals(io) {
  io.emit("goals:snapshot", await listGoals());
}

function createGoalsRouter(io) {
  const router = express.Router();

  router.use(requireAuth);

  router.get("/", async (req, res) => {
    try {
      return res.json({ goals: await listGoals() });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Nao foi possivel listar as metas." });
    }
  });

  router.post("/", async (req, res) => {
    try {
      const { title, description } = req.body;
      if (!String(title || "").trim()) {
        return res.status(400).json({ error: "Informe o titulo da meta." });
      }

      const goal = await createGoal({
        title,
        description,
        owner: req.user,
      });

      await broadcastGoals(io);
      return res.status(201).json({ goal });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Nao foi possivel criar a meta." });
    }
  });

  router.patch("/:goalId", async (req, res) => {
    try {
      const { title, description, status } = req.body;

      if (status !== undefined && !VALID_STATUSES.has(status)) {
        return res.status(400).json({ error: "Status invalido." });
      }

      const goal = await updateGoal(req.params.goalId, {
        title,
        description,
        status,
      });

      if (!goal) {
        return res.status(404).json({ error: "Meta nao encontrada." });
      }

      await broadcastGoals(io);
      return res.json({ goal });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Nao foi possivel atualizar a meta." });
    }
  });

  router.delete("/:goalId", async (req, res) => {
    try {
      const removed = await deleteGoal(req.params.goalId);

      if (!removed) {
        return res.status(404).json({ error: "Meta nao encontrada." });
      }

      await broadcastGoals(io);
      return res.status(204).send();
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Nao foi possivel remover a meta." });
    }
  });

  return router;
}

module.exports = {
  createGoalsRouter,
};
