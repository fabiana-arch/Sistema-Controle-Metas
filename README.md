# Sistema de Controle de Metas — Gestão de Condomínios

Sistema web **online e colaborativo** para gerenciamento de metas de condomínios, com:

- **Autenticação** com JWT (login e cadastro de usuários)
- **Tempo real** via Socket.io — todas as atualizações aparecem instantaneamente para todos os usuários conectados
- **Banco de dados PostgreSQL** — dados persistentes na nuvem
- **Perfis de acesso**: `admin` (acesso total) e `user` (visualização e edição)

---

## Funcionalidades

| Funcionalidade | Descrição |
|---|---|
| Login / Cadastro | Usuários criam conta e fazem login com JWT |
| Dashboard | Resumo de metas, progresso financeiro, feed de atividades |
| Metas | Criar, editar, remover e acompanhar metas com histórico |
| Condomínios | Cadastro e gerenciamento de condomínios |
| Usuários | Listagem de usuários (admin) |
| Tempo Real | Toda alteração é propagada instantaneamente via WebSocket |

---

## Pré-requisitos

- **Node.js** >= 16
- **PostgreSQL** >= 13 (pode ser local ou na nuvem: [Railway](https://railway.app), [Supabase](https://supabase.com), [Neon](https://neon.tech), etc.)

---

## Instalação Local

```bash
# 1. Clone o repositório
git clone <url-do-repositorio>
cd sistema-controle-metas

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env
# Edite o arquivo .env com suas credenciais

# 4. Inicie o servidor
npm run dev      # desenvolvimento (com auto-reload)
npm start        # produção
```

Acesse em: **http://localhost:3000**

---

## Variáveis de Ambiente (`.env`)

```env
# URL do banco PostgreSQL
DATABASE_URL=postgres://usuario:senha@host:5432/nome_banco

# Chave secreta JWT (use uma string longa e aleatória)
JWT_SECRET=sua_chave_secreta_muito_longa

# Porta do servidor
PORT=3000

# Ambiente
NODE_ENV=development
```

---

## Deploy em Produção

### Railway (recomendado — gratuito)

1. Crie conta em [railway.app](https://railway.app)
2. Novo projeto → "Deploy from GitHub repo"
3. Adicione um serviço **PostgreSQL** no mesmo projeto
4. Configure as variáveis de ambiente:
   - `DATABASE_URL` — copiada do serviço PostgreSQL
   - `JWT_SECRET` — qualquer string longa e aleatória
   - `NODE_ENV=production`
5. Deploy automático a cada push

### Render

1. Crie conta em [render.com](https://render.com)
2. New → Web Service → conecte o repositório
3. Build command: `npm install`
4. Start command: `npm start`
5. Adicione as variáveis de ambiente

### Heroku

```bash
heroku create nome-do-app
heroku addons:create heroku-postgresql:mini
heroku config:set JWT_SECRET=sua_chave_secreta NODE_ENV=production
git push heroku main
```

---

## Estrutura do Projeto

```
├── index.js                    # Servidor principal (Express + Socket.io)
├── src/
│   ├── config/
│   │   └── database.js         # Pool de conexão PostgreSQL
│   ├── controllers/
│   │   ├── authController.js   # Login, registro, usuários
│   │   ├── metasController.js  # CRUD de metas + histórico
│   │   └── condominiosController.js
│   ├── middleware/
│   │   └── auth.js             # Validação JWT
│   ├── models/
│   │   └── schema.sql          # Schema do banco (criado automaticamente)
│   ├── routes/
│   │   ├── auth.js
│   │   ├── metas.js
│   │   └── condominios.js
│   └── public/                 # Frontend (SPA)
│       ├── index.html
│       ├── css/style.css
│       └── js/app.js
└── .env.example
```

---

## API REST

### Autenticação
| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/auth/registrar` | Cria novo usuário |
| `POST` | `/api/auth/login` | Faz login, retorna token JWT |
| `GET` | `/api/auth/perfil` | Retorna perfil do usuário autenticado |
| `GET` | `/api/auth/usuarios` | Lista usuários (admin only) |

### Metas
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/metas` | Lista metas (filtros: `condominio_id`, `status`) |
| `GET` | `/api/metas/resumo` | Resumo/estatísticas |
| `GET` | `/api/metas/:id` | Detalhe + histórico de uma meta |
| `POST` | `/api/metas` | Cria meta |
| `PUT` | `/api/metas/:id` | Atualiza meta |
| `DELETE` | `/api/metas/:id` | Remove meta |

### Condomínios
| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/condominios` | Lista condomínios |
| `POST` | `/api/condominios` | Cria (admin) |
| `PUT` | `/api/condominios/:id` | Atualiza (admin) |
| `DELETE` | `/api/condominios/:id` | Remove (admin) |

---

## Eventos Socket.io (Tempo Real)

| Evento | Direção | Descrição |
|---|---|---|
| `meta:criada` | Servidor → Clientes | Nova meta criada |
| `meta:atualizada` | Servidor → Clientes | Meta modificada |
| `meta:removida` | Servidor → Clientes | Meta removida |
| `condominio:criado` | Servidor → Clientes | Novo condomínio |
| `condominio:atualizado` | Servidor → Clientes | Condomínio alterado |
| `condominio:removido` | Servidor → Clientes | Condomínio removido |
