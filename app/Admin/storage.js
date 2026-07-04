// ==========================================
// HOSPITAL AGOSTINHO NETO - CAMADA DE DADOS DO ADMIN
// Utilizadores, médicos e consultas vêm do backend real (Flask).
// Especialidades e logs de auditoria ficam apenas no browser porque
// o backend não tem endpoints próprios para esses dois conceitos.
// ==========================================

const API_URL = "http://127.0.0.1:5000";

const DB_ESPECIALIDADES = "han_db_especialidades";
const DB_LOGS = "han_db_logs";
const DB_ESTADOS_UTILIZADOR = "han_db_estados_utilizador";

// ==========================================
// UTILIZADORES (API real)
// ==========================================

function mapearTipoParaPerfil(tipo) {
  const t = (tipo || "").toLowerCase();
  if (t.includes("medic")) return "medico";
  if (t.includes("rece")) return "recepcionista";
  return "paciente";
}

function mapearPerfilParaTipo(perfil) {
  if (perfil === "medico") return "medico";
  if (perfil === "recepcionista") return "recepcionista";
  return "Paciente";
}

function obterEstadosLocais() {
  return JSON.parse(localStorage.getItem(DB_ESTADOS_UTILIZADOR)) || {};
}

function salvarEstadosLocais(mapa) {
  localStorage.setItem(DB_ESTADOS_UTILIZADOR, JSON.stringify(mapa));
}

async function obterUsuariosGerais() {
  try {
    const res = await fetch(`${API_URL}/utilizadores`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const lista = await res.json();
    const estados = obterEstadosLocais();

    return lista.map((u, index) => ({
      id: index + 1,
      nome: u.nome,
      email: u.email,
      perfil: mapearTipoParaPerfil(u.tipo),
      estado: estados[u.email] || "ativo"
    }));
  } catch (erro) {
    console.warn("Não foi possível carregar utilizadores do servidor.", erro);
    return [];
  }
}

async function criarUtilizadorApi(nome, email, perfil, telefone = "") {
  const senhaProvisoria = Math.random().toString(36).slice(-8);
  const res = await fetch(`${API_URL}/utilizadores`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome, email, telefone, senha: senhaProvisoria, tipo: mapearPerfilParaTipo(perfil) })
  });
  const dados = await res.json();
  if (!res.ok || !dados.sucesso) {
    throw new Error(dados.mensagem || "Não foi possível criar o utilizador.");
  }
  return { ...dados.utilizador, senhaProvisoria };
}

async function alternarEstadoUtilizadorApi(email) {
  const estados = obterEstadosLocais();
  estados[email] = estados[email] === "desativado" ? "ativo" : "desativado";
  salvarEstadosLocais(estados);
}

async function removerUtilizadorApi(email) {
  const res = await fetch(`${API_URL}/utilizador?email=${encodeURIComponent(email)}`, { method: "DELETE" });
  const dados = await res.json();
  if (!res.ok || !dados.sucesso) {
    throw new Error(dados.mensagem || "Não foi possível remover o utilizador.");
  }
}

// ==========================================
// MÉDICOS (API real)
// ==========================================

async function obterMedicosInfo() {
  try {
    const res = await fetch(`${API_URL}/medicos`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (erro) {
    console.warn("Não foi possível carregar médicos do servidor.", erro);
    return [];
  }
}

async function criarMedicoApi(nome, especialidade, horarios) {
  const res = await fetch(`${API_URL}/medicos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome, especialidade, horarios, status: "ativo" })
  });
  const dados = await res.json();
  if (!res.ok || !dados.sucesso) {
    throw new Error(dados.mensagem || "Não foi possível criar o médico.");
  }
  return dados.medico;
}

async function atualizarMedicoApi(id, campos) {
  const res = await fetch(`${API_URL}/medicos/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(campos)
  });
  const dados = await res.json();
  if (!res.ok || !dados.sucesso) {
    throw new Error(dados.mensagem || "Não foi possível atualizar o médico.");
  }
  return dados.medico;
}

async function removerMedicoApi(id) {
  const res = await fetch(`${API_URL}/medicos/${id}`, { method: "DELETE" });
  const dados = await res.json();
  if (!res.ok || !dados.sucesso) {
    throw new Error(dados.mensagem || "Não foi possível remover o médico.");
  }
}

// ==========================================
// CONSULTAS (API real, apenas leitura no Admin)
// ==========================================

async function obterConsultas() {
  try {
    const res = await fetch(`${API_URL}/consultas`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (erro) {
    console.warn("Não foi possível carregar consultas do servidor.", erro);
    return [];
  }
}

// ==========================================
// ESPECIALIDADES (apenas local - sem endpoint no backend)
// ==========================================

function obterEspecialidadesLista() {
  return JSON.parse(localStorage.getItem(DB_ESPECIALIDADES)) || [];
}

function salvarEspecialidadesLista(lista) {
  localStorage.setItem(DB_ESPECIALIDADES, JSON.stringify(lista));
}

// ==========================================
// LOGS DE AUDITORIA DO ADMIN (apenas local - sem endpoint no backend)
// ==========================================

function registrarLogAcesso(operador, acao) {
  let logs = JSON.parse(localStorage.getItem(DB_LOGS)) || [];
  logs.unshift({ data: new Date().toLocaleString("pt-PT"), operador, acao });
  if (logs.length > 200) logs.length = 200;
  localStorage.setItem(DB_LOGS, JSON.stringify(logs));
}

function obterLogsAcesso() {
  return JSON.parse(localStorage.getItem(DB_LOGS)) || [];
}
