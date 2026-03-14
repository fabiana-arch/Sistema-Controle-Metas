// src/config/database.js

const { Pool } = require('pg');

// Configurações do banco de dados PostgreSQL
const pool = new Pool({
    user: 'your_user',
    host: 'localhost',
    database: 'your_database',
    password: 'your_password',
    port: 5432,
});

// Exporta o pool para ser utilizado em outros módulos
module.exports = pool;