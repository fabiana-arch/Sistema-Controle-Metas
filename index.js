require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const pool = require('./src/config/database');
const fs = require('fs');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
});

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'src/public')));

// Injeta socket.io nas requisições para ser usado nos controllers
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Rotas da API
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/condominios', require('./src/routes/condominios'));
app.use('/api/metas', require('./src/routes/metas'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// Serve o frontend para qualquer rota não encontrada
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'src/public', 'index.html'));
});

// Socket.io - gerencia salas e eventos em tempo real
io.on('connection', (socket) => {
    console.log(`Cliente conectado: ${socket.id}`);

    socket.on('entrar:sala', (sala) => {
        socket.join(sala);
        console.log(`${socket.id} entrou na sala: ${sala}`);
    });

    socket.on('sair:sala', (sala) => {
        socket.leave(sala);
    });

    socket.on('disconnect', () => {
        console.log(`Cliente desconectado: ${socket.id}`);
    });
});

// Inicialização e criação das tabelas
const inicializar = async () => {
    try {
        const schema = fs.readFileSync(path.join(__dirname, 'src/models/schema.sql'), 'utf8');
        await pool.query(schema);
        console.log('Schema do banco de dados inicializado com sucesso');
    } catch (err) {
        console.error('Erro ao inicializar schema:', err.message);
    }

    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
        console.log(`\n🚀 Servidor rodando na porta ${PORT}`);
        console.log(`   http://localhost:${PORT}\n`);
    });
};

inicializar();
