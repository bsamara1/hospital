let pacientes = [];
let loginLogs = [];
let consultasPaciente = [];
let pacienteEditando = null;

async function initPacientesRecepcionista() {
    marcarSidebarAtiva("pacientes");
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
    document.getElementById("novosMes").innerText = calcularNovosMes(new Date());
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

    return Object.values(primeiroLogin).filter(
        data => data.getFullYear() === agora.getFullYear() && data.getMonth() === agora.getMonth()
    ).length;
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
                <td colspan="5" style="text-align:center;padding:20px;color:#777;">Nenhum paciente encontrado.</td>
            </tr>`;
        return;
    }

    tabela.innerHTML = resultados.map(p => `
        <tr>
            <td>${escapeHtml(p.nome)}</td>
            <td>${escapeHtml(p.email)}</td>
            <td>${escapeHtml(p.telefone)}</td>
            <td>${escapeHtml(p.tipo || "Paciente")}</td>
            <td>
                <button class="edit" type="button" onclick="editarPaciente('${encodeURIComponent(p.email)}')">Editar</button>
                <button class="view" type="button" onclick="verHistorico('${encodeURIComponent(p.nome)}')">Ver histórico</button>
                <button class="delete" type="button" onclick="deletarPaciente('${encodeURIComponent(p.email)}')">Eliminar</button>
            </td>
        </tr>
    `).join("");
}

async function verHistorico(nomeEncoded) {
    const nome = decodeURIComponent(nomeEncoded);
    document.getElementById("historicoTitle").innerText = `Histórico — ${nome}`;
    const container = document.getElementById("historicoConteudo");

    const consultas = await loadConsultas();
    const historico = consultas
        .filter(c => c.paciente && c.paciente.toLowerCase() === nome.toLowerCase())
        .sort((a, b) => compareConsultas(b, a));

    if (historico.length === 0) {
        container.innerHTML = "<p>Este paciente ainda não tem consultas registadas.</p>";
    } else {
        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Hora</th>
                        <th>Médico</th>
                        <th>Especialidade</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
                    ${historico.map(c => `
                        <tr>
                            <td>${formatDate(c.data)}</td>
                            <td>${escapeHtml(c.hora)}</td>
                            <td>${escapeHtml(c.medico)}</td>
                            <td>${escapeHtml(c.especialidade || "")}</td>
                            <td>${estadoBadge(c.estado)}</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>`;
    }

    document.getElementById("modalHistorico").style.display = "flex";
}

function fecharHistorico() {
    document.getElementById("modalHistorico").style.display = "none";
}

function abrirModal(email) {
    pacienteEditando = null;
    document.getElementById("modalTitle").innerText = "Adicionar Paciente";
    document.getElementById("pacienteNome").value = "";
    document.getElementById("pacienteEmail").value = "";
    document.getElementById("pacienteTelefone").value = "";
    document.getElementById("pacienteSenha").value = "";
    document.getElementById("modalPaciente").style.display = "flex";
}

function editarPaciente(email) {
    const decodedEmail = decodeURIComponent(email);
    const paciente = pacientes.find(p => p.email.toLowerCase() === decodedEmail.toLowerCase());
    if (!paciente) return;

    pacienteEditando = paciente;
    document.getElementById("modalTitle").innerText = "Editar Paciente";
    document.getElementById("pacienteNome").value = paciente.nome;
    document.getElementById("pacienteEmail").value = paciente.email;
    document.getElementById("pacienteTelefone").value = paciente.telefone;
    document.getElementById("pacienteSenha").value = "";
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
        alert("Preencha nome, email e senha para criar um paciente.");
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
        alert(error.message || "Não foi possível eliminar o paciente.");
    }
}

function parseDataLogin(value) {
    const data = new Date(value);
    return isNaN(data.getTime()) ? null : data;
}

window.addEventListener("DOMContentLoaded", initPacientesRecepcionista);
