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
        // Carrega os dados das funções de persistência global existentes no seu sistema
        [consultas, pacientes, medicos] = await Promise.all([loadConsultas(), loadPacientes(), loadMedicos()]);
    } catch (error) {
        console.error("Erro ao carregar dados iniciais de persistência local:", error);
    }

    const pesquisaInput = document.getElementById("pesquisaConsulta");
    const filtroSelect = document.getElementById("filtroEstado");

    if (pesquisaInput) pesquisaInput.addEventListener("input", renderTabela);
    if (filtroSelect) filtroSelect.addEventListener("change", renderTabela);

    // 1º Carrega os pacientes do TXT, depois lê as especialidades e monta a tabela
    await preencherSelectPacientes();
    await carregarMedicosETxt(); // Nova função unificada para garantir sincronismo
    preencherSelectEspecialidades();

    const pacienteFiltroExterno = localStorage.getItem("filtroConsultaPaciente");
    if (pacienteFiltroExterno && pesquisaInput) {
        pesquisaInput.value = pacienteFiltroExterno;
        localStorage.removeItem("filtroConsultaPaciente");
    }

    renderTabela();
}

// 1. FILTRO DE PACIENTES - Carrega de utilizadores.txt subindo duas pastas (../../)
async function preencherSelectPacientes() {
    const select = document.getElementById("consultaPaciente");
    if (!select) return;
    
    select.innerHTML = '<option value="">Selecionar paciente</option>';

    try {
        // CORREÇÃO DE ROTA: Sair de app/recepcionista/ para ler utilizadores.txt na raíz
        const resposta = await fetch('../../utilizadores.txt'); 
        if (!resposta.ok) throw new Error("Não foi possível carregar o ficheiro de utilizadores.");
        
        const texto = await resposta.text();
        const linhas = texto.split('\n');
        
        let novosPacientes = [];

        linhas.forEach(linha => {
            if (!linha.trim()) return; 
            
            const dados = lineSplitter(linha); // Evita falhas com espaços extras
            if (dados.length < 2) return;

            const nomePaciente = dados[0].trim();
            const cargo = dados[dados.length - 1].trim(); 
            const emailPaciente = dados[5] ? dados[5].trim() : "";

            // Filtra rigorosamente pelo perfil "Paciente"
            if (cargo.toLowerCase() === 'paciente' && nomePaciente) {
                const option = document.createElement('option');
                option.value = nomePaciente;
                option.textContent = nomePaciente;
                select.appendChild(option);

                novosPacientes.push({
                    nome: nomePaciente,
                    email: emailPaciente,
                    tipo: "Paciente"
                });
            }
        });

        if (novosPacientes.length > 0) {
            pacientes = novosPacientes;
        }

    } catch (erro) {
        console.error("Erro ao processar utilizadores.txt, a usar fallback de memória:", erro);
        if (pacientes && pacientes.length > 0) {
            const apenasPacientes = pacientes.filter(p => p.tipo && p.tipo.toLowerCase() === "paciente");
            select.innerHTML = '<option value="">Selecionar paciente</option>' +
                apenasPacientes.map(p => `<option value="${escapeHtml(p.nome)}">${escapeHtml(p.nome)}</option>`).join("");
        }
    }
}

// Auxiliar para ler medicos.txt da raíz de forma síncrona
async function carregarMedicosETxt() {
    try {
        // CORREÇÃO DE ROTA: Buscar medicos.txt recuando duas pastas
        const resposta = await fetch('../../medicos.txt');
        if (resposta.ok) {
            const jsonDados = await resposta.json();
            if (Array.isArray(jsonDados) && jsonDados.length > 0) {
                medicos = jsonDados;
            }
        }
    } catch (e) {
        console.warn("Ficheiro medicos.txt não lido via fetch (JSON), a manter array 'medicos' global.", e);
    }
}

// 2. FILTRO DE ESPECIALIDADES DINÂMICAS 
function preencherSelectEspecialidades() {
    const select = document.getElementById("consultaEspecialidade");
    if (!select) return;
    
    // Obtém especialidades sem repetições extraídas do JSON de médicos
    const cacheEspecialidades = [...new Set(medicos.map(m => m.especialidade).filter(Boolean))];
    
    select.innerHTML = '<option value="">Selecionar especialidade</option>' +
        cacheEspecialidades.map(e => `<option value="${escapeHtml(e)}">${escapeHtml(e)}</option>`).join("");
}

// 3. FLUXO DEPENDENTE: FILTRA MÉDICOS APENAS PELA ESPECIALIDADE SELECIONADA
function preencherMedicosModal() {
    const esp = document.getElementById("consultaEspecialidade").value;
    const selectMed = document.getElementById("consultaMedico");
    const selectHora = document.getElementById("consultaHora");
    if (!selectMed) return;
    
    if (selectHora) {
        selectHora.innerHTML = '<option value="">Selecione o horário...</option>';
    }
    
    if (!esp) {
        selectMed.innerHTML = '<option value="">Selecione primeiro a especialidade...</option>';
        return;
    }
    
    // Filtra médicos pertencentes à especialidade que estejam ativos
    const filtrados = medicos.filter(m => m.especialidade === esp && (m.status === "ativo" || !m.status));
    
    if (filtrados.length === 0) {
        selectMed.innerHTML = '<option value="">Nenhum médico disponível</option>';
        return;
    }
    
    selectMed.innerHTML = '<option value="">Selecionar médico</option>' +
        filtrados.map(m => `<option value="${escapeHtml(m.nome)}">${escapeHtml(m.nome)}</option>`).join("");
}

// 4. FLUXO DEPENDENTE: CARREGA OS HORÁRIOS ESPECÍFICOS E CONFIGURADOS DO MÉDICO
function carregarHorariosDoMedico() {
    const nomeMed = document.getElementById("consultaMedico").value;
    const selectHora = document.getElementById("consultaHora");
    if (!selectHora) return;

    if (!nomeMed) {
        selectHora.innerHTML = '<option value="">Selecione o horário...</option>';
        return;
    }

    const medicoObj = medicos.find(m => m.nome === nomeMed);
    
    if (medicoObj && medicoObj.horarios) {
        const horas = medicoObj.horarios.split(",");
        selectHora.innerHTML = '<option value="">Selecione o horário...</option>' +
            horas.map(h => `<option value="${h.trim()}">${h.trim()}</option>`).join("");
    } else {
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

// 7. MODAL: NOVA CONSULTA
function abrirModalMarcar() {
    consultaEmEdicao = null;
    document.getElementById("modalTitulo").innerText = "Marcar Consulta";
    document.getElementById("consultaPaciente").value = "";
    document.getElementById("consultaEspecialidade").value = "";
    
    document.getElementById("consultaMedico").innerHTML = '<option value="">Selecione primeiro a especialidade...</option>';
    document.getElementById("consultaHora").innerHTML = '<option value="">Selecione o horário...</option>';
    
    document.querySelectorAll('input[name="sintoma"]').forEach(cb => cb.checked = false);
    
    document.getElementById("consultaData").value = "";
    document.getElementById("modalConsulta").style.display = "flex";
}

// 8. MODAL: REAGENDAMENTO
function abrirModalReagendar(id) {
    const consulta = consultas.find(c => c.id === id);
    if (!consulta) return;

    consultaEmEdicao = consulta;
    document.getElementById("modalTitulo").innerText = "Reagendar Consulta";
    document.getElementById("consultaPaciente").value = consulta.paciente;
    document.getElementById("consultaEspecialidade").value = consulta.especialidade || "";
    
    preencherMedicosModal();
    document.getElementById("consultaMedico").value = consulta.medico;
    
    carregarHorariosDoMedico();
    document.getElementById("consultaData").value = consulta.data;
    document.getElementById("consultaHora").value = consulta.hora;
    
    document.querySelectorAll('input[name="sintoma"]').forEach(cb => {
        cb.checked = consulta.sintomas && consulta.sintomas.includes(cb.value);
    });
    
    document.getElementById("modalConsulta").style.display = "flex";
}

function fecharModal() {
    document.getElementById("modalConsulta").style.display = "none";
    consultaEmEdicao = null;
}

// 9. SUBMISSÃO COM VÍNCULO DE EMAIL ADQUIRIDO
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

    const pacienteEncontrado = pacientes.find(p => p.nome && p.nome.trim().toLowerCase() === paciente.trim().toLowerCase());
    const emailPaciente = pacienteEncontrado && pacienteEncontrado.email ? pacienteEncontrado.email : "";

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
        if (typeof loadConsultas === "function") consultas = await loadConsultas();
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
        if (typeof loadConsultas === "function") consultas = await loadConsultas();
        renderTabela();
    } catch (error) { alert(error.message); }
}

async function cancelarConsulta(id) {
    if (!confirm("Deseja cancelar esta consulta?")) return;
    try {
        await atualizarConsulta(id, { estado: "cancelada" });
        if (typeof loadConsultas === "function") consultas = await loadConsultas();
        renderTabela();
    } catch (error) { alert(error.message); }
}

// 11. DETALHES CLÍNICOS DA CONSULTA
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

// Auxiliar de divisão robusta de strings
function lineSplitter(linha) {
    return linha.split(';');
}

function escapeHtml(string) {
    if (!string) return "";
    return String(string).replace(/[&<>"']/g, function (s) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[s];
    });
}

// Ouvinte global
window.addEventListener("DOMContentLoaded", initConsultas);