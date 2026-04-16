/* ===== ESTADO GLOBAL ===== */
const State = {
    token: localStorage.getItem('token') || null,
    usuario: JSON.parse(localStorage.getItem('usuario') || 'null'),
    metas: [],
    condominios: [],
    usuarios: [],
    feed: [],
};

const API = '/api';
let socket = null;

/* ===== INICIALIZAÇÃO ===== */
document.addEventListener('DOMContentLoaded', () => {
    if (State.token && State.usuario) {
        iniciarApp();
    }
});

function iniciarApp() {
    document.getElementById('auth-container').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');
    document.getElementById('user-name-sidebar').textContent = State.usuario.nome;

    if (State.usuario.role === 'admin') {
        document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
    }

    conectarSocket();
    carregarDados();
}

/* ===== SOCKET.IO ===== */
function conectarSocket() {
    socket = io({ auth: { token: State.token } });

    socket.on('connect', () => {
        setConexaoStatus(true);
    });

    socket.on('disconnect', () => {
        setConexaoStatus(false);
    });

    socket.on('meta:criada', (meta) => {
        State.metas.unshift(meta);
        renderizarMetas();
        adicionarFeed(`Nova meta criada: ${meta.titulo}`, '🎯');
        toast(`Nova meta: "${meta.titulo}"`, 'success');
        carregarResumo();
    });

    socket.on('meta:atualizada', (meta) => {
        const idx = State.metas.findIndex(m => m.id === meta.id);
        if (idx !== -1) State.metas[idx] = { ...State.metas[idx], ...meta };
        else State.metas.unshift(meta);
        renderizarMetas();
        adicionarFeed(`Meta atualizada: ${meta.titulo}`, '✏️');
        toast(`Meta "${meta.titulo}" atualizada`, 'info');
        carregarResumo();
    });

    socket.on('meta:removida', ({ id }) => {
        State.metas = State.metas.filter(m => m.id !== id);
        renderizarMetas();
        carregarResumo();
    });

    socket.on('condominio:criado', (cond) => {
        State.condominios.push(cond);
        renderizarCondominios();
        toast(`Condomínio "${cond.nome}" criado`, 'success');
    });

    socket.on('condominio:atualizado', (cond) => {
        const idx = State.condominios.findIndex(c => c.id === cond.id);
        if (idx !== -1) State.condominios[idx] = cond;
        renderizarCondominios();
    });

    socket.on('condominio:removido', ({ id }) => {
        State.condominios = State.condominios.filter(c => c.id !== id);
        renderizarCondominios();
    });
}

function setConexaoStatus(online) {
    const dot = document.getElementById('conn-dot');
    const status = document.getElementById('conn-status');
    dot.className = 'dot ' + (online ? 'connected' : 'disconnected');
    status.textContent = online ? 'Online' : 'Desconectado';
}

/* ===== API HELPER ===== */
async function api(method, endpoint, body = null) {
    const opts = {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(State.token ? { Authorization: `Bearer ${State.token}` } : {}),
        },
    };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(`${API}${endpoint}`, opts);
    const data = await res.json();

    if (!res.ok) throw new Error(data.erro || 'Erro desconhecido');
    return data;
}

/* ===== AUTH ===== */
function mostrarTab(tab) {
    document.querySelectorAll('.tab-btn').forEach((b, i) => {
        b.classList.toggle('active', (i === 0 && tab === 'login') || (i === 1 && tab === 'registrar'));
    });
    document.getElementById('tab-login').classList.toggle('active', tab === 'login');
    document.getElementById('tab-registrar').classList.toggle('active', tab === 'registrar');
    esconderMsgAuth();
}

function mostrarMsgAuth(msg, tipo = 'error') {
    const el = document.getElementById('auth-msg');
    el.textContent = msg;
    el.className = `auth-msg ${tipo}`;
    el.classList.remove('hidden');
}

function esconderMsgAuth() {
    document.getElementById('auth-msg').classList.add('hidden');
}

async function fazerLogin(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-login');
    btn.disabled = true;
    btn.textContent = 'Entrando...';

    try {
        const data = await api('POST', '/auth/login', {
            email: document.getElementById('login-email').value,
            senha: document.getElementById('login-senha').value,
        });

        State.token = data.token;
        State.usuario = data.usuario;
        localStorage.setItem('token', data.token);
        localStorage.setItem('usuario', JSON.stringify(data.usuario));

        iniciarApp();
    } catch (err) {
        mostrarMsgAuth(err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Entrar no Sistema';
    }
}

async function fazerRegistro(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-registrar');
    btn.disabled = true;
    btn.textContent = 'Criando conta...';

    try {
        const data = await api('POST', '/auth/registrar', {
            nome: document.getElementById('reg-nome').value,
            email: document.getElementById('reg-email').value,
            senha: document.getElementById('reg-senha').value,
            role: document.getElementById('reg-role').value,
        });

        State.token = data.token;
        State.usuario = data.usuario;
        localStorage.setItem('token', data.token);
        localStorage.setItem('usuario', JSON.stringify(data.usuario));

        iniciarApp();
    } catch (err) {
        mostrarMsgAuth(err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Criar Conta';
    }
}

function sair() {
    State.token = null;
    State.usuario = null;
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    if (socket) socket.disconnect();

    document.getElementById('app-container').classList.add('hidden');
    document.getElementById('auth-container').classList.remove('hidden');
}

/* ===== CARREGAMENTO DE DADOS ===== */
async function carregarDados() {
    await Promise.all([carregarMetas(), carregarCondominios(), carregarResumo()]);
    if (State.usuario.role === 'admin') await carregarUsuarios();
    popularSelects();
}

async function carregarMetas() {
    try {
        State.metas = await api('GET', '/metas');
        renderizarMetas();
    } catch (err) {
        console.error('Erro ao carregar metas:', err);
    }
}

async function carregarCondominios() {
    try {
        State.condominios = await api('GET', '/condominios');
        renderizarCondominios();
    } catch (err) {
        console.error('Erro ao carregar condomínios:', err);
    }
}

async function carregarUsuarios() {
    try {
        State.usuarios = await api('GET', '/auth/usuarios');
        renderizarUsuarios();
    } catch (err) {
        console.error('Erro ao carregar usuários:', err);
    }
}

async function carregarResumo() {
    try {
        const resumo = await api('GET', '/metas/resumo');
        document.getElementById('stat-total').textContent = resumo.total || 0;
        document.getElementById('stat-concluidas').textContent = resumo.concluidas || 0;
        document.getElementById('stat-andamento').textContent = resumo.em_andamento || 0;
        document.getElementById('stat-pendentes').textContent = resumo.pendentes || 0;

        const pct = resumo.percentual_geral || 0;
        document.getElementById('dash-valor-atual').textContent = formatarMoeda(resumo.total_valor_atual || 0);
        document.getElementById('dash-valor-meta').textContent = formatarMoeda(resumo.total_valor_meta || 0);
        document.getElementById('dash-progress-bar').style.width = Math.min(pct, 100) + '%';
        document.getElementById('dash-percentual').textContent = pct + '%';
    } catch (err) {
        console.error('Erro ao carregar resumo:', err);
    }
}

/* ===== SELECTS ===== */
function popularSelects() {
    const condSelects = document.querySelectorAll('#filtro-condominio, #meta-condominio');
    condSelects.forEach(sel => {
        const val = sel.value;
        while (sel.options.length > (sel.id === 'filtro-condominio' ? 1 : 0)) sel.remove(sel.options.length - 1);
        State.condominios.forEach(c => {
            const opt = new Option(c.nome, c.id);
            sel.add(opt);
        });
        sel.value = val;
    });

    const respSel = document.getElementById('meta-responsavel');
    if (respSel) {
        while (respSel.options.length > 0) respSel.remove(0);
        respSel.add(new Option('Nenhum responsável', ''));
        State.usuarios.forEach(u => respSel.add(new Option(u.nome, u.id)));
    }
}

/* ===== RENDERIZAÇÕES ===== */
function renderizarMetas() {
    const container = document.getElementById('lista-metas');
    const filtroCond = document.getElementById('filtro-condominio')?.value;
    const filtroStatus = document.getElementById('filtro-status')?.value;

    let metas = State.metas;
    if (filtroCond) metas = metas.filter(m => m.condominio_id === filtroCond);
    if (filtroStatus) metas = metas.filter(m => m.status === filtroStatus);

    if (metas.length === 0) {
        container.innerHTML = '<p class="empty-state">Nenhuma meta encontrada. Crie a primeira!</p>';
        return;
    }

    container.innerHTML = metas.map(meta => {
        const pct = meta.percentual || 0;
        const barPct = Math.min(pct, 100);
        return `
        <div class="meta-card" onclick="verDetalhesMeta('${meta.id}')">
            <div class="meta-card-header">
                <div>
                    <div class="meta-titulo">${escHtml(meta.titulo)}</div>
                    <div class="meta-condominio">${meta.condominio_nome ? '🏘️ ' + escHtml(meta.condominio_nome) : '—'}</div>
                </div>
                <span class="badge badge-${meta.status}">${formatarStatus(meta.status)}</span>
            </div>
            <div class="meta-progress-wrapper">
                <div class="meta-progress-bar" style="width:${barPct}%"></div>
            </div>
            <div class="meta-values">
                <span>${formatarMoeda(meta.valor_atual || 0)} de ${formatarMoeda(meta.valor_meta || 0)}</span>
                <span>${pct}%</span>
            </div>
            ${meta.responsavel_nome ? `<div style="font-size:.8rem;color:var(--text-muted);margin-top:.5rem">👤 ${escHtml(meta.responsavel_nome)}</div>` : ''}
            <div class="meta-card-actions">
                <button class="btn btn-sm btn-ghost" onclick="event.stopPropagation(); editarMeta('${meta.id}')">✏️ Editar</button>
                ${State.usuario.role === 'admin' ? `<button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); confirmarRemocaoMeta('${meta.id}', '${escHtml(meta.titulo)}')">🗑️</button>` : ''}
            </div>
        </div>`;
    }).join('');
}

function renderizarCondominios() {
    const container = document.getElementById('lista-condominios');
    if (State.condominios.length === 0) {
        container.innerHTML = '<p class="empty-state">Nenhum condomínio cadastrado.</p>';
        return;
    }

    container.innerHTML = State.condominios.map(c => `
        <div class="cond-card">
            <div class="cond-info">
                <strong>${escHtml(c.nome)}</strong>
                <span>${c.endereco ? escHtml(c.endereco) : 'Endereço não informado'}</span>
            </div>
            <div class="cond-actions" style="display:flex;gap:.5rem">
                ${State.usuario.role === 'admin' ? `
                    <button class="btn btn-sm btn-ghost" onclick="editarCondominio('${c.id}')">✏️</button>
                    <button class="btn btn-sm btn-danger" onclick="confirmarRemocaoCondominio('${c.id}', '${escHtml(c.nome)}')">🗑️</button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

function renderizarUsuarios() {
    const container = document.getElementById('lista-usuarios');
    if (State.usuarios.length === 0) {
        container.innerHTML = '<p class="empty-state">Nenhum usuário.</p>';
        return;
    }

    container.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>Nome</th>
                    <th>Email</th>
                    <th>Perfil</th>
                    <th>Status</th>
                    <th>Criado em</th>
                </tr>
            </thead>
            <tbody>
                ${State.usuarios.map(u => `
                <tr>
                    <td><strong>${escHtml(u.nome)}</strong></td>
                    <td>${escHtml(u.email)}</td>
                    <td><span class="badge ${u.role === 'admin' ? 'badge-em_andamento' : 'badge-pendente'}">${u.role}</span></td>
                    <td><span class="badge ${u.ativo ? 'badge-concluida' : 'badge-cancelada'}">${u.ativo ? 'Ativo' : 'Inativo'}</span></td>
                    <td>${formatarData(u.criado_em)}</td>
                </tr>`).join('')}
            </tbody>
        </table>`;
}

/* ===== FEED DE ATUALIZAÇÕES ===== */
function adicionarFeed(texto, icone = '📌') {
    State.feed.unshift({ texto, icone, ts: new Date() });
    if (State.feed.length > 10) State.feed.pop();

    const container = document.getElementById('feed-atualizacoes');
    container.innerHTML = State.feed.map(f => `
        <div class="feed-item">
            <span style="font-size:1rem;flex-shrink:0">${f.icone}</span>
            <div class="feed-text">
                ${escHtml(f.texto)}
                <div class="feed-time">${formatarDataHora(f.ts)}</div>
            </div>
        </div>
    `).join('');
}

/* ===== MODAIS METAS ===== */
function abrirModalMeta(meta = null) {
    const modal = document.getElementById('modal-meta');
    document.getElementById('modal-meta-titulo').textContent = meta ? 'Editar Meta' : 'Nova Meta';
    document.getElementById('meta-id').value = meta?.id || '';
    document.getElementById('meta-titulo').value = meta?.titulo || '';
    document.getElementById('meta-descricao').value = meta?.descricao || '';
    document.getElementById('meta-valor-meta').value = meta?.valor_meta || '';
    document.getElementById('meta-valor-atual').value = meta?.valor_atual || '';
    document.getElementById('meta-status').value = meta?.status || 'pendente';
    document.getElementById('meta-data-inicio').value = meta?.data_inicio ? meta.data_inicio.split('T')[0] : '';
    document.getElementById('meta-data-fim').value = meta?.data_fim ? meta.data_fim.split('T')[0] : '';

    const campObs = document.getElementById('campo-observacao');
    campObs.style.display = meta ? 'block' : 'none';
    document.getElementById('meta-observacao').value = '';

    popularSelects();

    document.getElementById('meta-condominio').value = meta?.condominio_id || '';
    document.getElementById('meta-responsavel').value = meta?.responsavel_id || '';

    modal.classList.remove('hidden');
}

function editarMeta(id) {
    const meta = State.metas.find(m => m.id === id);
    if (meta) abrirModalMeta(meta);
}

async function salvarMeta(e) {
    e.preventDefault();
    const id = document.getElementById('meta-id').value;
    const payload = {
        titulo: document.getElementById('meta-titulo').value,
        descricao: document.getElementById('meta-descricao').value || null,
        valor_meta: parseFloat(document.getElementById('meta-valor-meta').value) || 0,
        valor_atual: parseFloat(document.getElementById('meta-valor-atual').value) || 0,
        status: document.getElementById('meta-status').value,
        condominio_id: document.getElementById('meta-condominio').value || null,
        responsavel_id: document.getElementById('meta-responsavel').value || null,
        data_inicio: document.getElementById('meta-data-inicio').value || null,
        data_fim: document.getElementById('meta-data-fim').value || null,
        observacao: document.getElementById('meta-observacao').value || null,
    };

    try {
        if (id) {
            await api('PUT', `/metas/${id}`, payload);
        } else {
            await api('POST', '/metas', payload);
        }
        fecharModal('modal-meta');
        toast(id ? 'Meta atualizada!' : 'Meta criada!', 'success');
    } catch (err) {
        toast(err.message, 'error');
    }
}

async function confirmarRemocaoMeta(id, titulo) {
    if (!confirm(`Deseja realmente remover a meta "${titulo}"?`)) return;
    try {
        await api('DELETE', `/metas/${id}`);
        toast('Meta removida', 'success');
    } catch (err) {
        toast(err.message, 'error');
    }
}

async function verDetalhesMeta(id) {
    try {
        const meta = await api('GET', `/metas/${id}`);
        document.getElementById('detalhe-titulo').textContent = meta.titulo;

        const pct = meta.percentual || 0;
        document.getElementById('detalhe-body').innerHTML = `
            <div class="detalhe-grid">
                <div class="detalhe-item">
                    <label>Condomínio</label>
                    <span>${meta.condominio_nome || '—'}</span>
                </div>
                <div class="detalhe-item">
                    <label>Status</label>
                    <span class="badge badge-${meta.status}">${formatarStatus(meta.status)}</span>
                </div>
                <div class="detalhe-item">
                    <label>Valor Meta</label>
                    <span>${formatarMoeda(meta.valor_meta || 0)}</span>
                </div>
                <div class="detalhe-item">
                    <label>Valor Atual</label>
                    <span>${formatarMoeda(meta.valor_atual || 0)}</span>
                </div>
                <div class="detalhe-item">
                    <label>Progresso</label>
                    <span>${pct}%</span>
                </div>
                <div class="detalhe-item">
                    <label>Responsável</label>
                    <span>${meta.responsavel_nome || '—'}</span>
                </div>
                <div class="detalhe-item">
                    <label>Data Início</label>
                    <span>${meta.data_inicio ? formatarData(meta.data_inicio) : '—'}</span>
                </div>
                <div class="detalhe-item">
                    <label>Data Fim</label>
                    <span>${meta.data_fim ? formatarData(meta.data_fim) : '—'}</span>
                </div>
            </div>
            ${meta.descricao ? `<div style="margin-bottom:1.5rem"><label style="font-size:.75rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:.5rem">Descrição</label><p style="font-size:.9375rem">${escHtml(meta.descricao)}</p></div>` : ''}
            <div class="progress-bar-wrapper" style="margin-bottom:.5rem"><div class="progress-bar" style="width:${Math.min(pct,100)}%"></div></div>
            
            <div class="historico-title">📋 Histórico de Atualizações</div>
            ${(meta.historico || []).length === 0 ? '<p class="empty-state">Sem histórico.</p>' : meta.historico.map(h => `
                <div class="hist-item">
                    <span class="hist-icon">📝</span>
                    <div>
                        <strong>${escHtml(h.usuario_nome || 'Sistema')}</strong>
                        ${h.status_anterior !== h.status_novo && h.status_novo ? `— Status: <span class="badge badge-${h.status_anterior}">${formatarStatus(h.status_anterior)}</span> → <span class="badge badge-${h.status_novo}">${formatarStatus(h.status_novo)}</span>` : ''}
                        ${h.valor_novo !== null ? `<br>Valor: ${formatarMoeda(h.valor_anterior || 0)} → ${formatarMoeda(h.valor_novo)}` : ''}
                        ${h.observacao ? `<br><em>${escHtml(h.observacao)}</em>` : ''}
                        <div class="feed-time">${formatarDataHora(h.criado_em)}</div>
                    </div>
                </div>
            `).join('')}
        `;

        document.getElementById('modal-detalhe-meta').classList.remove('hidden');
    } catch (err) {
        toast(err.message, 'error');
    }
}

/* ===== MODAIS CONDOMÍNIOS ===== */
function abrirModalCondominio(cond = null) {
    document.getElementById('modal-cond-titulo').textContent = cond ? 'Editar Condomínio' : 'Novo Condomínio';
    document.getElementById('cond-id').value = cond?.id || '';
    document.getElementById('cond-nome').value = cond?.nome || '';
    document.getElementById('cond-endereco').value = cond?.endereco || '';
    document.getElementById('modal-condominio').classList.remove('hidden');
}

function editarCondominio(id) {
    const cond = State.condominios.find(c => c.id === id);
    if (cond) abrirModalCondominio(cond);
}

async function salvarCondominio(e) {
    e.preventDefault();
    const id = document.getElementById('cond-id').value;
    const payload = {
        nome: document.getElementById('cond-nome').value,
        endereco: document.getElementById('cond-endereco').value || null,
    };

    try {
        if (id) {
            await api('PUT', `/condominios/${id}`, payload);
        } else {
            await api('POST', '/condominios', payload);
        }
        fecharModal('modal-condominio');
        toast(id ? 'Condomínio atualizado!' : 'Condomínio criado!', 'success');
    } catch (err) {
        toast(err.message, 'error');
    }
}

async function confirmarRemocaoCondominio(id, nome) {
    if (!confirm(`Deseja realmente remover o condomínio "${nome}"?`)) return;
    try {
        await api('DELETE', `/condominios/${id}`);
        toast('Condomínio removido', 'success');
    } catch (err) {
        toast(err.message, 'error');
    }
}

/* ===== FILTROS ===== */
function filtrarMetas() {
    renderizarMetas();
}

/* ===== NAVEGAÇÃO ===== */
function mostrarPagina(nome, linkEl) {
    document.querySelectorAll('.page').forEach(p => { p.classList.add('hidden'); p.classList.remove('active'); });
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const page = document.getElementById(`page-${nome}`);
    if (page) { page.classList.remove('hidden'); page.classList.add('active'); }
    if (linkEl) linkEl.classList.add('active');

    if (nome === 'condominios') renderizarCondominios();
    if (nome === 'usuarios') renderizarUsuarios();

    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('open');
    }
    return false;
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

/* ===== MODAIS ===== */
function fecharModal(id) {
    document.getElementById(id).classList.add('hidden');
}

/* ===== TOAST ===== */
function toast(msg, tipo = 'info') {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast ${tipo}`;
    el.innerHTML = `<span style="font-size:1.1rem">${tipo === 'success' ? '✅' : tipo === 'error' ? '❌' : tipo === 'warning' ? '⚠️' : 'ℹ️'}</span> ${escHtml(msg)}`;
    container.appendChild(el);
    setTimeout(() => el.remove(), 4000);
}

/* ===== UTILIDADES ===== */
function escHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

function formatarStatus(status) {
    const mapa = { pendente: 'Pendente', em_andamento: 'Em Andamento', concluida: 'Concluída', cancelada: 'Cancelada' };
    return mapa[status] || status;
}

function formatarData(data) {
    if (!data) return '—';
    return new Date(data).toLocaleDateString('pt-BR');
}

function formatarDataHora(data) {
    if (!data) return '';
    return new Date(data).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/* ===== FECHAR MODAL COM ESC ===== */
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal:not(.hidden)').forEach(m => m.classList.add('hidden'));
    }
});
