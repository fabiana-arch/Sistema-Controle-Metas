require("dotenv").config();

const http = require("http");
const path = require("path");
const express = require("express");
const cors = require("cors");
const { Server } = require("socket.io");
const authRoutes = require("./src/routes/authRoutes");
const goalRoutes = require("./src/routes/goalRoutes");
const { initDatabase } = require("./src/db/init");
const { verifyToken } = require("./src/services/token");
const pool = require("./src/config/database");

const app = express();
const server = http.createServer(app);

const allowedOrigins = process.env.FRONTEND_ORIGIN
  ? process.env.FRONTEND_ORIGIN.split(",").map((origin) => origin.trim())
  : "*";

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

app.set("io", io);

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT NOW()");
    res.status(200).json({ status: "ok" });
  } catch (_error) {
    res.status(500).json({ status: "database_unreachable" });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/goals", goalRoutes);

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;

  if (!token) {
    return next();
  }

  try {
    const decoded = verifyToken(token);
    socket.user = decoded;
    return next();
  } catch (error) {
    return next(new Error("Token inválido"));
  }
});

io.on("connection", (socket) => {
  if (socket.user?.id) {
    socket.join(`user:${socket.user.id}`);
  }
});

app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ message: "Rota não encontrada." });
  }

  return res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: "Erro interno do servidor." });
});

const port = Number(process.env.PORT || 3000);

(async () => {
  try {
    await initDatabase();
    server.listen(port, () => {
      console.log(`Servidor rodando em http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Falha ao iniciar aplicação:", error);
    process.exit(1);
  }
})();
