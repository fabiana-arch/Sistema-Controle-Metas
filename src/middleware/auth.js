const { findUserById } = require("../store/dataStore");
const { verifyToken } = require("../utils/auth");

function extractTokenFromHeader(headerValue) {
  if (!headerValue || !headerValue.startsWith("Bearer ")) {
    return null;
  }

  return headerValue.slice("Bearer ".length).trim();
}

async function resolveUserFromToken(token) {
  if (!token) {
    return null;
  }

  const payload = verifyToken(token);
  return findUserById(payload.userId);
}

async function requireAuth(req, res, next) {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    const user = await resolveUserFromToken(token);

    if (!user) {
      return res.status(401).json({ error: "Nao autenticado." });
    }

    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ error: "Token invalido." });
  }
}

async function requireSocketAuth(socket, next) {
  try {
    const token = socket.handshake.auth?.token;
    const user = await resolveUserFromToken(token);

    if (!user) {
      return next(new Error("Nao autenticado."));
    }

    socket.user = user;
    return next();
  } catch (error) {
    return next(new Error("Token invalido."));
  }
}

module.exports = {
  requireAuth,
  requireSocketAuth,
};
