let consultas = [];
let pacientes = [];
let medicos = [];
let consultaEmEdicao = null;

async function initConsultas() {
    if (typeof marcarSidebarAtiva === "function") {
        marcarSidebarAtiva("consultas");
    }
    
    try {
        // Carrega os dados das funções globais[cite: 1]
        [consultas, pacientes, medicos] = await Promise.all([loadConsultas(), loadPacientes(), loadMedicos()]);
        
        // Debug para verificar no Console do Navegador (F12) se os dados estão corretos
        console.log("Pacientes carregados:", pacientes);
        console.log("Médicos carregados:", medicos);
    } catch (error) {
        console.error("Erro ao carregar dados iniciais:", error);
    }

    const pesquisaInput = document.getElementById("pesquisaConsulta");
    const filtroSelect = document.getElementById("filtroEstado");

    if (pesquisaInput) pesquisaInput.addEventListener("input", renderTabela);
    if (filtroSelect) filtroSelect.addEventListener("change", renderTabela);

    preencherSelectPacientes();
    preencherSelectEspecialidades();

    const pacienteFiltroExterno = localStorage.getItem("filtroConsultaPaciente");
    if (pacienteFiltroExterno && pesquisaInput) {
        pesquisaInput.value = pacienteFiltroExterno;
        localStorage.removeItem("filtroConsultaPaciente");
    }

    renderTabela();
}

// 1. FILTRO DE PACIENTES (Seguro contra variações do campo 'tipo' ou 'role')
function preencherSelectPacientes() {
    const select = document.getElementById("consultaPaciente");
    if (!select) return;
    
    // Filtra se tipo for "paciente" (minusculo/maiusculo) ou assume todos se a propriedade não existir
    const apenasPacientes = pacientes.filter(p => {
        if (!p.tipo) return true; // Se não houver campo tipo, mostra para não quebrar
        return p.tipo.toLowerCase() === "paciente";
    });
    
    select.innerHTML = '<option value="">Selecionar paciente</option>' +
        apenasPacientes.map(p => `<option value="${escapeHtml(p.nome)}">${escapeHtml(p.nome)}</option>`).join("");
}

// 2. FILTRO DE ESPECIALIDADES (Vindas do arquivo de médicos)
function preencherSelectEspecialidades() {
    const select = document.getElementById("consultaEspecialidade");
    if (!select) return;
    
    // Obtém especialidades únicas vindas dos médicos
    const cacheEspecialidades = [...new Set(medicos.map(m => m.especialidade).filter(Boolean))];
    
    select.innerHTML = '<option value="">Selecionar especialidade</option>' +
        cacheEspecialidades.map(e => `<option value="${escapeHtml(e)}">${escapeHtml(e)}</option>`).join("");
}

// 3. FILTRO DE MÉDICOS POR ESPECIALIDADE
function preencherMedicosModal() {
    const esp = document.getElementById("consultaEspecialidade").value;
    const select = document.getElementById("consultaMedico");
    if (!select) return;
    
    // Se selecionou uma especialidade, filtra os médicos dela. Se não, mostra todos.
    const filtrados = medicos.filter(m => !esp || m.especialidade === esp);
    
    select.innerHTML = '<option value="">Selecionar médico</option>' +
        filtrados.map(m => `<option value="${escapeHtml(m.nome)}" data-esp="${escapeHtml(m.especialidade)}">${escapeHtml(m.nome)}</option>`).join("");
}

function atualizarCards() {
    const cardPendentes = document.getElementById("cardPendentes");
    const cardConfirmadas = document.getElementById("cardConfirmadas");
    const cardCanceladas = document.getElementById("cardCanceladas");

    if (cardPendentes) cardPendentes.innerText = consultas.filter(c => c.estado === "pendente").length;
    if (cardConfirmadas) cardConfirmadas.innerText = consultas.filter(c => c.estado === "confirmada").length;
    if (cardCanceladas) cardCanceladas.innerText = consultas.filter(c => c.estado === "cancelada").length;
}

function renderTabela() {
    const tbody = document.getElementById("tabelaConsultas");
    if (!tbody) return;

    const termo = document.getElementById("pesquisaConsulta")?.value.trim().toLowerCase() || "";
    const estado = document.getElementById("filtroEstado")?.value || "";

    // Ordenação segura
    let lista = [...consultas];
    if (typeof compareConsultas === "function") {
        lista.sort((a, b) => compareConsultas(a, b));
    }

    if (estado) lista = lista.filter(c => c.estado === estado);
    if (termo) {
        lista = lista.filter(c =>
            (c.paciente || "").toLowerCase().includes(termo) ||
            (c.medico || "").toLowerCase().includes(termo) ||
            (c.especialidade || "").toLowerCase().includes(termo)
        );
    }

    atualizarCards();

    if (lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:20px;color:#777;">Nenhuma consulta encontrada.</td></tr>`;
        return;
    }

    tbody.innerHTML = lista.map(c => `
        <tr>
            <td><b>${escapeHtml(c.paciente)}</b></td>
            <td>${escapeHtml(c.medico)}</td>
            <td>${escapeHtml(c.especialidade || "Geral")}</td>
            <td>${typeof formatDate === "function" ? formatDate(c.data) : c.data}</td>
            <td>${escapeHtml(c.hora)}</td>
            <td>${estadoBadge(c.estado)}</td>
            <td>
                ${c.estado === "pendente" ? `<button class="confirm" type="button" onclick="confirmarConsulta(${c.id})">Confirmar</button>` : ""}
                ${c.estado !== "cancelada" && c.estado !== "realizada" ? `<button class="edit" type="button" onclick="abrirModalReagendar(${c.id})">Reagendar</button>` : ""}
                ${c.estado !== "cancelada" && c.estado !== "realizada" ? `<button class="cancel" type="button" onclick="cancelarConsulta(${c.id})">Cancelar</button>` : ""}
                <button class="view" type="button" onclick="verDetalhes(${c.id})">Detalhes</button>
            </td>
        </tr>
    `).join("");
}

function abrirModalMarcar() {
    consultaEmEdicao = null;
    document.getElementById("modalTitulo").innerText = "Marcar Consulta";
    document.getElementById("consultaPaciente").value = "";
    document.getElementById("consultaEspecialidade").value = "";
    preencherMedicosModal();
    document.getElementById("consultaData").value = "";
    document.getElementById("consultaHora").value = "";
    document.getElementById("modalConsulta").style.display = "flex";
}

function abrirModalReagendar(id) {
    const consulta = consultas.find(c => c.id === id);
    if (!consulta) return;

    consultaEmEdicao = consulta;
    document.getElementById("modalTitulo").innerText = "Reagendar Consulta";
    document.getElementById("consultaPaciente").value = consulta.paciente;
    document.getElementById("consultaEspecialidade").value = consulta.especialidade || "";
    preencherMedicosModal();
    document.getElementById("consultaMedico").value = consulta.medico;
    document.getElementById("consultaData").value = consulta.data;
    document.getElementById("consultaHora").value = consulta.hora;
    document.getElementById("modalConsulta").style.display = "flex";
}

function fecharModal() {
    document.getElementById("modalConsulta").style.display = "none";
    consultaEmEdicao = null;
}

async function guardarConsulta() {
    const paciente = document.getElementById("consultaPaciente").value;
    const medicoOpt = document.getElementById("consultaMedico");
    const medico = medicoOpt.value;
    const selectedOpt = medicoOpt.selectedOptions ? medicoOpt.selectedOptions[0] : null;
    const especialidade = document.getElementById("consultaEspecialidade").value || selectedOpt?.dataset.esp || "Geral";
    const data = document.getElementById("consultaData").value;
    const hora = document.getElementById("consultaHora").value;

    if (!paciente || !medico || !data || !hora) {
        alert("Preencha todos os campos obrigatórios (Paciente, Médico, Data e Horário).");
        return;
    }

    try {
        if (consultaEmEdicao) {
            await atualizarConsulta(consultaEmEdicao.id, { paciente, medico, especialidade, data, hora, estado: "pendente" });
        } else {
            await criarConsulta({ paciente, medico, especialidade, data, hora, estado: "pendente", prioridade: "Média" });
        }
        consultas = await loadConsultas();
        fecharModal();
        renderTabela();
    } catch (error) {
        alert(error.message || "Erro ao guardar agendamento.");
    }
}

async function confirmarConsulta(id) {
    try {
        await atualizarConsulta(id, { estado: "confirmada" });
        consultas = await loadConsultas();
        renderTabela();
    } catch (error) { alert(error.message); }
}

async function cancelarConsulta(id) {
    if (!confirm("Deseja cancelar esta consulta?")) return;
    try {
        await atualizarConsulta(id, { estado: "cancelada" });
        consultas = await loadConsultas();
        renderTabela();
    } catch (error) { alert(error.message); }
}

function verDetalhes(id) {
    const c = consultas.find(item => item.id === id);
    if (!c) return;

    const modalDetalhes = document.getElementById("modalDetalhes");
    const conteudo = document.getElementById("detalhesConteudo");

    if (conteudo) {
        conteudo.innerHTML = `
            <p><strong>Paciente:</strong> ${escapeHtml(c.paciente)}</p>
            <p><strong>Médico:</strong> ${escapeHtml(c.medico)}</p>
            <p><strong>Especialidade:</strong> ${escapeHtml(c.especialidade || "Geral")}</p>
            <p><strong>Data:</strong> ${typeof formatDate === "function" ? formatDate(c.data) : c.data}</p>
            <p><strong>Hora:</strong> ${escapeHtml(c.hora)}</p>
            <p><strong>Estado:</strong> ${estadoBadge(c.estado)}</p>
            <p><strong>Triagem Original:</strong> ${escapeHtml(c.prioridade || c.triagem || "Média")}</p>
        `;
    }
    if (modalDetalhes) modalDetalhes.style.display = "flex";
}

function fecharDetalhes() {
    document.getElementById("modalDetalhes").style.display = "none";
}

function estadoBadge(estado) {
    const map = { pendente: "pendente", confirmada: "confirmada", cancelada: "cancelada", presente: "presente", realizada: "realizada" };
    const cls = map[estado] || "pendente";
    return `<span class="badge ${cls}">${typeof capitalize === "function" ? capitalize(estado) : estado}</span>`;
}

// Funções de escape caso não existam no ficheiro comum
function escapeHtml(string) {
    if (!string) return "";
    return String(string).replace(/[&<>"']/g, function (s) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[s];
    });
}

window.addEventListener("DOMContentLoaded", initConsultas);