// =========================================================================
// GESTÃO DINÂMICA E SEQUENCIAL DE CONSULTAS (INTEGRAÇÃO DE DADOS TEXTO)
// =========================================================================

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
    
    // Filtra se tipo for "paciente" ou assume todos se a propriedade não existir
    const apenasPacientes = pacientes.filter(p => {
        if (!p.tipo) return true; 
        return p.tipo.toLowerCase() === "paciente";
    });
    
    select.innerHTML = '<option value="">Selecionar paciente</option>' +
        apenasPacientes.map(p => `<option value="${escapeHtml(p.nome)}">${escapeHtml(p.nome)}</option>`).join("");
}

// 2. FILTRO DE ESPECIALIDADES DINÂMICAS (Vindas do arquivo de médicos)
function preencherSelectEspecialidades() {
    const select = document.getElementById("consultaEspecialidade");
    if (!select) return;
    
    // Obtém especialidades únicas vindas dos médicos carregados
    const cacheEspecialidades = [...new Set(medicos.map(m => m.especialidade).filter(Boolean))];
    
    select.innerHTML = '<option value="">Selecionar especialidade</option>' +
        cacheEspecialidades.map(e => `<option value="${escapeHtml(e)}">${escapeHtml(e)}</option>`).join("");
}

// 3. FLUXO DEPENDENTE: FILTRA MÉDICOS APENAS PELA ESPECIALIDADE SELECIONADA[cite: 5]
function preencherMedicosModal() {
    const esp = document.getElementById("consultaEspecialidade").value;
    const selectMed = document.getElementById("consultaMedico");
    const selectHora = document.getElementById("consultaHora");
    if (!selectMed) return;
    
    // Limpa o seletor de horários até que o médico seja determinado
    if (selectHora) {
        selectHora.innerHTML = '<option value="">Selecione o horário...</option>';
    }
    
    if (!esp) {
        selectMed.innerHTML = '<option value="">Selecione primeiro a especialidade...</option>';
        return;
    }
    
    // Filtra apenas médicos ativos daquela especialidade[cite: 5]
    const filtrados = medicos.filter(m => m.especialidade === esp && (m.status === "ativo" || !m.status));
    
    if (filtrados.length === 0) {
        selectMed.innerHTML = '<option value="">Nenhum médico ativo disponível</option>';
        return;
    }
    
    selectMed.innerHTML = '<option value="">Selecionar médico</option>' +
        filtrados.map(m => `<option value="${escapeHtml(m.nome)}">${escapeHtml(m.nome)}</option>`).join("");
}

// 4. FLUXO DEPENDENTE: CARREGA OS HORÁRIOS ESPECÍFICOS E CONFIGURADOS DO MÉDICO[cite: 5]
function carregarHorariosDoMedico() {
    const nomeMed = document.getElementById("consultaMedico").value;
    const selectHora = document.getElementById("consultaHora");
    if (!selectHora) return;

    if (!nomeMed) {
        selectHora.innerHTML = '<option value="">Selecione o horário...</option>';
        return;
    }

    // Procura o objeto completo do médico para extrair sua string de horários[cite: 5]
    const medicoObj = medicos.find(m => m.nome === nomeMed);
    
    if (medicoObj && medicoObj.horarios) {
        // Divide a string por vírgulas (ex: "08:00, 09:00, 10:00")[cite: 5]
        const horas = medicoObj.horarios.split(",");
        selectHora.innerHTML = '<option value="">Selecione o horário...</option>' +
            horas.map(h => `<option value="${h.trim()}">${h.trim()}</option>`).join("");
    } else {
        // Fallback preventivo caso o médico não tenha horários definidos
        selectHora.innerHTML = `
            <option value="">Selecionar horário</option>
            <option value="08:00">08:00</option>
            <option value="09:00">09:00</option>
            <option value="10:00">10:00</option>
            <option value="14:00">14:00</option>
        `;
    }
}

// 5. ATUALIZAR CONTADORES DOS CARDS DE TRIAGEM
function atualizarCards() {
    const cardPendentes = document.getElementById("cardPendentes");
    const cardConfirmadas = document.getElementById("cardConfirmadas");
    const cardCanceladas = document.getElementById("cardCanceladas");

    if (cardPendentes) cardPendentes.innerText = consultas.filter(c => c.estado === "pendente").length;
    if (cardConfirmadas) cardConfirmadas.innerText = consultas.filter(c => c.estado === "confirmada").length;
    if (cardCanceladas) cardCanceladas.innerText = consultas.filter(c => c.estado === "cancelada").length;
}

// 6. RENDERIZAR TABELA PRINCIPAL DE GESTÃO
function renderTabela() {
    const tbody = document.getElementById("tabelaConsultas");
    if (!tbody) return;

    const termo = document.getElementById("pesquisaConsulta")?.value.trim().toLowerCase() || "";
    const estado = document.getElementById("filtroEstado")?.value || "";

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

// 7. MODAL: NOVA CONSULTA (RESETA CAMPOS E RECONSTRÓI SELETORES)
function abrirModalMarcar() {
    consultaEmEdicao = null;
    document.getElementById("modalTitulo").innerText = "Marcar Consulta";
    document.getElementById("consultaPaciente").value = "";
    document.getElementById("consultaEspecialidade").value = "";
    
    // Força o bloqueio sequencial inicial
    document.getElementById("consultaMedico").innerHTML = '<option value="">Selecione primeiro a especialidade...</option>';
    document.getElementById("consultaHora").innerHTML = '<option value="">Selecione o horário...</option>';
    
    // Limpa as checkboxes de sintomas
    document.querySelectorAll('input[name="sintoma"]').forEach(cb => cb.checked = false);
    
    document.getElementById("consultaData").value = "";
    document.getElementById("modalConsulta").style.display = "flex";
}

// 8. MODAL: REAGENDAMENTO (PREENCHE EM FLUXO DE ACORDO COM O HISTÓRICO)
function abrirModalReagendar(id) {
    const consulta = consultas.find(c => c.id === id);
    if (!consulta) return;

    consultaEmEdicao = consulta;
    document.getElementById("modalTitulo").innerText = "Reagendar Consulta";
    document.getElementById("consultaPaciente").value = consulta.paciente;
    document.getElementById("consultaEspecialidade").value = consulta.especialidade || "";
    
    // Executa a cascata de filtros para remontar as dependências corretas[cite: 5]
    preencherMedicosModal();
    document.getElementById("consultaMedico").value = consulta.medico;
    
    carregarHorariosDoMedico();
    document.getElementById("consultaData").value = consulta.data;
    document.getElementById("consultaHora").value = consulta.hora;
    
    // Remarca os sintomas guardados anteriormente se existirem
    document.querySelectorAll('input[name="sintoma"]').forEach(cb => {
        cb.checked = consulta.sintomas && consulta.sintomas.includes(cb.value);
    });
    
    document.getElementById("modalConsulta").style.display = "flex";
}

function fecharModal() {
    document.getElementById("modalConsulta").style.display = "none";
    consultaEmEdicao = null;
}

// 9. SUBMISSÃO COM VÍNCULO AUTOMÁTICO DE EMAIL ADQUIRIDO DE PACIENTES[cite: 4, 6]
async function guardarConsulta() {
    const paciente = document.getElementById("consultaPaciente").value;
    const medico = document.getElementById("consultaMedico").value;
    const especialidade = document.getElementById("consultaEspecialidade").value || "Geral";
    const data = document.getElementById("consultaData").value;
    const hora = document.getElementById("consultaHora").value;

    if (!paciente || !medico || !data || !hora) {
        alert("Preencha todos os campos obrigatórios (Paciente, Médico, Data e Horário).");
        return;
    }

    // Procura o e-mail correspondente do paciente nos registos carregados de utilizadores[cite: 6]
    const pacienteEncontrado = pacientes.find(p => p.nome && p.nome.trim().toLowerCase() === paciente.trim().toLowerCase());
    const emailPaciente = pacienteEncontrado && pacienteEncontrado.email ? pacienteEncontrado.email : "";

    // Recolha de sintomas da triagem caso existam no DOM
    const checkboxes = document.querySelectorAll('input[name="sintoma"]:checked');
    const sintomas = checkboxes.length ? Array.from(checkboxes).map(cb => cb.value) : [];
    const prioridadeCalculada = (sintomas.includes("dor-peito") || sintomas.includes("falta-ar")) ? "Alta" : "Média";

    try {
        if (consultaEmEdicao) {
            await atualizarConsulta(consultaEmEdicao.id, { 
                paciente, 
                emailPaciente,
                medico, 
                especialidade, 
                data, 
                hora, 
                estado: "pendente" 
            });
        } else {
            await criarConsulta({ 
                paciente, 
                emailPaciente,
                medico, 
                especialidade, 
                data, 
                hora, 
                estado: "pendente", 
                prioridade: prioridadeCalculada,
                sintomas: sintomas
            });
        }
        consultas = await loadConsultas(); // Recarrega da persistência texto[cite: 4]
        fecharModal();
        renderTabela();
    } catch (error) {
        alert(error.message || "Erro ao guardar agendamento.");
    }
}

// 10. OPERAÇÕES DE MUDANÇA DE ESTADO
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

// 11. DETALHES CLÍNICOS DA CONSULTA E TRIAGEM (MÉTODO 100% OPERACIONAL AGORA)
function verDetalhes(id) {
    const c = consultas.find(item => item.id === id);
    if (!c) return;

    const modalDetalhes = document.getElementById("modalDetalhes");
    const conteudo = document.getElementById("detalhesConteudo");

    if (conteudo) {
        conteudo.innerHTML = `
            <p><strong>Paciente:</strong> ${escapeHtml(c.paciente)}</p>
            <p><strong>Email do Paciente:</strong> ${escapeHtml(c.emailPaciente || "Não Associado")}</p>
            <p><strong>Médico:</strong> ${escapeHtml(c.medico)}</p>
            <p><strong>Especialidade:</strong> ${escapeHtml(c.especialidade || "Geral")}</p>
            <p><strong>Data:</strong> ${typeof formatDate === "function" ? formatDate(c.data) : c.data}</p>
            <p><strong>Hora:</strong> ${escapeHtml(c.hora)}</p>
            <p><strong>Estado:</strong> ${estadoBadge(c.estado)}</p>
            <p><strong>Triagem Original:</strong> ${escapeHtml(c.prioridade || c.triagem || "Média")}</p>
            <p><strong>Sintomas Relatados:</strong> ${c.sintomas && c.sintomas.length ? escapeHtml(c.sintomas.join(", ")) : "Nenhum"}</p>
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

// 12. AUXILIARES DE TRATAMENTO DE TEXTO
function escapeHtml(string) {
    if (!string) return "";
    return String(string).replace(/[&<>"']/g, function (s) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[s];
    });
}

window.addEventListener("DOMContentLoaded", initConsultas);