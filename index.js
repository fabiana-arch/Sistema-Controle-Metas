require("dotenv").config();

const http = require("http");
const path = require("path");
const express = require("express");
const { Server } = require("socket.io");

const { requireSocketAuth } = require("./src/middleware/auth");
const { createAuthRouter } = require("./src/routes/auth");
const { createGoalsRouter } = require("./src/routes/goals");
const { initializeStore, listGoals } = require("./src/store/dataStore");

async function bootstrap() {
  await initializeStore();

  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: true,
      credentials: true,
    },
  });

  app.use(express.json());
  app.use(express.static(path.join(__dirname, "public")));

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", createAuthRouter());
  app.use("/api/goals", createGoalsRouter(io));

  io.use(requireSocketAuth);
  io.on("connection", async (socket) => {
    socket.emit("goals:snapshot", await listGoals());
  });

  const port = Number(process.env.PORT || 3000);
  server.listen(port, () => {
    console.log(`Servidor online em http://localhost:${port}`);
  });
}

bootstrap().catch((error) => {
  console.error("Falha ao iniciar a aplicacao:", error);
  process.exit(1);
});
