const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../db');
const { signToken } = require('../auth');

function createAuthRouter() {
  const router = express.Router();

  router.post('/register', (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const name = String(req.body?.name || '').trim();

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' });
    }

    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: 'E-mail já cadastrado' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const info = db
      .prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)')
      .run(email, passwordHash, name);

    const user = { id: info.lastInsertRowid, email, name };
    const token = signToken({ sub: user.id, email: user.email, name: user.name });
    return res.status(201).json({ token, user });
  });

  router.post('/login', (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
    }

    const db = getDb();
    const row = db.prepare('SELECT id, email, name, password_hash FROM users WHERE email = ?').get(email);
    if (!row || !bcrypt.compareSync(password, row.password_hash)) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos' });
    }

    const user = { id: row.id, email: row.email, name: row.name };
    const token = signToken({ sub: user.id, email: user.email, name: user.name });
    return res.json({ token, user });
  });

  return router;
}

module.exports = { createAuthRouter };
