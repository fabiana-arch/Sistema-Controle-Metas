const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const gerarToken = (usuario) => {
    return jwt.sign(
        { id: usuario.id, email: usuario.email, role: usuario.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
};

const registrar = async (req, res) => {
    const { nome, email, senha, role } = req.body;

    if (!nome || !email || !senha) {
        return res.status(400).json({ erro: 'Nome, email e senha são obrigatórios' });
    }

    if (senha.length < 6) {
        return res.status(400).json({ erro: 'A senha deve ter pelo menos 6 caracteres' });
    }

    try {
        const existe = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email.toLowerCase()]);
        if (existe.rows.length > 0) {
            return res.status(409).json({ erro: 'Email já cadastrado' });
        }

        const senhaHash = await bcrypt.hash(senha, 12);
        const novoRole = role === 'admin' ? 'admin' : 'user';

        const result = await pool.query(
            'INSERT INTO usuarios (nome, email, senha, role) VALUES ($1, $2, $3, $4) RETURNING id, nome, email, role, criado_em',
            [nome.trim(), email.toLowerCase().trim(), senhaHash, novoRole]
        );

        const usuario = result.rows[0];
        const token = gerarToken(usuario);

        res.status(201).json({
            mensagem: 'Usuário criado com sucesso',
            token,
            usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, role: usuario.role },
        });
    } catch (err) {
        console.error('Erro ao registrar usuário:', err);
        res.status(500).json({ erro: 'Erro interno ao criar usuário' });
    }
};

const login = async (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({ erro: 'Email e senha são obrigatórios' });
    }

    try {
        const result = await pool.query(
            'SELECT id, nome, email, senha, role, ativo FROM usuarios WHERE email = $1',
            [email.toLowerCase().trim()]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ erro: 'Email ou senha incorretos' });
        }

        const usuario = result.rows[0];

        if (!usuario.ativo) {
            return res.status(403).json({ erro: 'Conta desativada. Entre em contato com o administrador.' });
        }

        const senhaValida = await bcrypt.compare(senha, usuario.senha);
        if (!senhaValida) {
            return res.status(401).json({ erro: 'Email ou senha incorretos' });
        }

        const token = gerarToken(usuario);

        res.json({
            mensagem: 'Login realizado com sucesso',
            token,
            usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, role: usuario.role },
        });
    } catch (err) {
        console.error('Erro ao fazer login:', err);
        res.status(500).json({ erro: 'Erro interno ao processar login' });
    }
};

const perfil = async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, nome, email, role, criado_em FROM usuarios WHERE id = $1',
            [req.usuario.id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ erro: 'Erro ao buscar perfil' });
    }
};

const listarUsuarios = async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, nome, email, role, ativo, criado_em FROM usuarios ORDER BY criado_em DESC'
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ erro: 'Erro ao listar usuários' });
    }
};

const alterarSenha = async (req, res) => {
    const { senhaAtual, novaSenha } = req.body;

    if (!senhaAtual || !novaSenha) {
        return res.status(400).json({ erro: 'Senha atual e nova senha são obrigatórias' });
    }

    if (novaSenha.length < 6) {
        return res.status(400).json({ erro: 'A nova senha deve ter pelo menos 6 caracteres' });
    }

    try {
        const result = await pool.query('SELECT senha FROM usuarios WHERE id = $1', [req.usuario.id]);
        const senhaValida = await bcrypt.compare(senhaAtual, result.rows[0].senha);

        if (!senhaValida) {
            return res.status(401).json({ erro: 'Senha atual incorreta' });
        }

        const novaSenhaHash = await bcrypt.hash(novaSenha, 12);
        await pool.query('UPDATE usuarios SET senha = $1 WHERE id = $2', [novaSenhaHash, req.usuario.id]);

        res.json({ mensagem: 'Senha alterada com sucesso' });
    } catch (err) {
        res.status(500).json({ erro: 'Erro ao alterar senha' });
    }
};

module.exports = { registrar, login, perfil, listarUsuarios, alterarSenha };
