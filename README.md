# Sistema de Controle de Metas (Online)

Sistema web para controle de metas com:

- Cadastro e login de usuários (JWT)
- Persistência em PostgreSQL
- Atualização em tempo real para todos os usuários conectados (Socket.IO)
- Frontend web estático servido pelo próprio backend (`public/index.html`)

## 1) Rodar localmente

### Pré-requisitos

- Node.js 18+
- PostgreSQL acessível (local ou cloud)

### Configuração

1. Instale dependências:

```bash
npm install
```

2. Crie o arquivo `.env` baseado em `.env.example`:

```bash
cp .env.example .env
```

3. Ajuste as variáveis:

- `DATABASE_URL`: string de conexão PostgreSQL
- `DATABASE_SSL`: `true` para bancos cloud que exigem SSL
- `JWT_SECRET`: segredo forte para assinar tokens
- `PORT`: porta da aplicação
- `FRONTEND_ORIGIN`: domínio(s) permitidos no CORS

4. Suba a aplicação:

```bash
npm run dev
```

5. Abra no navegador:

`http://localhost:3000`

## 2) API principal

### Autenticação

- `POST /api/auth/register` -> cria usuário
- `POST /api/auth/login` -> autentica usuário
- `GET /api/auth/me` -> dados do usuário logado (Bearer Token)

### Metas (autenticado)

- `GET /api/goals` -> lista metas
- `POST /api/goals` -> cria meta
- `PUT /api/goals/:id` -> atualiza meta
- `DELETE /api/goals/:id` -> remove meta

## 3) Tempo real (Socket.IO)

Quando uma meta é criada, editada ou removida, o servidor emite o evento:

- `goals:changed`

Todos os clientes conectados recebem e atualizam a tela automaticamente.

## 4) Publicar 100% online

Você pode publicar em plataformas como Render, Railway ou Fly.io.

### Exemplo (Render/Railway)

1. Suba este repositório no GitHub.
2. Crie um serviço Node.js apontando para este repo.
3. Configure variáveis de ambiente:
   - `DATABASE_URL`
   - `DATABASE_SSL=true` (normalmente em cloud)
   - `JWT_SECRET`
   - `JWT_EXPIRES_IN=7d`
   - `FRONTEND_ORIGIN=https://seu-dominio-online.com`
4. Start command:

```bash
npm start
```

5. Garanta que `DATABASE_URL` aponta para um PostgreSQL online (Neon, Supabase, Render PostgreSQL, Railway PostgreSQL etc.).

Após isso, qualquer usuário com internet poderá acessar, e as atualizações aparecerão para todos em tempo real.
