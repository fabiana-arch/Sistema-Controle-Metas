const pool = require('../config/database');

const listar = async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM condominios WHERE ativo = TRUE ORDER BY nome ASC'
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ erro: 'Erro ao listar condomínios' });
    }
};

const criar = async (req, res) => {
    const { nome, endereco } = req.body;

    if (!nome) {
        return res.status(400).json({ erro: 'Nome do condomínio é obrigatório' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO condominios (nome, endereco) VALUES ($1, $2) RETURNING *',
            [nome.trim(), endereco?.trim() || null]
        );

        const condominio = result.rows[0];
        req.io.emit('condominio:criado', condominio);

        res.status(201).json(condominio);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao criar condomínio' });
    }
};

const atualizar = async (req, res) => {
    const { id } = req.params;
    const { nome, endereco } = req.body;

    try {
        const result = await pool.query(
            'UPDATE condominios SET nome = COALESCE($1, nome), endereco = COALESCE($2, endereco) WHERE id = $3 AND ativo = TRUE RETURNING *',
            [nome?.trim(), endereco?.trim(), id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ erro: 'Condomínio não encontrado' });
        }

        const condominio = result.rows[0];
        req.io.emit('condominio:atualizado', condominio);

        res.json(condominio);
    } catch (err) {
        res.status(500).json({ erro: 'Erro ao atualizar condomínio' });
    }
};

const remover = async (req, res) => {
    const { id } = req.params;

    try {
        await pool.query('UPDATE condominios SET ativo = FALSE WHERE id = $1', [id]);
        req.io.emit('condominio:removido', { id });
        res.json({ mensagem: 'Condomínio removido com sucesso' });
    } catch (err) {
        res.status(500).json({ erro: 'Erro ao remover condomínio' });
    }
};

module.exports = { listar, criar, atualizar, remover };
