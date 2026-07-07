// ==========================================
// HOSPITAL AGOSTINHO NETO - CAMADA DE DADOS DO ADMIN
// Utilizadores, médicos e consultas vêm do backend real (Flask) ou ficheiros locais.
// Especialidades e logs de auditoria ficam apenas no browser porque
// o backend não tem endpoints próprios para esses dois conceitos.
// ==========================================

const API_URL = "http://127.0.0.1:5000";

const DB_ESPECIALIDADES = "han_db_especialidades";
const DB_LOGS = "han_db_logs";
const DB_ESTADOS_UTILIZADOR = "han_db_estados_utilizador";

const utilizadorLogado = JSON.parse(localStorage.getItem("utilizador") || "null");

// ==========================================
// CABEÇALHO: IDENTIDADE E NOTIFICAÇÕES (em todas as páginas do Admin)
// ==========================================

function preencherUsuarioHeader() {
  const nomeEl = document.getElementById("usuarioNome");
  const emailEl = document.getElementById("usuarioEmail");
  if (nomeEl && utilizadorLogado?.nome) nomeEl.innerText = utilizadorLogado.nome;
  if (emailEl && utilizadorLogado?.email) emailEl.innerText = utilizadorLogado.email;
}

async function atualizarBadgeNotificacoes() {
  const badge = document.getElementById("notifBadge");
  if (!badge) return;

  const consultas = await obterConsultas();
  const relevantes = consultas.filter(c => c.estado === "pendente" || c.estado === "cancelada");

  if (relevantes.length > 0) {
    badge.innerText = relevantes.length > 9 ? "9+" : relevantes.length;
    badge.style.display = "inline-block";
  } else {
    badge.style.display = "none";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  preencherUsuarioHeader();
  atualizarBadgeNotificacoes();
});

// ==========================================
// SESSÃO & TERMINAR SESSÃO
// ==========================================

function logout() {
  if (confirm("Deseja realmente terminar a sua sessão?")) {
    localStorage.removeItem("utilizador");
    window.location.href = "../login.html";
  }
}

// ==========================================
// UTILIZADORES (Leitura e Normalização de Dados de Texto e API)
// ==========================================

function mapearTipoParaPerfil(tipo) {
  const t = (tipo || "").toLowerCase();
  if (t.includes("medic")) return "medico";
  if (t.includes("rece")) return "recepcionista";
  if (t.includes("admin")) return "admin";
  return "paciente";
}

function mapearPerfilParaTipo(perfil) {
  if (perfil === "medico") return "medico";
  if (perfil === "recepcionista") return "recepcionista";
  if (perfil === "admin") return "admin";
  return "Paciente";
}

function obterEstadosLocais() {
  return JSON.parse(localStorage.getItem(DB_ESTADOS_UTILIZADOR)) || {};
}

function salvarEstadosLocais(mapa) {
  localStorage.setItem(DB_ESTADOS_UTILIZADOR, JSON.stringify(mapa));
}

async function obterUsuariosGerais() {
  let listaFinal = [];
  const estados = obterEstadosLocais();

  try {
    const resTxt = await fetch("utilizadores.txt");
    if (resTxt.ok) {
      const textoBruto = await resTxt.text();
      const linhas = textoBruto.split("\n").map(l => l.trim()).filter(l => l.length > 0);
      
      let contadorId = 1;

      linhas.forEach((linha) => {
        if (linha.startsWith("Nome;BI") || linha.startsWith("Nome;Email")) return;

        const campos = linha.split(";").map(c => c.trim());
        if (campos.length >= 4) {
          let nome = campos[0] || "-";
          let bi = "-";
          let dataNascimento = "-";
          let sexo = "-";
          let telefone = "-";
          let email = "-";
          let tipoOriginal = "Paciente";

          tipoOriginal = campos[campos.length - 1];

          // Se a linha tem 7 ou mais campos (Formato Completo)
          if (campos.length >= 7) {
            bi = campos[1] || "-";
            dataNascimento = campos[2] || "-";
            sexo = campos[3] || "-";
            telefone = campos[4] || "-";
            email = campos[5] || "-";
          } else { 
            // Formato Simples (Ex: Nome;Email;Telefone;Senha;Tipo)
            email = campos[1] || "-";
            telefone = campos[2] || "-";
          }

          listaFinal.push({
            id: "txt_" + (contadorId++),
            nome: nome,
            bi: bi,
            dataNascimento: dataNascimento,
            sexo: sexo,
            telefone: telefone,
            email: email,
            perfil: mapearTipoParaPerfil(tipoOriginal),
            estado: estados[email] || "ativo"
          });
        }
      });
    }
  } catch (e) {
    console.warn("Aviso ao ler utilizadores.txt", e);
  }

  // JUNTAR OS DADOS RECEBIDOS DA API FLASK
  try {
    const resApi = await fetch(`${API_URL}/utilizadores`);
    if (resApi.ok) {
      const dadosApi = await resApi.json();
      const utilizadoresServidor = Array.isArray(dadosApi) ? dadosApi : (dadosApi.utilizadores || []);

      utilizadoresServidor.forEach((u, index) => {
        const emailFinal = u.email || "-";
        const indexExistente = listaFinal.findIndex(item => item.email.toLowerCase() === emailFinal.toLowerCase() && emailFinal !== "-");
        
        const objetoMapeado = {
          id: "api_" + (u.id || index + 1),
          nome: u.nome || "-",
          bi: u.bi || "-",
          dataNascimento: u.dataNascimento || u.data_nascimento || "-",
          sexo: u.sexo || "-",
          telefone: u.telefone || "-",
          email: emailFinal,
          perfil: mapearTipoParaPerfil(u.tipo || u.perfil),
          estado: estados[emailFinal] || u.estado || "ativo"
        };

        if (indexExistente !== -1) {
          listaFinal[indexExistente] = objetoMapeado;
        } else {
          listaFinal.push(objetoMapeado);
        }
      });
    }
  } catch (erroApi) {
    console.warn("Servidor Flask indisponível, exibindo registos locais.", erroApi);
  }

  return listaFinal;
}

async function criarUtilizadorApi(nome, bi, data_nascimento, sexo, telefone, email, senha, perfil) {
  const tipoMapeado = mapearPerfilParaTipo(perfil);
  const res = await fetch(`${API_URL}/utilizadores`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      nome: nome,
      email: email,
      tipo: tipoMapeado,
      senha: senha,
      bi: bi,
      dataNascimento: data_nascimento,
      sexo: sexo,
      telefone: telefone
    })
  });

  const dados = await res.json();
  if (!res.ok || !dados.sucesso) {
    throw new Error(dados.mensagem || "Não foi possível criar o utilizador.");
  }
  return dados;
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

async function criarMedicoApi(dadosMed) {
  const res = await fetch(`${API_URL}/medicos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dadosMed)
  });
  
  const dados = await res.json();
  if (!res.ok || !dados.sucesso) {
    throw new Error(dados.mensagem || "Não foi possível criar o médico.");
  }
  return dados.medico;
}

async function atualizarMedicoApi(id, dadosMed) {
  try {
    const res = await fetch(`${API_URL}/medicos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dadosMed)
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.mensagem || "Erro ao atualizar médico.");
    }
    return await res.json();
  } catch (erro) {
    console.error(erro);
    throw erro;
  }
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
// ESPECIALIDADES (API real)
// ==========================================

async function obterEspecialidadesLista() {
  try {
    const res = await fetch(`${API_URL}/especialidades`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (erro) {
    console.warn("Não foi possível carregar especialidades do servidor.", erro);
    return [];
  }
}

async function criarEspecialidadeApi(nome) {
  const res = await fetch(`${API_URL}/especialidades`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome })
  });
  const dados = await res.json();
  if (!res.ok || !dados.sucesso) {
    throw new Error(dados.mensagem || "Não foi possível criar a especialidade.");
  }
  return dados;
}

async function removerEspecialidadeApi(nome) {
  const res = await fetch(`${API_URL}/especialidades?nome=${encodeURIComponent(nome)}`, { method: "DELETE" });
  const dados = await res.json();
  if (!res.ok || !dados.sucesso) {
    throw new Error(dados.mensagem || "Não foi possível remover a especialidade.");
  }
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