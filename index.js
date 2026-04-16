require('dotenv').config();

const http = require('http');
const path = require('path');
const express = require('express');
const { Server } = require('socket.io');

const { initDb } = require('./src/db');
const { createAuthRouter } = require('./src/routes/auth');
const { createGoalsRouter } = require('./src/routes/goals');
const { verifyToken } = require('./src/auth');

const PORT = Number(process.env.PORT) || 3000;

initDb();

const app = express();
app.use(express.json({ limit: '512kb' }));

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', createAuthRouter());
app.use('/api/goals', createGoalsRouter());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: true, credentials: true },
});

io.use((socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) {
      return next(new Error('Não autorizado'));
    }
    verifyToken(token);
    socket.data.token = token;
    return next();
  } catch {
    return next(new Error('Não autorizado'));
  }
});

io.on('connection', (socket) => {
  socket.join('condominio');
});

app.set('io', io);

server.listen(PORT, () => {
  console.log(`Servidor em http://localhost:${PORT}`);
});
