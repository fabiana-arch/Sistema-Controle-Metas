const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const Database = require('better-sqlite3');

let backend = null;

function mapGoalRow(row) {
  if (!row) return null;
  const current = row.current != null ? row.current : row.current_amount;
  return {
    id: row.id,
    title: row.title,
    target: Number(row.target),
    current: Number(current),
    created_at: row.created_at,
    updated_at: row.updated_at,
    created_by_name: row.created_by_name,
  };
}

function createSqliteBackend() {
  const dataDir = path.join(__dirname, '..', 'data');
  const dbPath = process.env.SQLITE_PATH || path.join(dataDir, 'app.db');
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      target REAL NOT NULL DEFAULT 0,
      current REAL NOT NULL DEFAULT 0,
      created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_goals_updated ON goals(updated_at DESC);
  `);

  return {
    async findUserByEmail(email) {
      return db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    },
    async findUserWithHashByEmail(email) {
      return db
        .prepare('SELECT id, email, name, password_hash FROM users WHERE email = ?')
        .get(email);
    },
    async insertUser(email, passwordHash, name) {
      const info = db
        .prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)')
        .run(email, passwordHash, name);
      return { id: Number(info.lastInsertRowid), email, name };
    },
    async listGoals() {
      const rows = db
        .prepare(
          `SELECT g.id, g.title, g.target, g.current, g.created_at, g.updated_at,
                  u.name AS created_by_name
           FROM goals g
           JOIN users u ON u.id = g.created_by
           ORDER BY g.updated_at DESC`
        )
        .all();
      return rows.map(mapGoalRow);
    },
    async insertGoal(title, target, current, createdBy) {
      const info = db
        .prepare(
          `INSERT INTO goals (title, target, current, created_by)
           VALUES (?, ?, ?, ?)`
        )
        .run(title, target, current, createdBy);
      const id = Number(info.lastInsertRowid);
      return db
        .prepare(
          `SELECT g.id, g.title, g.target, g.current, g.created_at, g.updated_at,
                  u.name AS created_by_name
           FROM goals g
           JOIN users u ON u.id = g.created_by
           WHERE g.id = ?`
        )
        .get(id);
    },
    async goalExists(id) {
      const row = db.prepare('SELECT id FROM goals WHERE id = ?').get(id);
      return Boolean(row);
    },
    async updateGoal(id, title, target, current) {
      const updates = [];
      const params = [];
      if (title != null) {
        updates.push('title = ?');
        params.push(title);
      }
      if (target != null) {
        updates.push('target = ?');
        params.push(target);
      }
      if (current != null) {
        updates.push('current = ?');
        params.push(current);
      }
      if (updates.length === 0) return null;
      updates.push("updated_at = datetime('now')");
      params.push(id);
      db.prepare(`UPDATE goals SET ${updates.join(', ')} WHERE id = ?`).run(...params);
      return db
        .prepare(
          `SELECT g.id, g.title, g.target, g.current, g.created_at, g.updated_at,
                  u.name AS created_by_name
           FROM goals g
           JOIN users u ON u.id = g.created_by
           WHERE g.id = ?`
        )
        .get(id);
    },
    async deleteGoal(id) {
      const info = db.prepare('DELETE FROM goals WHERE id = ?').run(id);
      return info.changes > 0;
    },
  };
}

function createPostgresBackend(databaseUrl) {
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 10,
    idleTimeoutMillis: 30_000,
    ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false },
  });

  const initSql = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS goals (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      target DOUBLE PRECISION NOT NULL DEFAULT 0,
      current_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_goals_updated ON goals(updated_at DESC);
  `;

  return {
    pool,
    async _ensure() {
      await pool.query(initSql);
    },
    async findUserByEmail(email) {
      const { rows } = await pool.query('SELECT id FROM users WHERE lower(email) = lower($1)', [
        email,
      ]);
      return rows[0] || null;
    },
    async findUserWithHashByEmail(email) {
      const { rows } = await pool.query(
        'SELECT id, email, name, password_hash FROM users WHERE lower(email) = lower($1)',
        [email]
      );
      return rows[0] || null;
    },
    async insertUser(email, passwordHash, name) {
      const { rows } = await pool.query(
        'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name',
        [email, passwordHash, name]
      );
      return { id: Number(rows[0].id), email: rows[0].email, name: rows[0].name };
    },
    async listGoals() {
      const { rows } = await pool.query(
        `SELECT g.id, g.title, g.target, g.current_amount AS current, g.created_at, g.updated_at,
                u.name AS created_by_name
         FROM goals g
         JOIN users u ON u.id = g.created_by
         ORDER BY g.updated_at DESC`
      );
      return rows.map(mapGoalRow);
    },
    async insertGoal(title, target, current, createdBy) {
      const { rows } = await pool.query(
        `INSERT INTO goals (title, target, current_amount, created_by)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [title, target, current, createdBy]
      );
      const id = rows[0].id;
      const g = await pool.query(
        `SELECT g.id, g.title, g.target, g.current_amount AS current, g.created_at, g.updated_at,
                u.name AS created_by_name
         FROM goals g
         JOIN users u ON u.id = g.created_by
         WHERE g.id = $1`,
        [id]
      );
      return g.rows[0];
    },
    async goalExists(id) {
      const { rows } = await pool.query('SELECT id FROM goals WHERE id = $1', [id]);
      return Boolean(rows[0]);
    },
    async updateGoal(id, title, target, current) {
      const sets = [];
      const params = [];
      let i = 1;
      if (title != null) {
        sets.push(`title = $${i++}`);
        params.push(title);
      }
      if (target != null) {
        sets.push(`target = $${i++}`);
        params.push(target);
      }
      if (current != null) {
        sets.push(`current_amount = $${i++}`);
        params.push(current);
      }
      if (sets.length === 0) return null;
      sets.push('updated_at = NOW()');
      params.push(id);
      await pool.query(`UPDATE goals SET ${sets.join(', ')} WHERE id = $${i}`, params);
      const { rows } = await pool.query(
        `SELECT g.id, g.title, g.target, g.current_amount AS current, g.created_at, g.updated_at,
                u.name AS created_by_name
         FROM goals g
         JOIN users u ON u.id = g.created_by
         WHERE g.id = $1`,
        [id]
      );
      return rows[0] || null;
    },
    async deleteGoal(id) {
      const { rowCount } = await pool.query('DELETE FROM goals WHERE id = $1', [id]);
      return rowCount > 0;
    },
  };
}

async function initStore() {
  const databaseUrl = process.env.DATABASE_URL && String(process.env.DATABASE_URL).trim();
  if (databaseUrl) {
    const pg = createPostgresBackend(databaseUrl);
    await pg._ensure();
    backend = pg;
    console.log('Banco: PostgreSQL (DATABASE_URL)');
    return;
  }
  backend = createSqliteBackend();
  console.log('Banco: SQLite (local ou SQLITE_PATH)');
}

function getStore() {
  if (!backend) {
    throw new Error('Store não inicializado');
  }
  return backend;
}

module.exports = { initStore, getStore };
