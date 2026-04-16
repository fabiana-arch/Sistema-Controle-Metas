# Sistema de Controle de Metas (online)

Aplicação web com **cadastro de usuários**, **login** e **metas compartilhadas**: qualquer alteração aparece para todos quase na hora (WebSocket).

## Rodar localmente

```bash
npm install
cp .env.example .env
# Edite .env e defina JWT_SECRET com um valor forte em produção.
npm start
```

Abra `http://localhost:3000`. Crie uma conta ou entre; as metas são as mesmas para todos os usuários.

## Colocar na internet

1. Hospede este Node.js em um serviço com URL pública (Railway, Render, Fly.io, VPS, etc.).
2. Defina a variável de ambiente `JWT_SECRET` (obrigatório em produção).
3. O arquivo SQLite fica em `data/app.db` no disco do servidor — faça backup se precisar. Em ambientes efêmeros, considere volume persistente ou migrar para PostgreSQL depois.

HTTPS na URL pública é recomendado para proteger login e token.

## API (resumo)

- `POST /api/auth/register` — corpo: `{ name, email, password }`
- `POST /api/auth/login` — corpo: `{ email, password }`
- `GET /api/goals` — cabeçalho `Authorization: Bearer <token>`
- `POST /api/goals` — `{ title, target, current? }`
- `PATCH /api/goals/:id` — `{ title?, target?, current? }`
- `DELETE /api/goals/:id`

Evento Socket.io após mudanças: `goals:sync` com a lista completa de metas.
