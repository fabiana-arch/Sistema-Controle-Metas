const pool = require("../config/database");

function sanitizeStatus(inputStatus) {
  const status = String(inputStatus || "pendente").trim().toLowerCase();
  const allowed = new Set(["pendente", "andamento", "concluida"]);
  return allowed.has(status) ? status : "pendente";
}

function formatGoal(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    ownerUserId: row.owner_user_id,
    ownerName: row.owner_name,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listGoals(_req, res) {
  const result = await pool.query(
    `
      SELECT
        g.id,
        g.title,
        g.description,
        g.status,
        g.owner_user_id,
        u.name AS owner_name,
        g.created_by,
        g.updated_by,
        g.created_at,
        g.updated_at
      FROM goals g
      LEFT JOIN users u ON u.id = g.owner_user_id
      ORDER BY g.updated_at DESC
    `
  );

  return res.status(200).json({
    goals: result.rows.map(formatGoal),
  });
}

async function createGoal(req, res) {
  const title = String(req.body.title || "").trim();
  const description = String(req.body.description || "").trim();
  const status = sanitizeStatus(req.body.status);
  const ownerUserId = Number(req.body.ownerUserId || req.user.id);

  if (!title) {
    return res.status(400).json({ message: "O título da meta é obrigatório." });
  }

  const ownerResult = await pool.query(
    "SELECT id FROM users WHERE id = $1 LIMIT 1",
    [ownerUserId]
  );

  if (ownerResult.rowCount === 0) {
    return res.status(400).json({ message: "Usuário responsável não encontrado." });
  }

  const created = await pool.query(
    `
      INSERT INTO goals (title, description, status, owner_user_id, created_by, updated_by)
      VALUES ($1, $2, $3, $4, $5, $5)
      RETURNING *
    `,
    [title, description, status, ownerUserId, req.user.id]
  );

  const fullGoal = await pool.query(
    `
      SELECT
        g.id,
        g.title,
        g.description,
        g.status,
        g.owner_user_id,
        u.name AS owner_name,
        g.created_by,
        g.updated_by,
        g.created_at,
        g.updated_at
      FROM goals g
      LEFT JOIN users u ON u.id = g.owner_user_id
      WHERE g.id = $1
      LIMIT 1
    `,
    [created.rows[0].id]
  );

  const goal = formatGoal(fullGoal.rows[0]);
  req.app.get("io").emit("goals:changed", { action: "created", goal });

  return res.status(201).json({ goal });
}

async function updateGoal(req, res) {
  const goalId = Number(req.params.id);

  if (!goalId) {
    return res.status(400).json({ message: "ID inválido." });
  }

  const currentGoalResult = await pool.query(
    `
      SELECT title, description, status, owner_user_id
      FROM goals
      WHERE id = $1
      LIMIT 1
    `,
    [goalId]
  );

  if (currentGoalResult.rowCount === 0) {
    return res.status(404).json({ message: "Meta não encontrada." });
  }

  const currentGoal = currentGoalResult.rows[0];

  const title = req.body.title !== undefined
    ? String(req.body.title).trim()
    : currentGoal.title;
  const description = req.body.description !== undefined
    ? String(req.body.description).trim()
    : currentGoal.description;
  const status = req.body.status !== undefined
    ? sanitizeStatus(req.body.status)
    : currentGoal.status;
  const ownerUserId = req.body.ownerUserId !== undefined
    ? Number(req.body.ownerUserId)
    : currentGoal.owner_user_id;

  if (!title) {
    return res.status(400).json({ message: "O título da meta é obrigatório." });
  }

  const ownerResult = await pool.query(
    "SELECT id FROM users WHERE id = $1 LIMIT 1",
    [ownerUserId]
  );

  if (ownerResult.rowCount === 0) {
    return res.status(400).json({ message: "Usuário responsável não encontrado." });
  }

  const updated = await pool.query(
    `
      UPDATE goals
      SET
        title = $1,
        description = $2,
        status = $3,
        owner_user_id = $4,
        updated_by = $5,
        updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `,
    [title, description, status, ownerUserId, req.user.id, goalId]
  );

  const fullGoal = await pool.query(
    `
      SELECT
        g.id,
        g.title,
        g.description,
        g.status,
        g.owner_user_id,
        u.name AS owner_name,
        g.created_by,
        g.updated_by,
        g.created_at,
        g.updated_at
      FROM goals g
      LEFT JOIN users u ON u.id = g.owner_user_id
      WHERE g.id = $1
      LIMIT 1
    `,
    [goalId]
  );

  const goal = formatGoal(fullGoal.rows[0]);
  req.app.get("io").emit("goals:changed", { action: "updated", goal });

  return res.status(200).json({ goal });
}

async function deleteGoal(req, res) {
  const goalId = Number(req.params.id);

  if (!goalId) {
    return res.status(400).json({ message: "ID inválido." });
  }

  const deleted = await pool.query(
    `
      DELETE FROM goals
      WHERE id = $1
      RETURNING id
    `,
    [goalId]
  );

  if (deleted.rowCount === 0) {
    return res.status(404).json({ message: "Meta não encontrada." });
  }

  req.app.get("io").emit("goals:changed", { action: "deleted", goalId });

  return res.status(200).json({ message: "Meta removida com sucesso." });
}

module.exports = {
  listGoals,
  createGoal,
  updateGoal,
  deleteGoal,
};
