const { verifyToken } = require("../services/token");

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token de autenticação não enviado." });
  }

  const token = authHeader.replace("Bearer ", "").trim();

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    return next();
  } catch (_error) {
    return res.status(401).json({ message: "Token inválido ou expirado." });
  }
}

module.exports = {
  requireAuth,
};
