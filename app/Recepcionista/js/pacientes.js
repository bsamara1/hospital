// js/pacientes.js

let pacientes = [];
let loginLogs = [];
let consultasPaciente = [];
let pacienteEditando = null;

// Inicialização da página
async function initPacientesRecepcionista() {
    if (typeof marcarSidebarAtiva === "function") {
        marcarSidebarAtiva("pacientes");
    }
    await carregarPacientes();
    await carregarLoginLogs();
    
    const inputPesquisa = document.getElementById("pesquisaPaciente");
    if (inputPesquisa) {
        inputPesquisa.addEventListener("input", aplicarFiltro);
    }
}

// Carregar utilizadores/pacientes da API
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

// Carregar logs de login para os cartões estatísticos
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

// Atualizar dados no ecrã
function atualizarPagina() {
    renderPacientesTabela();
    atualizarCards();
}

// Atualizar os cartões de métricas superiores
function atualizarCards() {
    const totalPacientesEl = document.getElementById("totalPacientes");
    const pacientesLoginEl = document.getElementById("pacientesLogin");
    const novosMesEl = document.getElementById("novosMes");

    if (totalPacientesEl) totalPacientesEl.innerText = pacientes.length;

    const pacientesEmails = new Set(pacientes.map(p => (p.email || "").toLowerCase()));
    
    const loginsValidos = new Set(
        loginLogs
            .filter(log => log.status === "LOGIN_SUCESSO" && log.email && pacientesEmails.has(log.email.toLowerCase()))
            .map(log => log.email.toLowerCase())
    );
    
    if (pacientesLoginEl) pacientesLoginEl.innerText = loginsValidos.size;
    if (novosMesEl) novosMesEl.innerText = calcularNovosMes(new Date());
}

// Calcular novos utilizadores ativos no mês atual
function calcularNovosMes(agora) {
    const pacientesEmails = new Set(pacientes.map(p => (p.email || "").toLowerCase()));
    const primeiroLogin = {};

    loginLogs
        .filter(log => log.status === "LOGIN_SUCESSO" && log.email)
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

// Evento de filtro na barra de pesquisa
function aplicarFiltro() {
    renderPacientesTabela();
}

// Renderizar a tabela de pacientes dinamicamente (Corrigido)
function renderPacientesTabela() {
    const tabela = document.getElementById("pacientesTabela");
    if (!tabela) return;

    const termoEl = document.getElementById("pesquisaPaciente");
    const termo = termoEl ? termoEl.value.trim().toLowerCase() : "";
    
    // Filtragem dos dados
    const resultados = pacientes.filter(p => {
        if (!termo) return true;
        return (
            (p.nome || "").toLowerCase().includes(termo) ||
            (p.bi || "").toLowerCase().includes(termo) ||
            (p.email || "").toLowerCase().includes(termo) ||
            (p.telefone || "").toLowerCase().includes(termo)
        );
    });

    // Caso a lista esteja vazia
    if (resultados.length === 0) {
        tabela.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center;padding:20px;color:#777;">Nenhum paciente encontrado.</td>
            </tr>`;
        return;
    }

    // Construção das linhas da tabela
    tabela.innerHTML = resultados.map(p => {
        const emailEnc = encodeURIComponent(p.email || "");
        const nomeEnc = encodeURIComponent(p.nome || "");
        
        return `
            <tr>
                <td>${p.nome || '-'}</td>
                <td>${p.bi || '-'}</td>
                <td>${p.dataNascimento || '-'}</td>
                <td>${p.sexo || '-'}</td>
                <td>${p.telefone || '-'}</td>
                <td>${p.email || '-'}</td>
                <td>
                    <button class="btn-action edit" onclick="editarPaciente('${emailEnc}')" title="Editar">
                        <i class="fa fa-edit"></i>
                    </button>
                    <button class="btn-action history" onclick="verHistorico('${nomeEnc}')" title="Histórico">
                        <i class="fa fa-history"></i>
                    </button>
                    <button class="btn-action delete" onclick="deletarPaciente('${emailEnc}')" title="Eliminar">
                        <i class="fa fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join("");
}

// Abrir histórico de consultas do paciente
async function verHistorico(nomeEncoded) {
    const nome = decodeURIComponent(nomeEncoded);
    document.getElementById("historicoTitle").innerText = `Histórico — ${nome}`;
    const container = document.getElementById("historicoConteudo");

    if (!container) return;

    try {
        if (typeof loadConsultas !== "function") throw new Error("Função loadConsultas não definida.");
        
        const consultas = await loadConsultas();
        const historico = consultas
            .filter(c => c.paciente && c.paciente.toLowerCase() === nome.toLowerCase())
            .sort((a, b) => typeof compareConsultas === "function" ? compareConsultas(b, a) : 0);

        if (historico.length === 0) {
            container.innerHTML = "<p style='padding:10px; color:#666;'>Este paciente ainda não tem consultas registadas.</p>";
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
                                <td>${typeof formatDate === "function" ? formatDate(c.data) : c.data}</td>
                                <td>${typeof escapeHtml === "function" ? escapeHtml(c.hora) : c.hora}</td>
                                <td>${typeof escapeHtml === "function" ? escapeHtml(c.medico) : c.medico}</td>
                                <td>${typeof escapeHtml === "function" ? escapeHtml(c.especialidade || "") : (c.especialidade || "")}</td>
                                <td>${typeof estadoBadge === "function" ? estadoBadge(c.estado) : c.estado}</td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>`;
        }
    } catch (err) {
        console.error(err);
        container.innerHTML = "<p style='color:red;'>Erro ao carregar o histórico.</p>";
    }

    document.getElementById("modalHistorico").style.display = "flex";
}

// Fechar modal do histórico
function fecharHistorico() {
    document.getElementById("modalHistorico").style.display = "none";
}

// Abrir modal para adicionar um novo paciente
function abrirModal() {
    pacienteEditando = null;
    document.getElementById("modalTitle").innerText = "Adicionar Paciente";
    
    // Limpar campos
    document.getElementById("pacienteNome").value = "";
    document.getElementById("pacienteBI").value = "";
    document.getElementById("pacienteDataNascimento").value = "";
    document.getElementById("pacienteSexo").value = "";
    document.getElementById("pacienteTelefone").value = "";
    document.getElementById("pacienteEmail").value = "";
    document.getElementById("pacienteSenha").value = "";
    
    // Campo de senha visível/obrigatório para novos cadastros
    document.getElementById("pacienteSenha").style.display = "block";
    
    document.getElementById("modalPaciente").style.display = "flex";
}

// Fechar modal de cadastro/edição (Adicionado)
function fecharModal() {
    document.getElementById("modalPaciente").style.display = "none";
}

// Abrir modal configurado para edição
function editarPaciente(email) {
    const decodedEmail = decodeURIComponent(email);
    const paciente = pacientes.find(p => (p.email || "").toLowerCase() === decodedEmail.toLowerCase());
    if (!paciente) return;

    pacienteEditando = paciente;
    document.getElementById("modalTitle").innerText = "Editar Paciente";
    
    // Preencher formulário
    document.getElementById("pacienteNome").value = paciente.nome || "";
    document.getElementById("pacienteBI").value = paciente.bi || "";
    document.getElementById("pacienteDataNascimento").value = paciente.dataNascimento || "";
    document.getElementById("pacienteSexo").value = paciente.sexo || "";
    document.getElementById("pacienteTelefone").value = paciente.telefone || "";
    document.getElementById("pacienteEmail").value = paciente.email || "";
    
    // Ocultar campo de senha ao editar por segurança (opcional)
    document.getElementById("pacienteSenha").value = "";
    document.getElementById("pacienteSenha").style.display = "none"; 
    
    document.getElementById("modalPaciente").style.display = "flex";
}

// Salvar/Criar o registo do paciente
async function salvarPaciente() {
    const nome = document.getElementById("pacienteNome").value.trim();
    const bi = document.getElementById("pacienteBI").value.trim();
    const dataNascimento = document.getElementById("pacienteDataNascimento").value;
    const sexo = document.getElementById("pacienteSexo").value;
    const telefone = document.getElementById("pacienteTelefone").value.trim();
    const email = document.getElementById("pacienteEmail").value.trim().toLowerCase();
    const senha = document.getElementById("pacienteSenha").value.trim();
    const tipo = "Paciente";

    // Validação de segurança básica
    if (!nome || !bi || !email || (!pacienteEditando && !senha)) {
        alert("Preencha o nome, BI, email e senha para criar um paciente.");
        return;
    }

    // Ação: Editar Paciente Existente (PATCH)
    if (pacienteEditando) {
        try {
            const res = await fetch(`${API_URL}/utilizador`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    emailOriginal: pacienteEditando.email,
                    nome,
                    bi,
                    dataNascimento,
                    sexo,
                    telefone,
                    email,
                    tipo
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

    // Ação: Criar Novo Paciente (POST)
    try {
        const res = await fetch(`${API_URL}/utilizadores`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nome, bi, dataNascimento, sexo, telefone, email, senha, tipo })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.mensagem || "Erro ao criar paciente.");
        await carregarPacientes();
        fecharModal();
    } catch (error) {
        alert(error.message || "Não foi possível criar o paciente.");
    }
}

// Eliminar um paciente do sistema
async function deletarPaciente(email) {
    const decodedEmail = decodeURIComponent(email);
    if (!confirm(`Deseja eliminar o paciente ${decodedEmail}?`)) return;

    try {
        const res = await fetch(`${API_URL}/utilizador?email=${encodeURIComponent(decodedEmail)}`, { 
            method: "DELETE" 
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.mensagem || "Erro ao eliminar paciente.");
        await carregarPacientes();
    } catch (error) {
        alert(error.message || "Não foi possível eliminar o paciente.");
    }
}

// Tratar e validar strings de datas de login
function parseDataLogin(value) {
    if (!value) return null;
    const data = new Date(value);
    return isNaN(data.getTime()) ? null : data;
}

// Gatilho de inicialização automática ao carregar o DOM
window.addEventListener("DOMContentLoaded", initPacientesRecepcionista);