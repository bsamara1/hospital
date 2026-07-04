// =========================================================================
// VARIÁVEIS GLOBAIS E ESTADO DA APLICAÇÃO
// =========================================================================
let consultas = [];
let pacientes = [];
let medicos = [];
let consultaEmEdicao = null;

// =========================================================================
// FUNÇÕES DE CARREGAMENTO DE DADOS (AJAX / FETCH)
// =========================================================================

// Carrega as consultas priorizando o estado local modificado
async function loadConsultas() {
    if (localStorage.getItem("consultas_local")) {
        return JSON.parse(localStorage.getItem("consultas_local"));
    }

    try {
        const res = await fetch("/consultas.txt"); 
        const dados = await res.json();
        localStorage.setItem("consultas_local", JSON.stringify(dados));
        return dados;
    } catch (erro) {
        console.warn("Aviso: Erro ao ler consultas.txt, a usar cópia local.", erro);
        return [];
    }
}

// Lê o formato JSON de medicos.txt a partir da raíz
async function loadMedicos() {
    try {
        console.log("A carregar medicos.txt...");
        const res = await fetch("/medicos.txt");

        if (!res.ok) {
            throw new Error(`Erro ${res.status}: ${res.statusText}`);
        }

        return await res.json();
    } catch (erro) {
        console.error("Erro ao carregar medicos.txt:", erro);
        return [];
    }
}

// Carrega os Pacientes a partir de utilizadores.txt na raíz
async function loadPacientes() {
    let listaPacientes = [];
    try {
        const res = await fetch("/utilizadores.txt");
        const texto = await res.text();
        const linhas = texto.split("\n");
        
        linhas.forEach(linha => {
            if (!linha.trim()) return;
            const partes_linha = lineToArray(linha);
            if (partes_linha.length >= 4) {
                const nivel = partes_linha[partes_linha.length - 1].trim().toLowerCase();
                if (nivel === "paciente" || nivel === "utilizador" || nivel.includes("paciente")) {
                    listaPacientes.push({ nome: partes_linha[0].trim(), email: partes_linha[1].trim() });
                }
            }
        });
    } catch (e) {
        console.warn("Erro ao ler utilizadores.txt", e);
    }
    return listaPacientes;
}

function lineToArray(linha) {
    return linha.split(";");
}

function salvarDadosLocalmente() {
    localStorage.setItem("consultas_local", JSON.stringify(consultas));
}

// =========================================================================
// INICIALIZADORES DE PÁGINA (ROTEAMENTO)
// =========================================================================

async function initConsultas() {
    consultas = await loadConsultas();
    medicos = await loadMedicos();
    pacientes = await loadPacientes();

    const pesquisaInput = document.getElementById("pesquisaConsulta");
    const filtroSelect = document.getElementById("filtroEstado");

    if (pesquisaInput) pesquisaInput.addEventListener("input", renderTabela);
    if (filtroSelect) filtroSelect.addEventListener("change", renderTabela);
    
    const selectEspecialidade = document.getElementById("especialidade");
    if (selectEspecialidade) {
        selectEspecialidade.addEventListener("change", carregarListaMedicos);
    }

    preencherSelectPacientes();
    preencherSelectEspecialidades();
    atualizarCardsContadores();
    renderTabela();

    // Se houver um utilizador logado na sessão, atualiza o painel personalizado
    const usuarioLogado = localStorage.getItem("usuario_logado_nome");
    if (usuarioLogado) {
        atualizarDashboardPaciente(usuarioLogado);
    }
}

async function initPacientesAtivos() {
    consultas = await loadConsultas();
    renderTabelaPacientes();
}

// =========================================================================
// COMPONENTES DE INTERFACE (SELECTS / DROPDOWNS)
// =========================================================================

function preencherSelectPacientes() {
    const sel = document.getElementById("consultaPaciente");
    if (!sel) return;
    sel.innerHTML = '<option value="" disabled selected>Selecionar Paciente</option>' +
        pacientes.map(p => `<option value="${escapeHtml(p.nome)}">${escapeHtml(p.nome)}</option>`).join("");
}

function preencherSelectEspecialidades() {
    const sel = document.getElementById("especialidade");
    if (!sel) return;
    
    const esp = [...new Set(medicos.map(m => m.especialidade).filter(Boolean))];
    sel.innerHTML = '<option value="">Selecionar Especialidade</option>' +
        esp.map(e => `<option value="${escapeHtml(e)}">${escapeHtml(e)}</option>`).join("");
}

function carregarListaMedicos() {
    const selEsp = document.getElementById("especialidade");
    const selMed = document.getElementById("medico");
    if (!selEsp || !selMed) return;

    const espSelecionada = selEsp.value;
    const filtrados = medicos.filter(m => m.especialidade === espSelecionada && m.status === "ativo");
    
    if (!espSelecionada || filtrados.length === 0) {
        selMed.innerHTML = '<option value="">Selecionar Médico</option>';
        return;
    }

    selMed.innerHTML = '<option value="">Selecionar Médico</option>' +
        filtrados.map(m => `<option value="${escapeHtml(m.nome)}">${escapeHtml(m.nome)}</option>`).join("");
}

function carregarHorarios() {
    console.log("Médico ou Data alterados.");
}

// =========================================================================
// VALIDAÇÕES AUTOMÁTICAS E REGRAS DA AGENDA
// =========================================================================

function validarAgendamento(paciente, medico, data, hora, idIgnorar = null) {
    // 1. Verifica choque de horário para o Médico
    const choqueMedico = consultas.find(c => 
        c.id !== idIgnorar &&
        c.medico === medico && 
        c.data === data && 
        c.hora === hora && 
        c.estado !== "cancelada"
    );

    if (choqueMedico) {
        alert(`Erro: O Dr(a). ${medico} já possui uma consulta marcada para o dia ${data} às ${hora}.`);
        return false;
    }

    // 2. Verifica choque de horário para o próprio Paciente (Evita marcação duplicada)
    const choquePaciente = consultas.find(c =>
        c.id !== idIgnorar &&
        c.paciente.toLowerCase() === paciente.toLowerCase() &&
        c.data === data &&
        c.hora === hora &&
        c.estado !== "cancelada"
    );

    if (choquePaciente) {
        alert(`Erro: O paciente ${paciente} já tem uma consulta agendada para o dia ${data} às ${hora}.`);
        return false;
    }

    return true;
}

// =========================================================================
// OPERAÇÕES DE MANUTENÇÃO (GUARDAR, CONFIRMAR, CANCELAR)
// =========================================================================

function guardarConsulta() {
    const pacienteSel = document.getElementById("consultaPaciente");
    const paciente = pacienteSel ? pacienteSel.value : "Paciente Geral";
    
    const BlacklistCheckboxes = document.querySelectorAll('input[name="sintoma"]:checked');
    let sintomasSelecionados = [];
    let prioridadeCalculada = "baixa";

    BlacklistCheckboxes.forEach(cb => {
        sintomasSelecionados.push(cb.value);
        if (cb.value === "dor-peito" || cb.value === "falta-ar") {
            prioridadeCalculada = "alta";
        } else if (cb.value === "febre" && prioridadeCalculada !== "alta") {
            prioridadeCalculada = "media";
        }
    });
    
    const投especialidade = document.getElementById("especialidade").value;
    const medico = document.getElementById("medico").value;
    const data = document.getElementById("data").value;
    const hora = document.getElementById("hora").value;

    if (!投especialidade || !medico || !data || !hora) {
        alert("Por favor, preencha todos os campos obrigatórios do formulário.");
        return;
    }

    if (!validarAgendamento(paciente, medico, data, hora, consultaEmEdicao)) {
        return; 
    }

    if (consultaEmEdicao) {
        const idx = consultas.findIndex(c => c.id === consultaEmEdicao);
        if (idx !== -1) {
            consultas[idx].especialidade = 投especialidade;
            consultas[idx].medico = medico;
            consultas[idx].data = data;
            consultas[idx].hora = hora;
            consultas[idx].estado = "confirmada"; 
        }
        consultaEmEdicao = null;
    } else {
        const nova = {
            id: Date.now(),
            paciente: paciente || "Anónimo",
            medico,
            especialidade: 投especialidade,
            data,
            hora,
            estado: "confirmada",
            prioridade: prioridadeCalculada,
            sintomas: sintomasSelecionados.length > 0 ? sintomasSelecionados : ["rotina"]
        };
        consultas.push(nova);
    }

    salvarDadosLocalmente();
    fecharModal();
    atualizarCardsContadores();
    renderTabela();
    
    const usuarioLogado = localStorage.getItem("usuario_logado_nome");
    if (usuarioLogado) atualizarDashboardPaciente(usuarioLogado);

    alert("Consulta registada com sucesso!");
}

function confirmarConsulta(id) {
    const idx = consultas.findIndex(c => c.id === id);
    if (idx !== -1) {
        consultas[idx].estado = "confirmada";
        salvarDadosLocalmente();
        atualizarCardsContadores();
        renderTabela();
        
        const usuarioLogado = localStorage.getItem("usuario_logado_nome");
        if (usuarioLogado) atualizarDashboardPaciente(usuarioLogado);
    }
}

function cancelarConsulta(id) {
    if (!confirm("Tem a certeza que deseja cancelar esta consulta?")) return;
    const idx = consultas.findIndex(c => c.id === id);
    if (idx !== -1) {
        consultas[idx].estado = "cancelada";
        salvarDadosLocalmente();
        atualizarCardsContadores();
        renderTabela();
        
        const usuarioLogado = localStorage.getItem("usuario_logado_nome");
        if (usuarioLogado) atualizarDashboardPaciente(usuarioLogado);
    }
}

// =========================================================================
// RENDERIZAÇÃO DE INTERFACE
// =========================================================================

function atualizarCardsContadores() {
    if (document.getElementById("totalMarcadas")) {
        document.getElementById("totalMarcadas").innerText = consultas.filter(c => c.estado === "confirmada").length;
    }
    if (document.getElementById("totalRealizadas")) {
        document.getElementById("totalRealizadas").innerText = consultas.filter(c => c.estado === "realizada").length;
    }
    if (document.getElementById("totalCanceladas")) {
        document.getElementById("totalCanceladas").innerText = consultas.filter(c => c.estado === "cancelada").length;
    }
}

function renderTabela() {
    const tbody = document.getElementById("tabelaConsultas") || document.getElementById("tabela-consultas");
    if (!tbody) return;

    const termo = document.getElementById("pesquisaConsulta")?.value.toLowerCase() || "";
    const filtroEstado = document.getElementById("filtroEstado")?.value || "";

    const filtradas = consultas.filter(c => {
        const bateTexto = (c.paciente || "").toLowerCase().includes(termo) || 
                          (c.medico || "").toLowerCase().includes(termo) || 
                          (c.especialidade || "").toLowerCase().includes(termo);
        const bateEstado = !filtroEstado || c.estado === filtroEstado;
        return bateTexto && bateEstado;
    });

    if (filtradas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:15px; color:#888;">Nenhuma marcação encontrada.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtradas.map(c => {
        let acoesHtml = "";
        if (c.estado === "pendente") {
            acoesHtml = `<button onclick="confirmarConsulta(${c.id})" style="background:#28a745; color:#fff; padding:2px 6px; border:none; border-radius:4px; cursor:pointer;">Confirmar</button>`;
        } else if (c.estado === "confirmada") {
            acoesHtml = `<button onclick="cancelarConsulta(${c.id})" style="background:#dc3545; color:#fff; padding:2px 6px; border:none; border-radius:4px; cursor:pointer;">Cancelar</button>`;
        } else {
            acoesHtml = `<small style="color:#aaa;">Sem ações</small>`;
        }

        return `
            <tr>
                <td><strong>${escapeHtml(c.paciente)}</strong></td>
                <td>${escapeHtml(c.medico)}</td>
                <td>${escapeHtml(c.especialidade)}</td>
                <td>${escapeHtml(c.data)}</td>
                <td>${escapeHtml(c.hora)}</td>
                <td><span class="badge ${c.estado}">${c.estado.toUpperCase()}</span></td>
                <td>${acoesHtml}</td>
            </tr>
        `;
    }).join("");
}

function abrirModalEdicao(id) {
    const c = consultas.find(item => item.id === id);
    if (!c) return;

    consultaEmEdicao = c.id;
    abrirModal();

    const mTitle = document.getElementById("modalTitle");
    if (mTitle) mTitle.innerText = "Editar/Reagendar Consulta";
    
    document.getElementById("especialidade").value = c.especialidade;
    carregarListaMedicos();
    document.getElementById("medico").value = c.medico;
    document.getElementById("data").value = c.data;
    document.getElementById("hora").value = c.hora;
}

function abrirModal() {
    const m = document.getElementById("modalConsulta") || document.getElementById("modal");
    if (m) m.style.display = "flex";
}

function fecharModal() {
    const m = document.getElementById("modalConsulta") || document.getElementById("modal");
    if (m) m.style.display = "none";
    consultaEmEdicao = null;
}

function renderTabelaPacientes() {
    const tbody = document.getElementById("tabelaPacientes");
    if (!tbody) return;

    const mapaPacientes = new Map();
    consultas.forEach(c => {
        mapaPacientes.set((c.paciente || "").toLowerCase(), {
            nomeOriginal: c.paciente,
            agendaInfo: `${c.data} às ${c.hora}`,
            idConsulta: c.id
        });
    });

    tbody.innerHTML = Array.from(mapaPacientes.values()).map(p => `
        <tr>
            <td><strong>${escapeHtml(p.nomeOriginal)}</strong></td>
            <td>Consulta agendada para ${p.agendaInfo}</td>
            <td>
                <button type="button" onclick="abrirModalEdicao(${p.idConsulta})">Gerir</button>
            </td>
        </tr>
    `).join("");
}

function escapeHtml(string) {
    if (!string) return "";
    return String(string).replace(/[&<>"']/g, function (s) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[s];
    });
}

// =========================================================================
// MÓDULO: CORPO MÉDICO (medicos.html)
// =========================================================================

async function initPaginaMedicos() {
    medicos = await loadMedicos();
    renderMedicos();
}

function renderMedicos() {
    const container = document.getElementById("listaMedicos");
    if (!container) return;

    const termo = document.getElementById("pesquisaMedico")?.value.toLowerCase() || "";

    const filtrados = medicos.filter(m => {
        const correspondeNome = (m.nome || "").toLowerCase().includes(termo);
        const correspondeEspecialidade = (m.especialidade || "").toLowerCase().includes(termo);
        const correspondeHorario = (m.horarios || "").includes(termo);
        
        return (correspondeNome || correspondeEspecialidade || correspondeHorario) && m.status === "ativo";
    });

    if (filtrados.length === 0) {
        container.innerHTML = `<p style="text-align:center; color:#666; padding: 20px; width: 100%;">Nenhum médico encontrado com os critérios de pesquisa.</p>`;
        return;
    }

    let htmlGrelha = '<div class="medicos-grid">';
    
    filtrados.forEach(m => {
        const tagsHorarios = m.horarios.split(",")
            .map(h => `<span class="medico-tag"><i class="fa fa-clock"></i> ${escapeHtml(h.trim())}</span>`)
            .join("");

        htmlGrelha += `
            <div class="medico-card">
                <img class="medico-photo" src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=400&auto=format&fit=crop" alt="${escapeHtml(m.nome)}">
                <div class="medico-info">
                    <div class="medico-nome">${escapeHtml(m.nome)}</div>
                    <div class="medico-especialidade"><i class="fa fa-stethoscope"></i> ${escapeHtml(m.especialidade)}</div>
                    <div class="medico-meta"><strong>Disponibilidade:</strong></div>
                    <div class="medico-tags">
                        ${tagsHorarios}
                    </div>
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

    const listaHorariosFormatada = m.horarios.split(",")
        .map(h => `<li><i class="fa fa-check-circle" style="color:#28a745;"></i> Período disponível: <strong>${h.trim()}</strong></li>`)
        .join("");

    modalDetalhes.innerHTML = `
        <div class="modal-section">
            <div class="modal-row" style="margin-bottom: 10px;">
                <span><strong>Especialidade:</strong> ${escapeHtml(m.especialidade)}</span>
                <span><strong>Estado:</strong> <span style="color: green; font-weight:bold;">${m.status.toUpperCase()}</span></span>
            </div>
            <p style="margin-top:15px; margin-bottom:10px;"><strong>Horários de Consulta Ativos:</strong></p>
            <ul style="list-style: none; padding-left: 0; display: grid; gap: 8px;">
                ${listaHorariosFormatada}
            </ul>
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
// MÓDULO: MOTOR DO DASHBOARD DINÂMICO DO PACIENTE
// =========================================================================
function atualizarDashboardPaciente(nomePaciente) {
    if (!nomePaciente) return;
    
    const locais = JSON.parse(localStorage.getItem("consultas_local")) || [];
    const consultasDoPaciente = locais.filter(c => c.paciente && c.paciente.toLowerCase() === nomePaciente.toLowerCase());

    const marcadas = consultasDoPaciente.filter(c => c.estado === "confirmada" || c.estado === "pendente").length;
    const realizadas = consultasDoPaciente.filter(c => c.estado === "realizada").length;
    const canceladas = consultasDoPaciente.filter(c => c.estado === "cancelada").length;

    const agora = new Date();
    const proximas = consultasDoPaciente
        .filter(c => (c.estado === "confirmada" || c.estado === "pendente") && new Date(c.data + "T" + c.hora) >= agora)
        .sort((a, b) => new Date(a.data + "T" + a.hora) - new Date(b.data + "T" + b.hora));

    if (document.getElementById("cardProxima")) {
        document.getElementById("cardProxima").innerText = proximas.length > 0 
            ? `${proximas[0].data} às ${proximas[0].hora} (Dr(a). ${proximas[0].medico})` 
            : "Nenhuma consulta agendada";
    }
    
    if (document.getElementById("totalMarcadas")) document.getElementById("totalMarcadas").innerText = marcadas;
    if (document.getElementById("totalRealizadas")) document.getElementById("totalRealizadas").innerText = realizadas;
    if (document.getElementById("totalCanceladas")) document.getElementById("totalCanceladas").innerText = canceladas;
}

// =========================================================================
// EVENTO AUTOMÁTICO DE INICIALIZAÇÃO UNIFICADO
// =========================================================================
window.addEventListener("DOMContentLoaded", async () => {
    // 1. Força a leitura preliminar das consultas globais para popular o estado interno da aplicação
    consultas = await loadConsultas();
    
    // 2. Atualiza o Dashboard dinâmico se os elementos existirem no ecrã atual
    const usuarioLogado = localStorage.getItem("usuario_logado_nome");
    if (usuarioLogado) {
        atualizarDashboardPaciente(usuarioLogado);
    }

    // 3. Encaminha a inicialização específica baseada nos nós do DOM
    if (document.getElementById("tabelaConsultas") || document.getElementById("tabela-consultas") || document.getElementById("especialidade")) {
        initConsultas();
    } 
    if (document.getElementById("tabelaPacientes")) {
        initPacientesAtivos();
    }
    if (document.getElementById("listaMedicos")) {
        initPaginaMedicos();
    }
    
    // Intercetor para o formulário de marcação nativo, se presente
    const formAgendamento = document.querySelector("form");
    if (formAgendamento && window.location.pathname.includes("marcar_consulta.html")) {
        formAgendamento.addEventListener("submit", (e) => {
            e.preventDefault();
            guardarConsulta();
        });
    }
});