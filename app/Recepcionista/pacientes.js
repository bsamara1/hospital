const API_URL = "http://127.0.0.1:5000";
let pacientes = [];
let loginLogs = [];
let pacienteEditando = null;

async function initPacientesRecepcionista() {
  await carregarPacientes();
  await carregarLoginLogs();
  document.getElementById("pesquisaPaciente").addEventListener("input", aplicarFiltro);
}

async function carregarPacientes() {
  try {
    const res = await fetch(`${API_URL}/utilizadores`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    pacientes = await res.json();
    atualizarPagina();
  } catch (error) {
    console.error("Erro ao carregar pacientes:", error);
    pacientes = [];
    atualizarPagina();
  }
}

async function carregarLoginLogs() {
  try {
    const res = await fetch(`${API_URL}/login_logs`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    loginLogs = await res.json();
    atualizarPagina();
  } catch (error) {
    console.error("Erro ao carregar histórico de login:", error);
    loginLogs = [];
    atualizarPagina();
  }
}

function atualizarPagina() {
  renderPacientesTabela();
  atualizarCards();
  renderHistoricoLogin();
}

function atualizarCards() {
  document.getElementById("totalPacientes").innerText = pacientes.length;

  const pacientesEmails = new Set(pacientes.map(p => p.email.toLowerCase()));
  const loginsValidos = new Set(
    loginLogs
      .filter(log => log.status === "LOGIN_SUCESSO" && pacientesEmails.has(log.email.toLowerCase()))
      .map(log => log.email.toLowerCase())
  );
  document.getElementById("pacientesLogin").innerText = loginsValidos.size;

  const agora = new Date();
  const novosMes = calcularNovosMes(agora);
  document.getElementById("novosMes").innerText = novosMes;
}

function calcularNovosMes(agora) {
  const pacientesEmails = new Set(pacientes.map(p => p.email.toLowerCase()));
  const primeiroLogin = {};

  loginLogs
    .filter(log => log.status === "LOGIN_SUCESSO")
    .forEach(log => {
      const email = log.email.toLowerCase();
      if (!pacientesEmails.has(email)) return;
      const data = parseDataLogin(log.data);
      if (!data) return;
      if (!primeiroLogin[email] || data < primeiroLogin[email]) {
        primeiroLogin[email] = data;
      }
    });

  return Object.values(primeiroLogin).filter(data => data.getFullYear() === agora.getFullYear() && data.getMonth() === agora.getMonth()).length;
}

function aplicarFiltro() {
  renderPacientesTabela();
}

function renderPacientesTabela() {
  const tabela = document.getElementById("pacientesTabela");
  const termo = document.getElementById("pesquisaPaciente").value.trim().toLowerCase();
  const resultados = pacientes.filter(p => {
    if (!termo) return true;
    return (
      p.nome.toLowerCase().includes(termo) ||
      p.email.toLowerCase().includes(termo) ||
      (p.telefone || "").toLowerCase().includes(termo)
    );
  });

  if (resultados.length === 0) {
    tabela.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center; padding:20px; color:#777;">Nenhum paciente encontrado.</td>
      </tr>
    `;
    return;
  }

  tabela.innerHTML = resultados
    .map(p => `
      <tr>
        <td>${escapeHtml(p.nome)}</td>
        <td>${escapeHtml(p.email)}</td>
        <td>${escapeHtml(p.telefone)}</td>
        <td>${escapeHtml(p.tipo || "Paciente")}</td>
        <td>
          <button class="edit" type="button" onclick="editarPaciente('${encodeURIComponent(p.email)}')">Editar</button>
          <button class="delete" type="button" onclick="deletarPaciente('${encodeURIComponent(p.email)}')">Eliminar</button>
        </td>
      </tr>
    `)
    .join("");
}

function renderHistoricoLogin() {
  const container = document.getElementById("historicoLogin");
  const registros = loginLogs
    .slice()
    .sort((a, b) => {
      const da = parseDataLogin(a.data);
      const db = parseDataLogin(b.data);
      return db - da;
    })
    .slice(0, 20);

  if (registros.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="3" style="text-align:center; padding:20px; color:#777;">Sem histórico de login disponível.</td>
      </tr>
    `;
    return;
  }

  container.innerHTML = registros
    .map(log => `
      <tr>
        <td>${escapeHtml(log.email)}</td>
        <td>${escapeHtml(log.status.replace("LOGIN_SUCESSO", "Sucesso").replace("LOGIN_FALHOU", "Falhou"))}</td>
        <td>${escapeHtml(log.data)}</td>
      </tr>
    `)
    .join("");
}

function abrirModal(email) {
  pacienteEditando = null;
  document.getElementById("modalTitle").innerText = "Adicionar Paciente";
  document.getElementById("pacienteNome").value = "";
  document.getElementById("pacienteEmail").value = "";
  document.getElementById("pacienteTelefone").value = "";
  document.getElementById("pacienteSenha").value = "";

  if (email) {
    const decodedEmail = decodeURIComponent(email);
    const paciente = pacientes.find(p => p.email.toLowerCase() === decodedEmail.toLowerCase());
    if (paciente) {
      pacienteEditando = paciente;
      document.getElementById("modalTitle").innerText = "Editar Paciente";
      document.getElementById("pacienteNome").value = paciente.nome;
      document.getElementById("pacienteEmail").value = paciente.email;
      document.getElementById("pacienteTelefone").value = paciente.telefone;
    }
  }

  document.getElementById("modalPaciente").style.display = "flex";
}

function fecharModal() {
  document.getElementById("modalPaciente").style.display = "none";
  pacienteEditando = null;
}

async function salvarPaciente() {
  const nome = document.getElementById("pacienteNome").value.trim();
  const email = document.getElementById("pacienteEmail").value.trim().toLowerCase();
  const telefone = document.getElementById("pacienteTelefone").value.trim();
  const senha = document.getElementById("pacienteSenha").value.trim();

  if (!nome || !email || (!pacienteEditando && !senha)) {
    alert("Preencha nome, email e senha para criar um paciente. Para editar, deixe a senha em branco se não quiser alterá-la.");
    return;
  }

  if (pacienteEditando) {
    try {
      const res = await fetch(`${API_URL}/utilizador`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailOriginal: pacienteEditando.email,
          nome,
          email,
          telefone
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.mensagem || "Erro ao atualizar paciente.");
      await carregarPacientes();
      fecharModal();
    } catch (error) {
      console.error(error);
      alert(error.message || "Não foi possível atualizar o paciente.");
    }
    return;
  }

  try {
    const res = await fetch(`${API_URL}/utilizadores`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, email, telefone, senha })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.mensagem || "Erro ao criar paciente.");
    await carregarPacientes();
    fecharModal();
  } catch (error) {
    console.error(error);
    alert(error.message || "Não foi possível criar o paciente.");
  }
}

async function deletarPaciente(email) {
  const decodedEmail = decodeURIComponent(email);
  if (!confirm(`Deseja eliminar o paciente ${decodedEmail}?`)) return;

  try {
    const res = await fetch(`${API_URL}/utilizador?email=${encodeURIComponent(decodedEmail)}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.mensagem || "Erro ao eliminar paciente.");
    await carregarPacientes();
  } catch (error) {
    console.error(error);
    alert(error.message || "Não foi possível eliminar o paciente.");
  }
}

function parseDataLogin(value) {
  const data = new Date(value);
  return isNaN(data.getTime()) ? null : data;
}

function escapeHtml(text) {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

window.addEventListener("DOMContentLoaded", initPacientesRecepcionista);
