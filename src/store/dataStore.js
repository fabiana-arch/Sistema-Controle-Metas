const bcrypt = require("bcryptjs");

const { hasDatabaseUrl, query } = require("../config/database");
const { ensureFileStore, readStore, writeStore } = require("./fileStore");

const VALID_STATUSES = new Set(["pending", "in_progress", "done"]);

function normalizeUser(user) {
  return {
    id: String(user.id),
    name: user.name,
    email: user.email,
    createdAt: user.created_at || user.createdAt,
  };
}

function normalizeGoal(goal) {
  return {
    id: String(goal.id),
    title: goal.title,
    description: goal.description || "",
    status: goal.status,
    ownerId: String(goal.owner_id || goal.ownerId),
    ownerName: goal.owner_name || goal.ownerName,
    createdAt: goal.created_at || goal.createdAt,
    updatedAt: goal.updated_at || goal.updatedAt,
  };
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function sanitizeText(value) {
  return String(value || "").trim();
}

function ensureValidStatus(status) {
  if (!VALID_STATUSES.has(status)) {
    throw new Error("Status invalido.");
  }
}

async function initializeStore() {
  if (hasDatabaseUrl) {
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS goals (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done')),
        owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    return;
  }

  await ensureFileStore();
}

async function findUserByEmail(email) {
  const normalizedEmail = normalizeEmail(email);

  if (hasDatabaseUrl) {
    const result = await query(
      "SELECT id, name, email, password_hash, created_at FROM users WHERE email = $1 LIMIT 1",
      [normalizedEmail]
    );

    return result.rows[0] || null;
  }

  const store = await readStore();
  return store.users.find((user) => user.email === normalizedEmail) || null;
}

async function findUserById(userId) {
  if (hasDatabaseUrl) {
    const result = await query(
      "SELECT id, name, email, created_at FROM users WHERE id = $1 LIMIT 1",
      [Number(userId)]
    );

    return result.rows[0] ? normalizeUser(result.rows[0]) : null;
  }

  const store = await readStore();
  const user = store.users.find((entry) => String(entry.id) === String(userId));
  return user ? normalizeUser(user) : null;
}

async function createUser({ name, email, password }) {
  const cleanName = sanitizeText(name);
  const normalizedEmail = normalizeEmail(email);
  const passwordHash = await bcrypt.hash(password, 10);

  if (hasDatabaseUrl) {
    const result = await query(
      `
        INSERT INTO users (name, email, password_hash)
        VALUES ($1, $2, $3)
        RETURNING id, name, email, created_at
      `,
      [cleanName, normalizedEmail, passwordHash]
    );

    return normalizeUser(result.rows[0]);
  }

  const store = await readStore();
  const now = new Date().toISOString();
  const user = {
    id: store.counters.userId++,
    name: cleanName,
    email: normalizedEmail,
    password_hash: passwordHash,
    createdAt: now,
  };

  store.users.push(user);
  await writeStore(store);
  return normalizeUser(user);
}

async function verifyPassword(user, password) {
  return bcrypt.compare(password, user.password_hash);
}

async function listGoals() {
  if (hasDatabaseUrl) {
    const result = await query(`
      SELECT
        g.id,
        g.title,
        g.description,
        g.status,
        g.owner_id,
        u.name AS owner_name,
        g.created_at,
        g.updated_at
      FROM goals g
      INNER JOIN users u ON u.id = g.owner_id
      ORDER BY g.updated_at DESC, g.id DESC
    `);

    return result.rows.map(normalizeGoal);
  }

  const store = await readStore();
  return [...store.goals]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .map(normalizeGoal);
}

async function createGoal({ title, description, owner }) {
  const cleanTitle = sanitizeText(title);
  const cleanDescription = String(description || "").trim();

  if (hasDatabaseUrl) {
    const result = await query(
      `
        INSERT INTO goals (title, description, owner_id)
        VALUES ($1, $2, $3)
        RETURNING id, title, description, status, owner_id, created_at, updated_at
      `,
      [cleanTitle, cleanDescription, Number(owner.id)]
    );

    return normalizeGoal({
      ...result.rows[0],
      owner_name: owner.name,
    });
  }

  const store = await readStore();
  const now = new Date().toISOString();
  const goal = {
    id: store.counters.goalId++,
    title: cleanTitle,
    description: cleanDescription,
    status: "pending",
    ownerId: String(owner.id),
    ownerName: owner.name,
    createdAt: now,
    updatedAt: now,
  };

  store.goals.push(goal);
  await writeStore(store);
  return normalizeGoal(goal);
}

async function getGoalById(goalId) {
  if (hasDatabaseUrl) {
    const result = await query(
      `
        SELECT
          g.id,
          g.title,
          g.description,
          g.status,
          g.owner_id,
          u.name AS owner_name,
          g.created_at,
          g.updated_at
        FROM goals g
        INNER JOIN users u ON u.id = g.owner_id
        WHERE g.id = $1
        LIMIT 1
      `,
      [Number(goalId)]
    );

    return result.rows[0] ? normalizeGoal(result.rows[0]) : null;
  }

  const store = await readStore();
  const goal = store.goals.find((entry) => String(entry.id) === String(goalId));
  return goal ? normalizeGoal(goal) : null;
}

async function updateGoal(goalId, updates) {
  if (updates.status !== undefined) {
    ensureValidStatus(updates.status);
  }

  if (hasDatabaseUrl) {
    const fields = [];
    const values = [];

    if (updates.title !== undefined) {
      values.push(sanitizeText(updates.title));
      fields.push(`title = $${values.length}`);
    }

    if (updates.description !== undefined) {
      values.push(String(updates.description).trim());
      fields.push(`description = $${values.length}`);
    }

    if (updates.status !== undefined) {
      values.push(updates.status);
      fields.push(`status = $${values.length}`);
    }

    if (fields.length === 0) {
      return getGoalById(goalId);
    }

    values.push(Number(goalId));
    const result = await query(
      `
        UPDATE goals
        SET ${fields.join(", ")}, updated_at = NOW()
        WHERE id = $${values.length}
        RETURNING id
      `,
      values
    );

    if (!result.rows[0]) {
      return null;
    }

    return getGoalById(result.rows[0].id);
  }

  const store = await readStore();
  const goal = store.goals.find((entry) => String(entry.id) === String(goalId));

  if (!goal) {
    return null;
  }

  if (updates.title !== undefined) {
    goal.title = sanitizeText(updates.title);
  }

  if (updates.description !== undefined) {
    goal.description = String(updates.description).trim();
  }

  if (updates.status !== undefined) {
    goal.status = updates.status;
  }

  goal.updatedAt = new Date().toISOString();
  await writeStore(store);
  return normalizeGoal(goal);
}

async function deleteGoal(goalId) {
  if (hasDatabaseUrl) {
    const result = await query("DELETE FROM goals WHERE id = $1", [Number(goalId)]);
    return result.rowCount > 0;
  }

  const store = await readStore();
  const index = store.goals.findIndex((entry) => String(entry.id) === String(goalId));

  if (index === -1) {
    return false;
  }

  store.goals.splice(index, 1);
  await writeStore(store);
  return true;
}

module.exports = {
  VALID_STATUSES,
  createGoal,
  createUser,
  deleteGoal,
  findUserByEmail,
  findUserById,
  getGoalById,
  initializeStore,
  listGoals,
  updateGoal,
  verifyPassword,
};
