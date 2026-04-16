const jwt = require("jsonwebtoken");

function getJwtSecret() {
  return process.env.JWT_SECRET || "troque-este-segredo-em-producao";
}

function signToken(user) {
  return jwt.sign(
    {
      userId: String(user.id),
      email: user.email,
      name: user.name,
    },
    getJwtSecret(),
    { expiresIn: "7d" }
  );
}

function verifyToken(token) {
  return jwt.verify(token, getJwtSecret());
}

module.exports = {
  signToken,
  verifyToken,
};
