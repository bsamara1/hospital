let consultas = [];
let pacientes = [];
let medicos = [];
let consultaEmEdicao = null;

async function initConsultas() {
    marcarSidebarAtiva("consultas");
    [consultas, pacientes, medicos] = await Promise.all([loadConsultas(), loadPacientes(), loadMedicos()]);

    document.getElementById("pesquisaConsulta").addEventListener("input", renderTabela);
    document.getElementById("filtroEstado").addEventListener("change", renderTabela);

    preencherSelectPacientes();
    preencherSelectEspecialidades();
    renderTabela();
}

function preencherSelectPacientes() {
    const select = document.getElementById("consultaPaciente");
    select.innerHTML = '<option value="">Selecionar paciente</option>' +
        pacientes.map(p => `<option value="${escapeHtml(p.nome)}">${escapeHtml(p.nome)}</option>`).join("");
}

function preencherSelectEspecialidades() {
    const especialidades = [...new Set(medicos.map(m => m.especialidade).filter(Boolean))];
    const select = document.getElementById("consultaEspecialidade");
    select.innerHTML = '<option value="">Selecionar especialidade</option>' +
        especialidades.map(e => `<option value="${escapeHtml(e)}">${escapeHtml(e)}</option>`).join("");
}

function preencherMedicosModal() {
    const esp = document.getElementById("consultaEspecialidade").value;
    const select = document.getElementById("consultaMedico");
    const filtrados = medicos.filter(m => !esp || m.especialidade === esp);
    select.innerHTML = '<option value="">Selecionar médico</option>' +
        filtrados.map(m => `<option value="${escapeHtml(m.nome)}" data-esp="${escapeHtml(m.especialidade)}">${escapeHtml(m.nome)}</option>`).join("");
}

function atualizarCards() {
    document.getElementById("cardPendentes").innerText = consultas.filter(c => c.estado === "pendente").length;
    document.getElementById("cardConfirmadas").innerText = consultas.filter(c => c.estado === "confirmada").length;
    document.getElementById("cardCanceladas").innerText = consultas.filter(c => c.estado === "cancelada").length;
}

function renderTabela() {
    const tbody = document.getElementById("tabelaConsultas");
    const termo = document.getElementById("pesquisaConsulta").value.trim().toLowerCase();
    const estado = document.getElementById("filtroEstado").value;

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
            <td>${escapeHtml(c.paciente)}</td>
            <td>${escapeHtml(c.medico)}</td>
            <td>${escapeHtml(c.especialidade || "")}</td>
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
    const paciente = document.getElementById("consultaPaciente").value.trim();
    const medicoOpt = document.getElementById("consultaMedico");
    const medico = medicoOpt.value.trim();
    const especialidade = document.getElementById("consultaEspecialidade").value.trim() ||
        medicoOpt.selectedOptions[0]?.dataset.esp || "";
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
            await criarConsulta({ paciente, medico, especialidade, data, hora });
        }
        consultas = await loadConsultas();
        fecharModal();
        renderTabela();
    } catch (error) {
        alert(error.message || "Não foi possível guardar a consulta.");
    }
}

async function confirmarConsulta(id) {
    try {
        await atualizarConsulta(id, { estado: "confirmada" });
        consultas = await loadConsultas();
        renderTabela();
    } catch (error) {
        alert(error.message || "Não foi possível confirmar a consulta.");
    }
}

async function cancelarConsulta(id) {
    if (!confirm("Deseja cancelar esta consulta?")) return;
    try {
        await atualizarConsulta(id, { estado: "cancelada" });
        consultas = await loadConsultas();
        renderTabela();
    } catch (error) {
        alert(error.message || "Não foi possível cancelar a consulta.");
    }
}

function verDetalhes(id) {
    const c = consultas.find(item => item.id === id);
    if (!c) return;

    document.getElementById("detalhesConteudo").innerHTML = `
        <p><strong>Paciente:</strong> ${escapeHtml(c.paciente)}</p>
        <p><strong>Médico:</strong> ${escapeHtml(c.medico)}</p>
        <p><strong>Especialidade:</strong> ${escapeHtml(c.especialidade || "—")}</p>
        <p><strong>Data:</strong> ${formatDate(c.data)}</p>
        <p><strong>Hora:</strong> ${escapeHtml(c.hora)}</p>
        <p><strong>Estado:</strong> ${estadoBadge(c.estado)}</p>
    `;
    document.getElementById("modalDetalhes").style.display = "flex";
}

function fecharDetalhes() {
    document.getElementById("modalDetalhes").style.display = "none";
}

window.addEventListener("DOMContentLoaded", initConsultas);
