const API_URL = "http://127.0.0.1:5000";

const utilizadorLogado = JSON.parse(localStorage.getItem("utilizador") || "null");

let consultas = [];
let medicos = [];
let abaAtiva = "agendadas";

const ESPECIALIDADES_LABEL = {
    "clinica-geral": "Clínica Geral",
    "cardiologia": "Cardiologia",
    "ortopedia": "Ortopedia",
    "pediatria": "Pediatria",
    "dermatologia": "Dermatologia"
};

// =========================================================================
// ACESSO AOS DADOS (API REAL DO BACKEND)
// =========================================================================

async function loadConsultas() {
    try {
        const res = await fetch(`${API_URL}/consultas`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (erro) {
        console.warn("Não foi possível carregar consultas do servidor.", erro);
        return [];
    }
}

async function loadMedicos() {
    try {
        const res = await fetch(`${API_URL}/medicos`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (erro) {
        console.warn("Não foi possível carregar médicos do servidor.", erro);
        return [];
    }
}

// =========================================================================
// UTILITÁRIOS
// =========================================================================

function nomePaciente() {
    return utilizadorLogado?.nome || "";
}

function preencherUsuarioHeader() {
    const nomeEl = document.getElementById("usuarioNome");
    const emailEl = document.getElementById("usuarioEmail");
    if (nomeEl && utilizadorLogado?.nome) nomeEl.innerText = utilizadorLogado.nome;
    if (emailEl && utilizadorLogado?.email) emailEl.innerText = utilizadorLogado.email;
}

function escapeHtml(string) {
    if (!string) return "";
    return String(string).replace(/[&<>"']/g, s => (
        { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[s]
    ));
}

function capitalize(text) {
    if (!text) return text;
    return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatDate(value) {
    if (!value) return "";
    const partes = value.split("-");
    if (partes.length !== 3) return value;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

// =========================================================================
// MÓDULO: MARCAR CONSULTA (marcar_consulta.html)
// =========================================================================

async function initMarcarConsulta() {
    preencherUsuarioHeader();
    medicos = await loadMedicos();

    const selectEsp = document.getElementById("especialidade");
    const selectMed = document.getElementById("medico");
    const form = document.getElementById("formMarcacao");

    selectEsp.addEventListener("change", atualizarMedicosDisponiveis);
    selectMed.addEventListener("change", atualizarHorariosDisponiveis);
    form.addEventListener("submit", onSubmitMarcacao);
}

function atualizarMedicosDisponiveis() {
    const espValue = document.getElementById("especialidade").value;
    const label = ESPECIALIDADES_LABEL[espValue] || "";
    const selectMed = document.getElementById("medico");

    const filtrados = medicos.filter(m => m.especialidade === label && m.status !== "inativo");
    selectMed.innerHTML = '<option value="">Selecione o médico...</option>' +
        filtrados.map(m => `<option value="${escapeHtml(m.nome)}">${escapeHtml(m.nome)}</option>`).join("");

    atualizarHorariosDisponiveis();
}

function atualizarHorariosDisponiveis() {
    const medicoNome = document.getElementById("medico").value;
    const selectHora = document.getElementById("horaConsulta");
    const medico = medicos.find(m => m.nome === medicoNome);

    if (!medico || !medico.horarios) return;

    const horarios = medico.horarios.split(",").map(h => h.trim()).filter(Boolean);
    selectHora.innerHTML = '<option value="">Selecione o horário...</option>' +
        horarios.map(h => `<option value="${h}">${h}</option>`).join("");
}

async function onSubmitMarcacao(event) {
    event.preventDefault();

    const feedback = document.getElementById("mensagemFeedback");
    feedback.innerHTML = "";

    const paciente = nomePaciente();
    if (!paciente) {
        feedback.innerHTML = '<p style="color:#dc3545;">Sessão inválida. Faça login novamente.</p>';
        return;
    }

    const espValue = document.getElementById("especialidade").value;
    const especialidade = ESPECIALIDADES_LABEL[espValue] || espValue;
    const medico = document.getElementById("medico").value;
    const data = document.getElementById("dataConsulta").value;
    const hora = document.getElementById("horaConsulta").value;

    if (!especialidade || !medico || !data || !hora) {
        feedback.innerHTML = '<p style="color:#dc3545;">Preencha especialidade, médico, data e horário.</p>';
        return;
    }

    const sintomasSelecionados = Array.from(document.querySelectorAll('input[name="sintoma"]:checked')).map(cb => cb.value);
    let prioridade = "baixa";
    if (sintomasSelecionados.includes("dor-peito") || sintomasSelecionados.includes("falta-ar")) {
        prioridade = "alta";
    } else if (sintomasSelecionados.includes("febre-alta")) {
        prioridade = "media";
    }

    const consultasAtuais = await loadConsultas();
    const conflito = consultasAtuais.find(c =>
        c.estado !== "cancelada" && c.medico === medico && c.data === data && c.hora === hora
    );
    if (conflito) {
        feedback.innerHTML = '<p style="color:#dc3545;">O médico já tem uma consulta marcada nesse dia e horário.</p>';
        return;
    }

    try {
        const res = await fetch(`${API_URL}/consultas`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                paciente,
                medico,
                especialidade,
                data,
                hora,
                sintomas: sintomasSelecionados.length > 0 ? sintomasSelecionados : ["rotina"],
                prioridade
            })
        });
        const resultado = await res.json();
        if (!res.ok || !resultado.sucesso) {
            throw new Error(resultado.mensagem || "Não foi possível marcar a consulta.");
        }

        feedback.innerHTML = '<p style="color:#28a745;">Consulta marcada com sucesso!</p>';
        document.getElementById("formMarcacao").reset();
        setTimeout(() => { window.location.href = "consultas.html"; }, 1200);
    } catch (error) {
        feedback.innerHTML = `<p style="color:#dc3545;">${escapeHtml(error.message)}</p>`;
    }
}

// =========================================================================
// MÓDULO: MINHAS CONSULTAS (consultas.html)
// =========================================================================

async function initMinhasConsultas() {
    preencherUsuarioHeader();
    const todasConsultas = await loadConsultas();
    consultas = todasConsultas.filter(c => (c.paciente || "").toLowerCase() === nomePaciente().toLowerCase());

    document.getElementById("pesquisaGeral").addEventListener("input", renderTabelaConsultas);
    document.getElementById("filtroEstado").addEventListener("change", renderTabelaConsultas);

    renderTabelaConsultas();
}

function ativarAba(nome) {
    abaAtiva = nome;
    document.getElementById("abaAgendadas").classList.toggle("active-tab", nome === "agendadas");
    document.getElementById("abaHistorico").classList.toggle("active-tab", nome === "historico");
    renderTabelaConsultas();
}

function renderTabelaConsultas() {
    const tbody = document.getElementById("tabela-consultas");
    if (!tbody) return;

    document.getElementById("pendentes").innerText = consultas.filter(c => c.estado === "pendente").length;
    document.getElementById("confirmadas").innerText = consultas.filter(c => c.estado === "confirmada").length;
    document.getElementById("canceladas").innerText = consultas.filter(c => c.estado === "cancelada").length;

    let lista = abaAtiva === "historico"
        ? consultas.filter(c => c.estado === "realizada" || c.estado === "cancelada")
        : consultas.filter(c => c.estado !== "realizada" && c.estado !== "cancelada");

    const estadoFiltro = document.getElementById("filtroEstado").value;
    if (estadoFiltro && estadoFiltro !== "todas") {
        lista = estadoFiltro === "agendadas"
            ? lista.filter(c => c.estado !== "cancelada" && c.estado !== "realizada")
            : lista.filter(c => c.estado === estadoFiltro);
    }

    const termo = document.getElementById("pesquisaGeral").value.trim().toLowerCase();
    if (termo) {
        lista = lista.filter(c =>
            (c.especialidade || "").toLowerCase().includes(termo) ||
            (c.medico || "").toLowerCase().includes(termo) ||
            (c.data || "").includes(termo) ||
            (c.estado || "").toLowerCase().includes(termo)
        );
    }

    if (lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:#888;">Nenhuma consulta encontrada.</td></tr>`;
        return;
    }

    tbody.innerHTML = lista.map(c => `
        <tr>
            <td>${formatDate(c.data)}</td>
            <td>${escapeHtml(c.hora)}</td>
            <td>${escapeHtml(c.medico)}</td>
            <td>${escapeHtml(c.especialidade || "")}</td>
            <td><span class="status ${c.estado}">${capitalize(c.estado)}</span></td>
        </tr>
    `).join("");
}

// =========================================================================
// MÓDULO: CORPO MÉDICO (medicos.html)
// =========================================================================

async function initListaMedicos() {
    medicos = await loadMedicos();
    renderMedicos();
    document.getElementById("pesquisaMedico")?.addEventListener("input", renderMedicos);
}

function renderMedicos() {
    const container = document.getElementById("listaMedicos");
    if (!container) return;

    const termo = document.getElementById("pesquisaMedico")?.value.toLowerCase() || "";

    const filtrados = medicos.filter(m => {
        const correspondeNome = (m.nome || "").toLowerCase().includes(termo);
        const correspondeEspecialidade = (m.especialidade || "").toLowerCase().includes(termo);
        const correspondeHorario = (m.horarios || "").includes(termo);
        return (correspondeNome || correspondeEspecialidade || correspondeHorario) && m.status !== "inativo";
    });

    if (filtrados.length === 0) {
        container.innerHTML = `<p style="text-align:center; color:#666; padding: 20px; width: 100%;">Nenhum médico encontrado com os critérios de pesquisa.</p>`;
        return;
    }

    let htmlGrelha = '<div class="medicos-grid">';
    filtrados.forEach(m => {
        const tagsHorarios = (m.horarios || "").split(",")
            .map(h => `<span class="medico-tag"><i class="fa fa-clock"></i> ${escapeHtml(h.trim())}</span>`)
            .join("");

        htmlGrelha += `
            <div class="medico-card">
                <div class="medico-info">
                    <div class="medico-nome">${escapeHtml(m.nome)}</div>
                    <div class="medico-especialidade"><i class="fa fa-stethoscope"></i> ${escapeHtml(m.especialidade)}</div>
                    <div class="medico-meta"><strong>Disponibilidade:</strong></div>
                    <div class="medico-tags">${tagsHorarios}</div>
                </div>
                <div class="medico-actions">
                    <button type="button" onclick="verAgendaMedico('${escapeHtml(m.nome)}')">
                        <i class="fa fa-calendar-alt"></i> Ver Agenda
                    </button>
                </div>
            </div>
        `;
    });
    htmlGrelha += '</div>';
    container.innerHTML = htmlGrelha;
}

function verAgendaMedico(nomeMedico) {
    const m = medicos.find(med => med.nome === nomeMedico);
    if (!m) return;

    const modal = document.getElementById("modalAgenda");
    const modalNome = document.getElementById("modalMedicoNome");
    const modalDetalhes = document.getElementById("modalMedicoDetalhes");
    if (!modal || !modalNome || !modalDetalhes) return;

    modalNome.innerText = `Agenda Completa - ${m.nome}`;

    const listaHorariosFormatada = (m.horarios || "").split(",")
        .map(h => `<li><i class="fa fa-check-circle" style="color:#28a745;"></i> Período disponível: <strong>${escapeHtml(h.trim())}</strong></li>`)
        .join("");

    modalDetalhes.innerHTML = `
        <div class="modal-section">
            <div class="modal-row" style="margin-bottom: 10px;">
                <span><strong>Especialidade:</strong> ${escapeHtml(m.especialidade)}</span>
                <span><strong>Estado:</strong> <span style="color: green; font-weight:bold;">${(m.status || "ativo").toUpperCase()}</span></span>
            </div>
            <p style="margin-top:15px; margin-bottom:10px;"><strong>Horários de Consulta Ativos:</strong></p>
            <ul style="list-style: none; padding-left: 0; display: grid; gap: 8px;">${listaHorariosFormatada}</ul>
        </div>
        <p style="font-size:13px; color:#6f7287; margin-top:12px;"><i class="fa fa-info-circle"></i> Para efetuar uma marcação com este profissional, aceda ao menu "Marcar Consulta".</p>
    `;
    modal.style.display = "flex";
}

function fecharModalMedico() {
    const modal = document.getElementById("modalAgenda");
    if (modal) modal.style.display = "none";
}

// =========================================================================
// MÓDULO: NOTIFICAÇÕES (notificacoes.html + badge do sino em todas as páginas)
// =========================================================================

async function minhasConsultas() {
    const paciente = nomePaciente();
    if (!paciente) return [];
    const todasConsultas = await loadConsultas();
    return todasConsultas.filter(c => (c.paciente || "").toLowerCase() === paciente.toLowerCase());
}

function gerarNotificacoesPaciente(consultasPaciente) {
    const notificacoes = consultasPaciente.map(c => {
        if (c.estado === "cancelada") {
            return { tipo: "cancelada", texto: `A sua consulta com ${c.medico} em ${formatDate(c.data)} foi cancelada.`, data: c.data };
        }
        if (c.estado === "pendente") {
            return { tipo: "pendente", texto: `A sua consulta com ${c.medico} em ${formatDate(c.data)} às ${c.hora} aguarda confirmação.`, data: c.data };
        }
        if (c.estado === "confirmada") {
            return { tipo: "confirmada", texto: `Consulta confirmada com ${c.medico} para ${formatDate(c.data)} às ${c.hora}.`, data: c.data };
        }
        if (c.estado === "presente") {
            return { tipo: "presente", texto: `Presença registada na consulta com ${c.medico}.`, data: c.data };
        }
        if (c.estado === "realizada") {
            return { tipo: "realizada", texto: `A sua consulta com ${c.medico} em ${formatDate(c.data)} foi concluída.`, data: c.data };
        }
        return null;
    }).filter(Boolean);

    return notificacoes.sort((a, b) => (b.data || "").localeCompare(a.data || ""));
}

async function atualizarBadgeNotificacoes() {
    const badge = document.getElementById("notifBadge");
    if (!badge) return;

    const minhas = await minhasConsultas();
    const relevantes = minhas.filter(c => c.estado === "pendente" || c.estado === "cancelada" || c.estado === "confirmada");

    if (relevantes.length > 0) {
        badge.innerText = relevantes.length > 9 ? "9+" : relevantes.length;
        badge.style.display = "inline-block";
    } else {
        badge.style.display = "none";
    }
}

async function initNotificacoesPaciente() {
    const minhas = await minhasConsultas();
    const notificacoes = gerarNotificacoesPaciente(minhas);

    const container = document.getElementById("listaNotificacoes");
    if (!container) return;

    if (notificacoes.length === 0) {
        container.innerHTML = `<p style="text-align:center; color:#888; padding:20px;">Sem notificações no momento.</p>`;
        return;
    }

    const icones = { cancelada: "fa-circle-xmark", pendente: "fa-clock", confirmada: "fa-circle-check", presente: "fa-user-check", realizada: "fa-flag-checkered" };
    const cores = { cancelada: "#dc3545", pendente: "#e0a800", confirmada: "#28a745", presente: "#17a2b8", realizada: "#6c757d" };

    container.innerHTML = notificacoes.map(n => `
        <div style="display:flex; gap:12px; padding:14px; border-bottom:1px solid #eee;">
            <i class="fa ${icones[n.tipo] || 'fa-bell'}" style="color:${cores[n.tipo] || '#555'}; font-size:18px; margin-top:2px;"></i>
            <span>${escapeHtml(n.texto)}</span>
        </div>
    `).join("");
}

// =========================================================================
// GATILHO DE ROTEAMENTO
// =========================================================================
window.addEventListener("DOMContentLoaded", () => {
    preencherUsuarioHeader();
    atualizarBadgeNotificacoes();

    if (document.getElementById("formMarcacao")) {
        initMarcarConsulta();
    } else if (document.getElementById("tabela-consultas")) {
        initMinhasConsultas();
    } else if (document.getElementById("listaMedicos")) {
        initListaMedicos();
    } else if (document.getElementById("listaNotificacoes")) {
        initNotificacoesPaciente();
    }
});
