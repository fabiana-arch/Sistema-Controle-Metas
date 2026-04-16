const express = require('express');
const { getDb } = require('../db');
const { authMiddleware } = require('../auth');

function broadcastGoals(io) {
  const db = getDb();
  const goals = db
    .prepare(
      `SELECT g.id, g.title, g.target, g.current, g.created_at, g.updated_at,
              u.name AS created_by_name
       FROM goals g
       JOIN users u ON u.id = g.created_by
       ORDER BY g.updated_at DESC`
    )
    .all();
  io.to('condominio').emit('goals:sync', { goals });
}

function createGoalsRouter() {
  const router = express.Router();
  router.use(authMiddleware);

  router.get('/', (req, res) => {
    const db = getDb();
    const goals = db
      .prepare(
        `SELECT g.id, g.title, g.target, g.current, g.created_at, g.updated_at,
                u.name AS created_by_name
         FROM goals g
         JOIN users u ON u.id = g.created_by
         ORDER BY g.updated_at DESC`
      )
      .all();
    res.json({ goals });
  });

  router.post('/', (req, res) => {
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

    const db = getDb();
    const info = db
      .prepare(
        `INSERT INTO goals (title, target, current, created_by)
         VALUES (?, ?, ?, ?)`
      )
      .run(title, target, current, req.user.id);

    const goal = db
      .prepare(
        `SELECT g.id, g.title, g.target, g.current, g.created_at, g.updated_at,
                u.name AS created_by_name
         FROM goals g
         JOIN users u ON u.id = g.created_by
         WHERE g.id = ?`
      )
      .get(info.lastInsertRowid);

    const io = req.app.get('io');
    if (io) {
      broadcastGoals(io);
    }

    res.status(201).json({ goal });
  });

  router.patch('/:id', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const db = getDb();
    const existing = db.prepare('SELECT id FROM goals WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Meta não encontrada' });
    }

    const updates = [];
    const params = [];

    if (req.body.title != null) {
      const title = String(req.body.title).trim();
      if (!title) {
        return res.status(400).json({ error: 'Título inválido' });
      }
      updates.push('title = ?');
      params.push(title);
    }
    if (req.body.target != null) {
      const target = Number(req.body.target);
      if (Number.isNaN(target) || target < 0) {
        return res.status(400).json({ error: 'Meta (valor alvo) inválida' });
      }
      updates.push('target = ?');
      params.push(target);
    }
    if (req.body.current != null) {
      const current = Number(req.body.current);
      if (Number.isNaN(current) || current < 0) {
        return res.status(400).json({ error: 'Valor atual inválido' });
      }
      updates.push('current = ?');
      params.push(current);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nada para atualizar' });
    }

    updates.push("updated_at = datetime('now')");
    params.push(id);

    db.prepare(`UPDATE goals SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const goal = db
      .prepare(
        `SELECT g.id, g.title, g.target, g.current, g.created_at, g.updated_at,
                u.name AS created_by_name
         FROM goals g
         JOIN users u ON u.id = g.created_by
         WHERE g.id = ?`
      )
      .get(id);

    const io = req.app.get('io');
    if (io) {
      broadcastGoals(io);
    }

    res.json({ goal });
  });

  router.delete('/:id', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const db = getDb();
    const info = db.prepare('DELETE FROM goals WHERE id = ?').run(id);
    if (info.changes === 0) {
      return res.status(404).json({ error: 'Meta não encontrada' });
    }

    const io = req.app.get('io');
    if (io) {
      broadcastGoals(io);
    }

    res.status(204).end();
  });

  return router;
}

module.exports = { createGoalsRouter };
