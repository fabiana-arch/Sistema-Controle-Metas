const state = {
  token: localStorage.getItem("authToken") || "",
  user: JSON.parse(localStorage.getItem("authUser") || "null"),
  goals: [],
  socket: null,
};

const elements = {
  authSection: document.getElementById("authSection"),
  appSection: document.getElementById("appSection"),
  registerForm: document.getElementById("registerForm"),
  loginForm: document.getElementById("loginForm"),
  goalForm: document.getElementById("goalForm"),
  goalsList: document.getElementById("goalsList"),
  goalsEmptyState: document.getElementById("goalsEmptyState"),
  logoutButton: document.getElementById("logoutButton"),
  refreshButton: document.getElementById("refreshButton"),
  currentUserName: document.getElementById("currentUserName"),
  currentUserEmail: document.getElementById("currentUserEmail"),
  connectionStatus: document.getElementById("connectionStatus"),
  toast: document.getElementById("toast"),
};

function showToast(message, isError = false) {
  elements.toast.textContent = message;
  elements.toast.className = `toast ${isError ? "error" : ""}`;

  setTimeout(() => {
    elements.toast.className = "toast hidden";
  }, 3000);
}

async function api(path, options = {}) {
  const headers = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(path, {
    ...options,
    headers,
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    throw new Error(payload?.error || "Erro inesperado.");
  }

  return payload;
}

function setConnectionStatus(connected) {
  elements.connectionStatus.textContent = connected ? "Sincronizado" : "Desconectado";
  elements.connectionStatus.className = `status-badge ${connected ? "online" : "offline"}`;
}

function persistSession() {
  if (state.token && state.user) {
    localStorage.setItem("authToken", state.token);
    localStorage.setItem("authUser", JSON.stringify(state.user));
    return;
  }

  localStorage.removeItem("authToken");
  localStorage.removeItem("authUser");
}

function renderAuthState() {
  const authenticated = Boolean(state.token && state.user);
  elements.authSection.classList.toggle("hidden", authenticated);
  elements.appSection.classList.toggle("hidden", !authenticated);

  if (authenticated) {
    elements.currentUserName.textContent = state.user.name;
    elements.currentUserEmail.textContent = state.user.email;
  }
}

function statusLabel(status) {
  if (status === "in_progress") return "Em andamento";
  if (status === "done") return "Concluida";
  return "Pendente";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderGoals() {
  elements.goalsList.innerHTML = "";
  const hasGoals = state.goals.length > 0;
  elements.goalsEmptyState.classList.toggle("hidden", hasGoals);

  if (!hasGoals) {
    return;
  }

  state.goals.forEach((goal) => {
    const article = document.createElement("article");
    article.className = "goal-item";
    article.innerHTML = `
      <div class="goal-meta">
        <span class="pill">${statusLabel(goal.status)}</span>
        <span class="muted">Criada por ${escapeHtml(goal.ownerName)}</span>
      </div>
      <label>
        Titulo
        <input data-field="title" value="${escapeHtml(goal.title)}" />
      </label>
      <label>
        Descricao
        <textarea data-field="description" rows="3">${escapeHtml(goal.description || "")}</textarea>
      </label>
      <label>
        Status
        <select data-field="status">
          <option value="pending" ${goal.status === "pending" ? "selected" : ""}>Pendente</option>
          <option value="in_progress" ${goal.status === "in_progress" ? "selected" : ""}>Em andamento</option>
          <option value="done" ${goal.status === "done" ? "selected" : ""}>Concluida</option>
        </select>
      </label>
      <div class="goal-actions">
        <button type="button" data-action="save">Salvar alteracoes</button>
        <button type="button" class="danger-button" data-action="delete">Excluir</button>
      </div>
      <p class="muted">Ultima atualizacao: ${new Date(goal.updatedAt).toLocaleString("pt-BR")}</p>
    `;

    article.querySelector('[data-action="save"]').addEventListener("click", async () => {
      const title = article.querySelector('[data-field="title"]').value;
      const description = article.querySelector('[data-field="description"]').value;
      const status = article.querySelector('[data-field="status"]').value;

      try {
        await api(`/api/goals/${goal.id}`, {
          method: "PATCH",
          body: JSON.stringify({ title, description, status }),
        });
        showToast("Meta atualizada para todos.");
      } catch (error) {
        showToast(error.message, true);
      }
    });

    article.querySelector('[data-action="delete"]').addEventListener("click", async () => {
      if (!window.confirm(`Excluir a meta "${goal.title}"?`)) {
        return;
      }

      try {
        await api(`/api/goals/${goal.id}`, { method: "DELETE" });
        showToast("Meta removida para todos.");
      } catch (error) {
        showToast(error.message, true);
      }
    });

    elements.goalsList.appendChild(article);
  });
}

async function refreshGoals() {
  const payload = await api("/api/goals");
  state.goals = payload.goals;
  renderGoals();
}

function disconnectSocket() {
  if (state.socket) {
    state.socket.disconnect();
    state.socket = null;
  }
  setConnectionStatus(false);
}

function connectSocket() {
  if (!state.token) {
    disconnectSocket();
    return;
  }

  disconnectSocket();
  state.socket = io({
    auth: {
      token: state.token,
    },
  });

  state.socket.on("connect", () => {
    setConnectionStatus(true);
  });

  state.socket.on("disconnect", () => {
    setConnectionStatus(false);
  });

  state.socket.on("connect_error", (error) => {
    setConnectionStatus(false);
    showToast(error.message || "Falha de sincronizacao.", true);
  });

  state.socket.on("goals:snapshot", (goals) => {
    state.goals = goals;
    renderGoals();
  });
}

function setSession(user, token) {
  state.user = user;
  state.token = token;
  persistSession();
  renderAuthState();
  connectSocket();
}

function clearSession() {
  state.user = null;
  state.token = "";
  state.goals = [];
  persistSession();
  disconnectSocket();
  renderAuthState();
  renderGoals();
}

async function restoreSession() {
  renderAuthState();
  if (!state.token) {
    return;
  }

  try {
    const payload = await api("/api/auth/me");
    state.user = payload.user;
    persistSession();
    renderAuthState();
    await refreshGoals();
    connectSocket();
  } catch (error) {
    clearSession();
  }
}

elements.registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);

  try {
    const payload = await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: formData.get("name"),
        email: formData.get("email"),
        password: formData.get("password"),
      }),
    });

    setSession(payload.user, payload.token);
    await refreshGoals();
    event.currentTarget.reset();
    showToast("Usuario criado com sucesso.");
  } catch (error) {
    showToast(error.message, true);
  }
});

elements.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);

  try {
    const payload = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: formData.get("email"),
        password: formData.get("password"),
      }),
    });

    setSession(payload.user, payload.token);
    await refreshGoals();
    event.currentTarget.reset();
    showToast("Login realizado com sucesso.");
  } catch (error) {
    showToast(error.message, true);
  }
});

elements.goalForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);

  try {
    await api("/api/goals", {
      method: "POST",
      body: JSON.stringify({
        title: formData.get("title"),
        description: formData.get("description"),
      }),
    });

    event.currentTarget.reset();
    showToast("Meta criada e compartilhada.");
  } catch (error) {
    showToast(error.message, true);
  }
});

elements.logoutButton.addEventListener("click", () => {
  clearSession();
  showToast("Sessao encerrada.");
});

elements.refreshButton.addEventListener("click", async () => {
  try {
    await refreshGoals();
    showToast("Painel atualizado.");
  } catch (error) {
    showToast(error.message, true);
  }
});

restoreSession();
