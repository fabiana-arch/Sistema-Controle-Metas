const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const autenticar = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ erro: 'Token de autenticação não fornecido' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const result = await pool.query(
            'SELECT id, nome, email, role FROM usuarios WHERE id = $1 AND ativo = TRUE',
            [decoded.id]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ erro: 'Usuário não encontrado ou inativo' });
        }

        req.usuario = result.rows[0];
        next();
    } catch (err) {
        return res.status(403).json({ erro: 'Token inválido ou expirado' });
    }
};

const soAdmin = (req, res, next) => {
    if (req.usuario.role !== 'admin') {
        return res.status(403).json({ erro: 'Acesso restrito a administradores' });
    }
    next();
};

module.exports = { autenticar, soAdmin };
