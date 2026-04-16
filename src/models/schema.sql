-- Schema do banco de dados

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(200) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP DEFAULT NOW(),
    atualizado_em TIMESTAMP DEFAULT NOW()
);

-- Tabela de condomínios
CREATE TABLE IF NOT EXISTS condominios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(200) NOT NULL,
    endereco TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP DEFAULT NOW(),
    atualizado_em TIMESTAMP DEFAULT NOW()
);

-- Tabela de metas
CREATE TABLE IF NOT EXISTS metas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condominio_id UUID REFERENCES condominios(id) ON DELETE CASCADE,
    titulo VARCHAR(300) NOT NULL,
    descricao TEXT,
    valor_meta NUMERIC(15, 2) DEFAULT 0,
    valor_atual NUMERIC(15, 2) DEFAULT 0,
    status VARCHAR(30) DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluida', 'cancelada')),
    data_inicio DATE,
    data_fim DATE,
    responsavel_id UUID REFERENCES usuarios(id),
    criado_por UUID REFERENCES usuarios(id),
    criado_em TIMESTAMP DEFAULT NOW(),
    atualizado_em TIMESTAMP DEFAULT NOW()
);

-- Tabela de atualizações de progresso das metas
CREATE TABLE IF NOT EXISTS progresso_metas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meta_id UUID REFERENCES metas(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES usuarios(id),
    valor_anterior NUMERIC(15, 2),
    valor_novo NUMERIC(15, 2),
    status_anterior VARCHAR(30),
    status_novo VARCHAR(30),
    observacao TEXT,
    criado_em TIMESTAMP DEFAULT NOW()
);

-- Tabela de notificações
CREATE TABLE IF NOT EXISTS notificacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    titulo VARCHAR(300) NOT NULL,
    mensagem TEXT,
    lida BOOLEAN DEFAULT FALSE,
    tipo VARCHAR(50) DEFAULT 'info',
    criado_em TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_metas_condominio ON metas(condominio_id);
CREATE INDEX IF NOT EXISTS idx_metas_responsavel ON metas(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_progresso_meta ON progresso_metas(meta_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario ON notificacoes(usuario_id);

-- Trigger para atualizar atualizado_em automaticamente
CREATE OR REPLACE FUNCTION atualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_usuarios_updated
    BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

CREATE OR REPLACE TRIGGER trg_condominios_updated
    BEFORE UPDATE ON condominios
    FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

CREATE OR REPLACE TRIGGER trg_metas_updated
    BEFORE UPDATE ON metas
    FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();
