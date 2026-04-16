const bcrypt = require("bcryptjs");
const pool = require("../config/database");
const { signToken } = require("../services/token");

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

async function register(req, res) {
  const name = String(req.body.name || "").trim();
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || "");

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Nome, e-mail e senha são obrigatórios." });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: "A senha precisa ter pelo menos 6 caracteres." });
  }

  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);

  if (existing.rowCount > 0) {
    return res.status(409).json({ message: "Já existe usuário com este e-mail." });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const created = await pool.query(
    `
      INSERT INTO users (name, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, name, email, created_at
    `,
    [name, email, passwordHash]
  );

  const user = created.rows[0];
  const token = signToken({ id: user.id, email: user.email, name: user.name });

  return res.status(201).json({ user, token });
}

async function login(req, res) {
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || "");

  if (!email || !password) {
    return res.status(400).json({ message: "E-mail e senha são obrigatórios." });
  }

  const result = await pool.query(
    `
      SELECT id, name, email, password_hash
      FROM users
      WHERE email = $1
      LIMIT 1
    `,
    [email]
  );

  if (result.rowCount === 0) {
    return res.status(401).json({ message: "Credenciais inválidas." });
  }

  const user = result.rows[0];
  const isValid = await bcrypt.compare(password, user.password_hash);

  if (!isValid) {
    return res.status(401).json({ message: "Credenciais inválidas." });
  }

  const token = signToken({ id: user.id, email: user.email, name: user.name });

  return res.status(200).json({
    user: { id: user.id, name: user.name, email: user.email },
    token,
  });
}

async function me(req, res) {
  const result = await pool.query(
    `
      SELECT id, name, email, created_at
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [req.user.id]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ message: "Usuário não encontrado." });
  }

  return res.status(200).json({ user: result.rows[0] });
}

module.exports = {
  register,
  login,
  me,
};
