const jwt = require("jsonwebtoken");

const secret = process.env.JWT_SECRET;

if (!secret) {
  throw new Error("JWT_SECRET não definido no ambiente.");
}

function signToken(payload) {
  return jwt.sign(payload, secret, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });
}

function verifyToken(token) {
  return jwt.verify(token, secret);
}

module.exports = {
  signToken,
  verifyToken,
};
