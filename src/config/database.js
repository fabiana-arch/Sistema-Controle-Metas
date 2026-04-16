const { Pool } = require("pg");

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

let pool = null;

if (hasDatabaseUrl) {
  const sslEnabled = process.env.DATABASE_SSL === "true" || process.env.NODE_ENV === "production";

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: sslEnabled ? { rejectUnauthorized: false } : false,
  });
}

async function query(text, params = []) {
  if (!pool) {
    throw new Error("DATABASE_URL nao configurada.");
  }

  return pool.query(text, params);
}

module.exports = {
  hasDatabaseUrl,
  pool,
  query,
};