# Sistema de Controle de Metas (online)

Aplicação web com **cadastro de usuários**, **login** e **metas compartilhadas**: alterações aparecem para todos quase na hora (WebSocket).

## Rodar no computador

```bash
npm install
cp .env.example .env
# Defina JWT_SECRET no .env
npm start
```

Abra `http://localhost:3000`. Sem `DATABASE_URL`, o app usa **SQLite** em `data/app.db`.

## Colocar na internet (quem não é programadora)

Guia passo a passo com **Render** e ficheiro pronto **`render.yaml`** (PostgreSQL grátis + site):

- [docs/IMPLANTAR_RENDER_PASSO_A_PASSO.md](docs/IMPLANTAR_RENDER_PASSO_A_PASSO.md)

Resumo técnico:

- Com **`DATABASE_URL`** (PostgreSQL): dados na nuvem — ideal para Render plano grátis (disco do *web service* é apagado em cada deploy).
- Sem **`DATABASE_URL`**: **SQLite** em ficheiro — bom em VPS com disco persistente ou no seu PC.

Defina sempre **`JWT_SECRET`** forte em produção (no Blueprint do Render pode ser gerado automaticamente).

## API (resumo)

- `POST /api/auth/register` — `{ name, email, password }`
- `POST /api/auth/login` — `{ email, password }`
- `GET /api/goals` — cabeçalho `Authorization: Bearer <token>`
- `POST /api/goals` — `{ title, target, current? }`
- `PATCH /api/goals/:id` — `{ title?, target?, current? }`
- `DELETE /api/goals/:id`

Evento Socket.io após mudanças: `goals:sync` com a lista completa de metas.
