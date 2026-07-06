let consultas = [];
let pacientes = [];
let medicos = [];
let consultaEmEdicao = null;

async function initConsultas() {
    marcarSidebarAtiva("consultas");
    [consultas, pacientes, medicos] = await Promise.all([loadConsultas(), loadPacientes(), loadMedicos()]);

    const pesquisaInput = document.getElementById("pesquisaConsulta");
    const filtroSelect = document.getElementById("filtroEstado");

    if (pesquisaInput) pesquisaInput.addEventListener("input", renderTabela);
    if (filtroSelect) filtroSelect.addEventListener("change", renderTabela);

    preencherSelectPacientes();
    preencherSelectEspecialidades();

    // Verificação de redirecionamento vindo do Painel Principal
    const pacienteFiltroExterno = localStorage.getItem("filtroConsultaPaciente");
    if (pacienteFiltroExterno && pesquisaInput) {
        pesquisaInput.value = pacienteFiltroExterno;
        localStorage.removeItem("filtroConsultaPaciente");
    }

    renderTabela();
}

function preencherSelectPacientes() {
    const select = document.getElementById("consultaPaciente");
    if (!select) return;
    select.innerHTML = '<option value="">Selecionar paciente</option>' +
        pacientes.map(p => `<option value="${escapeHtml(p.nome)}">${escapeHtml(p.nome)}</option>`).join("");
}

function preencherSelectEspecialidades() {
    const select = document.getElementById("consultaEspecialidade");
    if (!select) return;
    const cacheEspecialidades = [...new Set(medicos.map(m => m.especialidade).filter(Boolean))];
    select.innerHTML = '<option value="">Selecionar especialidade</option>' +
        cacheEspecialidades.map(e => `<option value="${escapeHtml(e)}">${escapeHtml(e)}</option>`).join("");
}

function preencherMedicosModal() {
    const esp = document.getElementById("consultaEspecialidade").value;
    const select = document.getElementById("consultaMedico");
    if (!select) return;
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

    let lista = consultas.slice().sort((a, b) => compareConsultas(a, b));

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
            <td>${formatDate(c.data)}</td>
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
    const especialidade = document.getElementById("consultaEspecialidade").value || medicoOpt.selectedOptions[0]?.dataset.esp || "Geral";
    const data = document.getElementById("consultaData").value;
    const hora = document.getElementById("consultaHora").value;

    if (!paciente || !medico || !data || !hora) {
        alert("Preencha todos os campos obrigatórios.");
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
            <p><strong>Data:</strong> ${formatDate(c.data)}</p>
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
    return `<span class="badge ${cls}">${capitalize(estado)}</span>`;
}

window.addEventListener("DOMContentLoaded", initConsultas);