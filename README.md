# Sistema de Controle de Metas Online

Aplicacao web colaborativa pronta para publicar online, com:

- cadastro e login de usuarios;
- metas compartilhadas entre todos os usuarios autenticados;
- atualizacao em tempo real com Socket.IO;
- persistencia central no servidor;
- suporte a PostgreSQL para producao e arquivo local para demonstracao.

## Como rodar localmente

1. Instale as dependencias:

   ```bash
   npm install
   ```

2. Crie o arquivo `.env` baseado no `.env.example`.

3. Inicie a aplicacao:

   ```bash
   npm run dev
   ```

4. Abra `http://localhost:3000`.

## Como deixar 100% online

Para que todos acessem de qualquer lugar e vejam as alteracoes em tempo real, publique esta aplicacao em um servidor online (Render, Railway, Fly.io, VPS, etc.).

### Configuracao minima para publicacao

- subir este projeto Node.js;
- configurar as variaveis `PORT` e `JWT_SECRET`;
- para persistencia profissional, configurar `DATABASE_URL` com um PostgreSQL online;
- se o provedor exigir SSL no banco, definir `DATABASE_SSL=true`.

## API disponivel

### Autenticacao

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Metas

- `GET /api/goals`
- `POST /api/goals`
- `PATCH /api/goals/:goalId`
- `DELETE /api/goals/:goalId`

## Observacoes

- Quando um usuario cria, edita ou exclui uma meta, o servidor transmite um novo snapshot para todos os navegadores conectados.
- Se quiser, no proximo passo eu posso adaptar esta base para o HTML final que voce mencionou, mantendo o backend online ja pronto.
