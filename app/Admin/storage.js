// ==========================================
// HOSPITAL AGOSTINHO NETO - BASE DE DADOS LOCAL
// ==========================================

const DB_CONSULTAS = "han_db_consultas";
const DB_USERS = "han_db_utilizadores";
const DB_MEDICOS = "han_db_medicos";
const DB_ESPECIALIDADES = "han_db_especialidades";
const DB_LOGS = "han_db_logs";

// ==========================================
// UTILIZADORES
// ==========================================

function obterUsuariosGerais() {
  let lista = JSON.parse(localStorage.getItem(DB_USERS));
  if (!lista) lista = criarUtilizadoresPadrao();
  return lista;
}

function salvarUsuariosGerais(lista) {
  localStorage.setItem(DB_USERS, JSON.stringify(lista));
}

// ==========================================
// CONSULTAS
// ==========================================

function obterConsultas() {
  return JSON.parse(localStorage.getItem(DB_CONSULTAS)) || [];
}

function guardarConsultas(lista) {
  localStorage.setItem(DB_CONSULTAS, JSON.stringify(lista));
}

// ==========================================
// MÉDICOS
// ==========================================

function obterMedicosInfo() {
  let lista = JSON.parse(localStorage.getItem(DB_MEDICOS));
  if (!lista) lista = [];
  return lista;
}

function salvarMedicosInfo(lista) {
  localStorage.setItem(DB_MEDICOS, JSON.stringify(lista));
}

// 🔥 FUNÇÃO PRINCIPAL (ADICIONAR / EDITAR MÉDICO)
function guardarMedicoNoStorage(id, nome, specialty, hours, days) {
  let lista = obterMedicosInfo();

  if (id) {
    // EDITAR MÉDICO
    lista = lista.map((m) => {
      if (m.id == id) {
        return {
          ...m,
          nome,
          especialidade: specialty,
          specialty,
          horario: hours,
          dias: days,
        };
      }
      return m;
    });

    registrarLogAcesso("Administrador", `Editou médico: ${nome}`);
  } else {
    // ADICIONAR MÉDICO
    const novoMedico = {
      id: lista.length > 0 ? Math.max(...lista.map((m) => m.id)) + 1 : 1,
      nome,
      especialidade: specialty,
      specialty,
      horario: hours,
      dias,
      totalAtendimentos: 0,
    };

    lista.push(novoMedico);

    registrarLogAcesso("Administrador", `Adicionou médico: ${nome}`);
  }

  salvarMedicosInfo(lista);
  return lista;
}

// REMOVER MÉDICO
function removerMedicoNoStorage(id) {
  let lista = obterMedicosInfo();
  const medico = lista.find((m) => m.id == id);

  if (medico) {
    lista = lista.filter((m) => m.id != id);
    salvarMedicosInfo(lista);

    registrarLogAcesso("Administrador", `Removeu médico: ${medico.nome}`);
  }

  return lista;
}

// OBTER POR ID
function obterMedicoPorId(id) {
  return obterMedicosInfo().find((m) => m.id == id);
}

// TOTAIS
function totalMedicos() {
  return obterMedicosInfo().length;
}

function totalEspecialidadesMedicos() {
  const lista = obterMedicosInfo();
  return [...new Set(lista.map((m) => m.especialidade))].length;
}

function totalAtendimentosMedicos() {
  return obterMedicosInfo().reduce((total, m) => {
    return total + (m.totalAtendimentos || 0);
  }, 0);
}

// ==========================================
// LOGS
// ==========================================

function registrarLogAcesso(operador, acao) {
  let logs = JSON.parse(localStorage.getItem(DB_LOGS)) || [];

  logs.unshift({
    data: new Date().toLocaleString("pt-PT"),
    operador,
    acao,
  });

  if (logs.length > 200) logs.length = 200;

  localStorage.setItem(DB_LOGS, JSON.stringify(logs));
}

function obterLogsAcesso() {
  return JSON.parse(localStorage.getItem(DB_LOGS)) || [];
}

// ==========================================
// LIMPAR DADOS
// ==========================================

function limparTodosDados() {
  if (confirm("Tem certeza que deseja limpar TODOS os dados?")) {
    localStorage.clear();
    alert("Dados removidos com sucesso!");
    location.reload();
  }
}