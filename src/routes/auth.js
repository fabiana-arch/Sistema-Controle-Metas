const express = require("express");

const { requireAuth } = require("../middleware/auth");
const { createUser, findUserByEmail, verifyPassword } = require("../store/dataStore");
const { signToken } = require("../utils/auth");

function createAuthRouter() {
  const router = express.Router();

  router.post("/register", async (req, res) => {
    try {
      const { name, email, password } = req.body;

      if (!String(name || "").trim()) {
        return res.status(400).json({ error: "Informe o nome." });
      }

      if (!String(email || "").trim()) {
        return res.status(400).json({ error: "Informe o e-mail." });
      }

      if (String(password || "").length < 6) {
        return res.status(400).json({ error: "A senha precisa ter pelo menos 6 caracteres." });
      }

      const existingUser = await findUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ error: "Ja existe um usuario com este e-mail." });
      }

      const user = await createUser({ name, email, password });
      const token = signToken(user);

      return res.status(201).json({ user, token });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Nao foi possivel criar o usuario." });
    }
  });

  router.post("/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const userRecord = await findUserByEmail(email);

      if (!userRecord) {
        return res.status(401).json({ error: "Credenciais invalidas." });
      }

      const passwordMatches = await verifyPassword(userRecord, password);
      if (!passwordMatches) {
        return res.status(401).json({ error: "Credenciais invalidas." });
      }

      const user = {
        id: String(userRecord.id),
        name: userRecord.name,
        email: userRecord.email,
        createdAt: userRecord.created_at || userRecord.createdAt,
      };

      const token = signToken(user);
      return res.json({ user, token });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Nao foi possivel fazer login." });
    }
  });

  router.get("/me", requireAuth, async (req, res) => {
    return res.json({ user: req.user });
  });

  return router;
}

module.exports = {
  createAuthRouter,
};
