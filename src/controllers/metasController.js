const pool = require('../config/database');

const listar = async (req, res) => {
    const { condominio_id, status } = req.query;

    try {
        let query = `
            SELECT m.*, 
                   c.nome AS condominio_nome,
                   u.nome AS responsavel_nome,
                   ROUND((m.valor_atual / NULLIF(m.valor_meta, 0)) * 100, 1) AS percentual
            FROM metas m
            LEFT JOIN condominios c ON c.id = m.condominio_id
            LEFT JOIN usuarios u ON u.id = m.responsavel_id
            WHERE 1=1
        `;
        const params = [];

        if (condominio_id) {
            params.push(condominio_id);
            query += ` AND m.condominio_id = $${params.length}`;
        }

        if (status) {
            params.push(status);
            query += ` AND m.status = $${params.length}`;
        }

        query += ' ORDER BY m.criado_em DESC';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao listar metas' });
    }
};

const buscarPorId = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            `SELECT m.*, c.nome AS condominio_nome, u.nome AS responsavel_nome,
                    ROUND((m.valor_atual / NULLIF(m.valor_meta, 0)) * 100, 1) AS percentual
             FROM metas m
             LEFT JOIN condominios c ON c.id = m.condominio_id
             LEFT JOIN usuarios u ON u.id = m.responsavel_id
             WHERE m.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ erro: 'Meta não encontrada' });
        }

        const progresso = await pool.query(
            `SELECT p.*, u.nome AS usuario_nome
             FROM progresso_metas p
             LEFT JOIN usuarios u ON u.id = p.usuario_id
             WHERE p.meta_id = $1
             ORDER BY p.criado_em DESC
             LIMIT 20`,
            [id]
        );

        res.json({ ...result.rows[0], historico: progresso.rows });
    } catch (err) {
        res.status(500).json({ erro: 'Erro ao buscar meta' });
    }
};

const criar = async (req, res) => {
    const { condominio_id, titulo, descricao, valor_meta, data_inicio, data_fim, responsavel_id } = req.body;

    if (!titulo) {
        return res.status(400).json({ erro: 'Título da meta é obrigatório' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO metas (condominio_id, titulo, descricao, valor_meta, data_inicio, data_fim, responsavel_id, criado_por)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [condominio_id || null, titulo.trim(), descricao?.trim(), valor_meta || 0, data_inicio || null, data_fim || null, responsavel_id || null, req.usuario.id]
        );

        const meta = result.rows[0];

        await pool.query(
            `INSERT INTO progresso_metas (meta_id, usuario_id, valor_anterior, valor_novo, status_anterior, status_novo, observacao)
             VALUES ($1, $2, 0, $3, NULL, 'pendente', 'Meta criada')`,
            [meta.id, req.usuario.id, valor_meta || 0]
        );

        req.io.emit('meta:criada', meta);

        res.status(201).json(meta);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao criar meta' });
    }
};

const atualizar = async (req, res) => {
    const { id } = req.params;
    const { titulo, descricao, valor_meta, valor_atual, status, data_inicio, data_fim, responsavel_id, observacao } = req.body;

    try {
        const anterior = await pool.query('SELECT * FROM metas WHERE id = $1', [id]);
        if (anterior.rows.length === 0) {
            return res.status(404).json({ erro: 'Meta não encontrada' });
        }

        const metaAtual = anterior.rows[0];

        const result = await pool.query(
            `UPDATE metas SET
                titulo = COALESCE($1, titulo),
                descricao = COALESCE($2, descricao),
                valor_meta = COALESCE($3, valor_meta),
                valor_atual = COALESCE($4, valor_atual),
                status = COALESCE($5, status),
                data_inicio = COALESCE($6, data_inicio),
                data_fim = COALESCE($7, data_fim),
                responsavel_id = COALESCE($8, responsavel_id)
             WHERE id = $9
             RETURNING *`,
            [titulo?.trim(), descricao?.trim(), valor_meta, valor_atual, status, data_inicio, data_fim, responsavel_id, id]
        );

        const metaAtualizada = result.rows[0];

        if (valor_atual !== undefined || status !== undefined) {
            await pool.query(
                `INSERT INTO progresso_metas (meta_id, usuario_id, valor_anterior, valor_novo, status_anterior, status_novo, observacao)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                    id,
                    req.usuario.id,
                    metaAtual.valor_atual,
                    valor_atual !== undefined ? valor_atual : metaAtual.valor_atual,
                    metaAtual.status,
                    status || metaAtual.status,
                    observacao || null,
                ]
            );
        }

        req.io.emit('meta:atualizada', metaAtualizada);

        res.json(metaAtualizada);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao atualizar meta' });
    }
};

const remover = async (req, res) => {
    const { id } = req.params;

    try {
        await pool.query('DELETE FROM metas WHERE id = $1', [id]);
        req.io.emit('meta:removida', { id });
        res.json({ mensagem: 'Meta removida com sucesso' });
    } catch (err) {
        res.status(500).json({ erro: 'Erro ao remover meta' });
    }
};

const resumo = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                COUNT(*) FILTER (WHERE status = 'pendente') AS pendentes,
                COUNT(*) FILTER (WHERE status = 'em_andamento') AS em_andamento,
                COUNT(*) FILTER (WHERE status = 'concluida') AS concluidas,
                COUNT(*) FILTER (WHERE status = 'cancelada') AS canceladas,
                COUNT(*) AS total,
                COALESCE(SUM(valor_meta), 0) AS total_valor_meta,
                COALESCE(SUM(valor_atual), 0) AS total_valor_atual,
                ROUND(
                    COALESCE(SUM(valor_atual), 0) / NULLIF(COALESCE(SUM(valor_meta), 0), 0) * 100, 1
                ) AS percentual_geral
            FROM metas
        `);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ erro: 'Erro ao calcular resumo' });
    }
};

module.exports = { listar, buscarPorId, criar, atualizar, remover, resumo };
