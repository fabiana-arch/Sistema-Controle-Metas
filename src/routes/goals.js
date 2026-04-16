const express = require('express');
const { getStore } = require('../store');
const { authMiddleware } = require('../auth');

async function broadcastGoals(io) {
  const store = getStore();
  const goals = await store.listGoals();
  io.to('condominio').emit('goals:sync', { goals });
}

function createGoalsRouter() {
  const router = express.Router();
  router.use(authMiddleware);

  router.get('/', async (req, res) => {
    try {
      const store = getStore();
      const goals = await store.listGoals();
      res.json({ goals });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Erro ao listar metas' });
    }
  });

  router.post('/', async (req, res) => {
    const title = String(req.body?.title || '').trim();
    const target = Number(req.body?.target);
    const current = req.body?.current != null ? Number(req.body.current) : 0;

    if (!title) {
      return res.status(400).json({ error: 'Título é obrigatório' });
    }
    if (Number.isNaN(target) || target < 0) {
      return res.status(400).json({ error: 'Meta (valor alvo) inválida' });
    }
    if (Number.isNaN(current) || current < 0) {
      return res.status(400).json({ error: 'Valor atual inválido' });
    }

    try {
      const store = getStore();
      const row = await store.insertGoal(title, target, current, req.user.id);
      const goal = row;

      const io = req.app.get('io');
      if (io) {
        await broadcastGoals(io);
      }

      res.status(201).json({ goal });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Erro ao criar meta' });
    }
  });

  router.patch('/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const store = getStore();
    const exists = await store.goalExists(id);
    if (!exists) {
      return res.status(404).json({ error: 'Meta não encontrada' });
    }

    let title;
    let target;
    let current;
    if (req.body.title != null) {
      title = String(req.body.title).trim();
      if (!title) {
        return res.status(400).json({ error: 'Título inválido' });
      }
    }
    if (req.body.target != null) {
      target = Number(req.body.target);
      if (Number.isNaN(target) || target < 0) {
        return res.status(400).json({ error: 'Meta (valor alvo) inválida' });
      }
    }
    if (req.body.current != null) {
      current = Number(req.body.current);
      if (Number.isNaN(current) || current < 0) {
        return res.status(400).json({ error: 'Valor atual inválido' });
      }
    }

    if (title == null && target == null && current == null) {
      return res.status(400).json({ error: 'Nada para atualizar' });
    }

    try {
      const goal = await store.updateGoal(id, title, target, current);
      if (!goal) {
        return res.status(400).json({ error: 'Nada para atualizar' });
      }

      const io = req.app.get('io');
      if (io) {
        await broadcastGoals(io);
      }

      res.json({ goal });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Erro ao atualizar meta' });
    }
  });

  router.delete('/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    try {
      const store = getStore();
      const deleted = await store.deleteGoal(id);
      if (!deleted) {
        return res.status(404).json({ error: 'Meta não encontrada' });
      }

      const io = req.app.get('io');
      if (io) {
        await broadcastGoals(io);
      }

      res.status(204).end();
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Erro ao excluir meta' });
    }
  });

  return router;
}

module.exports = { createGoalsRouter };
