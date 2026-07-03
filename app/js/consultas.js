const API_URL = "http://127.0.0.1:5000";
let consultas = [];
let medicos = [];
let consultaEmEdicao = null;
let abaAtiva = "agendadas";

<<<<<<< HEAD
// Variável para controlar qual o filtro ativo ('hoje', 'pendente', 'cancelada' ou null)
let filtroAtivo = null;

/* =======================
CARREGAR MÉDICOS
======================= */
async function carregarMedicos() {
    try {
        const res = await fetch("../data/medicos.txt");
        const data = await res.text();
        medicos = JSON.parse(data);
        carregarListaMedicos();
    } catch (e) {
        console.error("Erro ao carregar médicos:", e);
    }
=======
// Dados simulados de Perfil e Notificações (Ponto 2 e 6)
let perfilUsuario = { nome: "Benedita", email: "benedita@email.com", telefone: "999999999", foto: "../assets/img/profile.png" };
let notificacoes = [
    { texto: "Sua consulta de Cardiologia foi confirmada!", lida: false },
    { texto: "Lembrete: Consulta amanhã às 10:40 com Dr. Mendes.", lida: false },
    { texto: "Consulta reagendada para 17/07/2026 às 10:40.", lida: true }
];

/* ==========================================================================
   CARREGAR DADOS (INIT)
   ========================================================================== */
async function carregarMedicos() {
    try {
        const res = await fetch(`${API_URL}/medicos`);
        if (!res.ok) throw new Error("API não disponível");
        medicos = await res.json();
    } catch (error) {
        // Fallback local se a API estiver offline
        medicos = [
            { "nome": "Dr. Mendes", "especialidade": "Cardiologia", "horarios": "09:00,10:00,11:00,14:00", "status": "ativo" },
            { "nome": "Dr. Sousa", "especialidade": "Ortopedia", "horarios": "08:30,09:30,13:00,15:00", "status": "ativo" }
        ];
    }
    carregarEspecialidades();
>>>>>>> 9aa433b0c00f43ad6b8eaeee44a3e7c34d1aa48c
}

async function carregarConsultas() {
    try {
<<<<<<< HEAD
        const res = await fetch("../data/consultas.txt");
        const data = await res.text();
        consultas = JSON.parse(data);
        
        // Renderiza e atualiza os contadores
        aplicarFiltroAtual();
        atualizarCards();
    } catch (e) {
        console.error("Erro ao carregar consultas do arquivo. Tentando localStorage...", e);
        // Tenta buscar do localStorage como alternativa caso o arquivo falhe
        const localData = localStorage.getItem("consultas");
        consultas = localData ? JSON.parse(localData) : [];
        
        aplicarFiltroAtual();
        atualizarCards();
    }
}

/* =======================
LISTA MÉDICOS
======================= */
function carregarListaMedicos() {
    const select = document.getElementById("medico");
    if (!select) return;
    select.innerHTML = "";

    medicos
    .filter(m => m.status === "ativo")
    .forEach(m => {
        select.innerHTML += `<option value="${m.nome}">${m.nome} - ${m.especialidade}</option>`;
=======
        const res = await fetch(`${API_URL}/consultas`);
        consultas = await res.json();
    } catch (error) {
        // Fallback de consultas para teste local
        consultas = [
            { id: 1, paciente: "Benedita", medico: "Dr. Mendes", especialidade: "Cardiologia", data: "2026-07-17", hora: "10:00", estado: "confirmada" },
            { id: 2, paciente: "Benedita", medico: "Dr. Sousa", especialidade: "Ortopedia", data: "2026-07-20", hora: "08:30", estado: "pendente" },
            { id: 3, paciente: "Benedita", medico: "Dr. Mendes", especialidade: "Cardiologia", data: "2026-03-15", hora: "14:00", estado: "realizada" }
        ];
    }

    // Executa as renderizações dependendo da página em que o usuário está
    renderTabelaConsultas();
    renderTabelaDashboard();
    renderTabelaReagendamento();
    renderNotificacoes();
    renderMedicos();
    renderDashboardResumo();
    renderAlertasImportantes();
    atualizarCards();
    carregarDadosPerfil();
}


async function atualizarConsultaBackend(id, dados) {
    const resposta = await fetch(`${API_URL}/consultas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados)
    });
    if (!resposta.ok) {
        const erro = await resposta.json().catch(() => ({}));
        throw new Error(erro.mensagem || "Erro ao atualizar a consulta.");
    }
    return await resposta.json();
}

/* ==========================================================================
   INTERFACES E RENDERIZAÇÃO DE TABELAS
   ========================================================================== */

// PONTO 4 e 5: Tabela da página de listagem ("Minhas Consultas")
function renderTabelaConsultas() {
    const tbody = document.getElementById("tabela-consultas");
    if (!tbody) return;

    const filtroPesquisa = document.getElementById("pesquisaGeral")?.value.toLowerCase() || "";
    const filtroEstado = document.getElementById("filtroEstado")?.value || "todas";

    tbody.innerHTML = "";

    const consultasFiltradas = consultas.filter(c => {
        const texto = `${c.medico} ${c.especialidade} ${c.data} ${c.estado}`.toLowerCase();
        const bateTexto = texto.includes(filtroPesquisa);
        const bateEstado = (filtroEstado === "todas") || (filtroEstado === "agendadas" && c.estado !== "realizada" && c.estado !== "cancelada") || (c.estado === filtroEstado);
        const bateAba = abaAtiva === "historico" ? (c.estado === "realizada" || c.estado === "cancelada") : c.estado !== "cancelada";
        return bateTexto && bateEstado && bateAba;
    });

    consultasFiltradas.forEach(c => {
        const statusClass = c.estado === 'confirmada' ? 'confirmada' : c.estado === 'pendente' ? 'pendente' : c.estado === 'realizada' ? 'done' : 'cancelada';
        const botaoEditar = c.estado !== 'cancelada' && c.estado !== 'realizada' ? `<button class="edit" onclick="reagendar(${c.id})"><i class="fa fa-edit"></i></button>` : '';
        const botaoCancelar = c.estado !== 'cancelada' && c.estado !== 'realizada' ? `<button class="cancel" onclick="cancelar(${c.id})"><i class="fa fa-trash"></i></button>` : '';

        tbody.innerHTML += `
        <tr>
            <td>${formatarData(c.data)}</td>
            <td>${c.hora}</td>
            <td>${c.medico}</td>
            <td>${c.especialidade}</td>
            <td><span class="status ${statusClass}">${c.estado.toUpperCase()}</span></td>
        </tr>`;
>>>>>>> 9aa433b0c00f43ad6b8eaeee44a3e7c34d1aa48c
    });
}


// PONTO 1 e 3: Tabela simplificada para o Dashboard Principal ("Consultas do Dia / Próximas")
function renderTabelaDashboard() {
    const tbody = document.querySelector("#tabelaConsultas table tbody");
    if (!tbody || document.getElementById("tabela-consultas")) return; // evita rodar na página errada

    tbody.innerHTML = "";

    const proximas = consultas.filter(c => c.estado === "confirmada" || c.estado === "pendente");
    if (proximas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="padding:18px;text-align:center;color:#555;">Sem consultas agendadas.</td></tr>`;
        return;
    }

    proximas.forEach(c => {
        const statusClass = c.estado === 'confirmada' ? 'done' : 'pending';
        tbody.innerHTML += `
        <tr>
            <td>${c.paciente}</td>
            <td>${c.medico}</td>
            <td>${c.hora} (${formatarData(c.data)})</td>
            <td><span class="status ${statusClass}">${c.estado}</span></td>
            <td>
                <button class="edit" onclick="window.location.href='reagendamentos.html'">Ir para Reagendamentos</button>
            </td>
        </tr>`;
    });
}

// Preenche a tabela específica da sua página de Reagendamentos (reagendamentos.html)
function renderTabelaReagendamento() {
    const tbody = document.getElementById("tabelaReagendamento");
    if (!tbody) return;

    tbody.innerHTML = "";
    consultas.filter(c => c.estado !== "cancelada" && c.estado !== "realizada").forEach(c => {
        const statusClass = c.estado === 'confirmada' ? 'confirmada' : 'pendente';
        tbody.innerHTML += `
        <tr>
            <td>${c.paciente}</td>
            <td>${c.medico}</td>
            <td>${c.especialidade}</td>
            <td>${formatarData(c.data)}</td>
            <td>${c.hora}</td>
            <td><span class="status ${statusClass}">${c.estado}</span></td>
            <td><button onclick="selecionarParaReagendar(${c.id})">Selecionar</button></td>
        </tr>`;
    });
}

function ativarAba(aba) {
    abaAtiva = aba;
    const tabAgendadas = document.getElementById("abaAgendadas");
    const tabHistorico = document.getElementById("abaHistorico");
    if (tabAgendadas && tabHistorico) {
        tabAgendadas.classList.toggle("active-tab", aba === "agendadas");
        tabHistorico.classList.toggle("active-tab", aba === "historico");
    }
    renderTabelaConsultas();
}

function renderDashboardResumo() {
    const resumo = document.getElementById("dashboardResumo");
    if (!resumo) return;

    const proxima = consultas
        .filter(c => c.estado === "confirmada" || c.estado === "pendente")
        .sort((a, b) => new Date(`${a.data}T${a.hora}`) - new Date(`${b.data}T${b.hora}`))[0];

    if (!proxima) {
        resumo.innerHTML = `<div class="hero-card"><div class="hero-title">Olá, ${perfilUsuario.nome} 👋</div><div class="hero-subtitle">Sem consultas futuras agendadas.</div></div>`;
        return;
    }

    resumo.innerHTML = `
        <div class="hero-card">
            <div class="hero-title">Olá, ${perfilUsuario.nome} 👋</div>
            <div class="hero-subtitle">Aqui estão seus últimos avisos e notificações.</div>
        </div>`;
}

function renderAlertasImportantes() {
    const alerta = document.getElementById("alertaImportante");
    if (!alerta) return;

    const proximas = consultas
        .filter(c => c.estado === "confirmada" || c.estado === "pendente")
        .sort((a, b) => new Date(`${a.data}T${a.hora}`) - new Date(`${b.data}T${b.hora}`));

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    if (proximas.length === 0) {
        alerta.innerText = "Nenhum aviso urgente no momento. Confira suas notificações mais recentes.";
        return;
    }

    const proxima = proximas[0];
    const dataConsulta = new Date(`${proxima.data}T${proxima.hora}`);
    const textoHorario = `${formatarData(proxima.data)} às ${proxima.hora}`;

    if (dataConsulta.toDateString() === amanha.toDateString()) {
        alerta.innerText = `Tem uma consulta amanhã às ${proxima.hora} com ${proxima.medico}.`;
    } else if (dataConsulta.toDateString() === hoje.toDateString()) {
        alerta.innerText = `Tem uma consulta hoje às ${proxima.hora} com ${proxima.medico}.`;
    } else {
        alerta.innerText = `Sua próxima consulta é ${textoHorario} com ${proxima.medico}.`;
    }
}

function renderNotificacoes() {
    const lista = document.getElementById("listaNotificacoes");
    if (!lista) return;
    if (notificacoes.length === 0) {
        lista.innerHTML = '<p>Sem notificações recentes.</p>';
        return;
    }

    const recentes = notificacoes.slice(0, 3);
    lista.innerHTML = recentes.map((item, index) => `
        <div class="notificacao ${item.lida ? 'lida' : 'nova'}">
            <div class="notificacao-texto">${item.texto}</div>
            <button onclick="marcarNotificacaoLida(${index})">${item.lida ? 'Lida' : 'Marcar como lida'}</button>
        </div>
    `).join("");
}

function marcarNotificacaoLida(index) {
    notificacoes[index].lida = true;
    renderNotificacoes();
}

function renderMedicos() {
    const lista = document.getElementById("listaMedicos");
    if (!lista) return;

    const termo = document.getElementById("pesquisaMedico")?.value.toLowerCase() || "";
    const encontrados = medicos.filter(m => m.status === "ativo" && (`${m.nome} ${m.especialidade} ${m.horarios}`.toLowerCase().includes(termo)));

    if (encontrados.length === 0) {
        lista.innerHTML = '<p>Nenhum médico encontrado.</p>';
        return;
    }

    lista.innerHTML = `<div class="medicos-grid">${encontrados.map(m => `
        <div class="medico-card">
            <img class="medico-photo" src="../assets/img/doctor-placeholder.jpg" alt="${m.nome}">
            <div class="medico-info">
                <div class="medico-nome">${m.nome}</div>
                <div class="medico-especialidade">${m.especialidade}</div>
                <div class="medico-meta">Disponível: Segunda a Sexta</div>
                <div class="medico-meta">Horário: ${m.horarios.replace(/,/g, ' / ')}</div>
            </div>
            <div class="medico-tags">
                <span class="medico-tag">${m.especialidade}</span>
            </div>
            <div class="medico-actions">
                <button onclick="verAgenda('${m.nome}')">Ver Agenda</button>
            </div>
        </div>
    `).join('')}</div>`;
}

function verAgenda(nome) {
    const medico = medicos.find(m => m.nome === nome);
    if (!medico) return;

    const modal = document.getElementById('modalAgenda');
    const modalNome = document.getElementById('modalMedicoNome');
    const modalDetalhes = document.getElementById('modalMedicoDetalhes');

    modalNome.innerText = `${medico.nome} - Agenda`;
    modalDetalhes.innerHTML = `
        <div class="modal-section">
            <div class="modal-row"><strong>Especialidade:</strong> ${medico.especialidade}</div>
            <div class="modal-row"><strong>Horário:</strong> ${medico.horarios.replace(/,/g, ' / ')}</div>
        </div>
        <div class="modal-section">
            <h4>Consultas disponíveis</h4>
            <ul>${obterHorarios(medico.nome).map(h => `<li>${h}</li>`).join('')}</ul>
        </div>
    `;

    modal.style.display = 'flex';
}

function fecharModalMedico() {
    const modal = document.getElementById('modalAgenda');
    if (modal) modal.style.display = 'none';
}


function verConsulta(id) {
    const consulta = consultas.find(c => c.id === id);
    if (!consulta) return;
    alert(`Consulta: ${consulta.especialidade}\nMédico: ${consulta.medico}\nData: ${formatarData(consulta.data)}\nHora: ${consulta.hora}\nEstado: ${consulta.estado}`);
}

/* ==========================================================================
   PONTO 1: ATUALIZAR CARDS INFORMATIVOS DO DASHBOARD
   ========================================================================== */
function atualizarCards() {
    // Atualização para a tela de consultas
    if (document.getElementById("pendentes")) document.getElementById("pendentes").innerText = consultas.filter(c => c.estado === "pendente").length;
    if (document.getElementById("confirmadas")) document.getElementById("confirmadas").innerText = consultas.filter(c => c.estado === "confirmada").length;
    if (document.getElementById("canceladas")) document.getElementById("canceladas").innerText = consultas.filter(c => c.estado === "cancelada").length;

    // Atualização dos cards da Página Inicial (index.html)
    const cardProximas = document.querySelector(".cards .card:nth-child(1) p");
    if (cardProximas) cardProximas.innerText = consultas.filter(c => c.estado === "confirmada" || c.estado === "pendente").length;

    const cardMarcadas = document.querySelector(".cards .card:nth-child(2) p");
    if (cardMarcadas) cardMarcadas.innerText = consultas.length;

    const cardRealizadas = document.querySelector(".cards .card:nth-child(3) p");
    if (cardRealizadas) cardRealizadas.innerText = consultas.filter(c => c.estado === "realizada").length;
    const notificacoesCountEl = document.getElementById("notificacoesCount");
    if (notificacoesCountEl) notificacoesCountEl.innerText = notificacoes.filter(n => !n.lida).length;
}

function marcarTodasNotificacoesLidas() {
    notificacoes = notificacoes.map(item => ({ ...item, lida: true }));
    renderNotificacoes();
    atualizarCards();
}

/* ==========================================================================
   PONTO 7: TRATAMENTO DE HORÁRIOS E INPUTS DINÂMICOS
   ========================================================================== */
function obterHorarios(nome) {
    const medico = medicos.find(m => m.nome === nome && m.status === "ativo");
    if (!medico) return [];
<<<<<<< HEAD
    return medico.horarios || [];
}

/* =======================
RENDERIZAR TABELA
======================= */
function renderTabela(listaParaRenderizar = consultas) {
    const tbody = document.getElementById("tabela-consultas");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (listaParaRenderizar.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 20px; color: #888;">Nenhuma consulta encontrada com este critério.</td></tr>`;
        return;
    }

    listaParaRenderizar.forEach(c => {
        tbody.innerHTML += `
        <tr>
            <td>${c.paciente || c.nome}</td>
            <td>${c.medico}</td>
            <td>${c.especialidade || 'Geral'}</td>
            <td>${c.data}</td>
            <td>${c.hora}</td>
            <td><span class="status ${c.estado}">${c.estado}</span></td>
            <td>
                ${c.estado === 'pendente' ? `<button class="confirm" onclick="confirmar(${c.id})">Confirmar</button>` : ''}
                <button class="edit" onclick="reagendar(${c.id})">Reagendar</button>
                ${c.estado !== 'cancelada' ? `<button class="cancel" onclick="cancelar(${c.id})">Cancelar</button>` : ''}
            </td>
        </tr>`;
    });
}

/* =======================
ATUALIZAR CARDS (Totais dinâmicos)
======================= */
function atualizarCards() {
    // Pega a data de hoje no formato YYYY-MM-DD
    const hojeObj = new Date();
    const ano = hojeObj.getFullYear();
    const mes = String(hojeObj.getMonth() + 1).padStart(2, '0');
    const dia = String(hojeObj.getDate()).padStart(2, '0');
    const hojeData = `${ano}-${mes}-${dia}`;

    const totalHoje = consultas.filter(c => c.data === hojeData).length;
    const totalPendentes = consultas.filter(c => c.estado === "pendente").length;
    const totalCanceladas = consultas.filter(c => c.estado === "cancelada").length;

    // Cálculo dinâmico do Total de Pacientes Únicos
    const listaNomes = consultas.map(c => c.paciente || c.nome);
    const pacientesUnicos = [...new Set(listaNomes)].filter(Boolean).length;

    if(document.getElementById("consultasHoje")) document.getElementById("consultasHoje").innerText = totalHoje;
    if(document.getElementById("pendentes")) document.getElementById("pendentes").innerText = totalPendentes;
    if(document.getElementById("canceladas")) document.getElementById("canceladas").innerText = totalCanceladas;
    if(document.getElementById("totalPacientes")) document.getElementById("totalPacientes").innerText = pacientesUnicos;
}

/* =======================
FILTROS ALTERNÁVEIS (Ligar/Desligar)
======================= */
function filtrarTabelaPorEstado(estadoSelecionado) {
    // 1. Liga/Desliga o filtro
    if (filtroAtivo === estadoSelecionado) {
        filtroAtivo = null;
    } else {
        filtroAtivo = estadoSelecionado;
    }

    // 2. Atualiza a classe ativa visual nos cards
    document.querySelectorAll('.card').forEach(card => card.classList.remove('active-filter'));
    
    if (filtroAtivo) {
        const cardSelecionado = document.getElementById(`card-${filtroAtivo}`);
        if (cardSelecionado) cardSelecionado.classList.add('active-filter');
    }

    // 3. Renderiza a tabela filtrada
    aplicarFiltroAtual();
}

function aplicarFiltroAtual() {
    const titulo = document.getElementById("titulo-tabela");
    
    if (filtroAtivo === null) {
        if (titulo) titulo.innerText = "Todas as Consultas";
        renderTabela(consultas);
        return;
    }

    let listaFiltrada = [];

    if (filtroAtivo === 'hoje') {
        const hojeObj = new Date();
        const ano = hojeObj.getFullYear();
        const mes = String(hojeObj.getMonth() + 1).padStart(2, '0');
        const dia = String(hojeObj.getDate()).padStart(2, '0');
        const hojeData = `${ano}-${mes}-${dia}`;
        
        listaFiltrada = consultas.filter(c => c.data === hojeData);
        if (titulo) titulo.innerText = "Consultas de Hoje";
    } else {
        listaFiltrada = consultas.filter(c => c.estado === filtroAtivo);
        if (titulo) titulo.innerText = `Consultas: ${filtroAtivo.charAt(0).toUpperCase() + filtroAtivo.slice(1)}s`;
    }

    renderTabela(listaFiltrada);
}

/* =======================
AÇÕES
======================= */
function confirmar(id){
    consultas = consultas.map(c => c.id === id ? {...c, estado: "confirmada"} : c);
    localStorage.setItem("consultas", JSON.stringify(consultas));
    aplicarFiltroAtual();
    atualizarCards();
}

function cancelar(id){
    if(!confirm("Tem a certeza que deseja cancelar esta consulta?")) return;
    consultas = consultas.map(c => c.id === id ? {...c, estado: "cancelada"} : c);
    localStorage.setItem("consultas", JSON.stringify(consultas));
    aplicarFiltroAtual();
    atualizarCards();
}

function reagendar(id){
    const d = prompt("Introduza a nova Data (AAAA-MM-DD):");
    const h = prompt("Introduza a nova Hora (HH:MM):");
    if(!d || !h) return;
    
    consultas = consultas.map(c => c.id === id ? {...c, data: d, hora: h} : c);
    localStorage.setItem("consultas", JSON.stringify(consultas));
    aplicarFiltroAtual();
    atualizarCards();
}

/* =======================
INICIALIZAÇÃO
======================= */
window.addEventListener("DOMContentLoaded", () => {
    carregarMedicos();
    carregarConsultas();
});
=======
    return medico.horarios.split(",");
}

function carregarHorarios() {
    // Mapeia tanto o modal genérico quanto os inputs soltos da tela de reagendamentos.html
    const medicoNome = document.getElementById("medico")?.value || document.getElementById("selecionadoMedico")?.innerText;
    const dataInput = document.getElementById("data") || document.getElementById("editData");
    const horaSelect = document.getElementById("hora") || document.getElementById("editHora");

    if (!horaSelect) return;
    horaSelect.innerHTML = `<option value="">Selecionar hora</option>`;

    const medico = medicos.find(m => m.nome === medicoNome && m.status === "ativo");
    if (!medico) {
        if (dataInput) dataInput.disabled = true;
        horaSelect.disabled = true;
        return;
    }

    if (dataInput) {
        dataInput.disabled = false;
        dataInput.min = new Date().toISOString().split('T')[0];
    }

    if (dataInput && !dataInput.value) {
        horaSelect.disabled = true;
        return;
    }

    horaSelect.disabled = false;
    const horarios = obterHorarios(medico.nome);
    horarios.forEach(h => {
        horaSelect.innerHTML += `<option value="${h}">${h}</option>`;
    });
}

function carregarListaMedicos() {
    const especialidade = document.getElementById("especialidade").value;
    const select = document.getElementById("medico");
    if (!select) return;

    select.innerHTML = `<option value="">Selecionar Médico</option>`;
    if (!especialidade) {
        select.disabled = true;
        return;
    }

    const medicosFiltrados = medicos.filter(m => m.status === "ativo" && m.especialidade === especialidade);
    medicosFiltrados.forEach(m => {
        select.innerHTML += `<option value="${m.nome}">${m.nome}</option>`;
    });
    select.disabled = medicosFiltrados.length === 0;
    carregarHorarios();
}

function carregarEspecialidades() {
    const select = document.getElementById("especialidade");
    if (!select) return;
    select.innerHTML = `<option value="">Selecionar Especialidade</option>`;

    const especialidades = [...new Set(medicos.filter(m => m.status === "ativo").map(m => m.especialidade))].sort();
    especialidades.forEach(esp => {
        select.innerHTML += `<option value="${esp}">${esp}</option>`;
    });
}

/* ==========================================================================
   AÇÕES: REAGENDAR, CANCELAR E CONFIRMAR
   ========================================================================== */
async function cancelar(id) {
    if (!confirm("Tem certeza que deseja cancelar esta consulta?")) return;
    try {
        // Tenta atualizar no servidor.py, cai no catch local se não houver servidor rodando.
        try {
            const resultado = await atualizarConsultaBackend(id, { estado: "cancelada" });
            consultas = consultas.map(c => c.id === id ? resultado.consulta : c);
        } catch {
            consultas = consultas.map(c => c.id === id ? { ...c, estado: "cancelada" } : c);
        }
        alert("Consulta cancelada com sucesso!");
        renderTabelaConsultas();
        renderTabelaDashboard();
        atualizarCards();
    } catch (error) {
        alert(error.message);
    }
}

function selecionarParaReagendar(id) {
    const consulta = consultas.find(c => c.id === id);
    if (!consulta) return;

    consultaEmEdicao = consulta.id;
    document.getElementById("selecionadoPaciente").innerText = consulta.paciente;
    document.getElementById("selecionadoMedico").innerText = consulta.medico;
    document.getElementById("selecionadoEspecialidade").innerText = consulta.especialidade;
    
    const editData = document.getElementById("editData");
    editData.value = consulta.data;
    carregarHorarios();
    document.getElementById("editHora").value = consulta.hora;
}

async function guardarEdicao() {
    if (!consultaEmEdicao) {
        alert("Por favor, selecione uma consulta na tabela acima primeiro.");
        return;
    }
    const novaData = document.getElementById("editData").value;
    const novaHora = document.getElementById("editHora").value;

    if (!novaData || !novaHora) {
        alert("Preencha a nova data e o novo horário.");
        return;
    }

    try {
        try {
            const resultado = await atualizarConsultaBackend(consultaEmEdicao, { data: novaData, hora: novaHora, estado: "pendente" });
            consultas = consultas.map(c => c.id === consultaEmEdicao ? resultado.consulta : c);
        } catch {
            consultas = consultas.map(c => c.id === consultaEmEdicao ? { ...c, data: novaData, hora: novaHora, estado: "pendente" } : c);
        }
        
        // PONTO 9: Alerta estruturado de Confirmação bem-sucedida
        alert(`Consulta Reagendada com Sucesso!\n\nData: ${formatarData(novaData)}\nHora: ${novaHora}`);
        
        consultaEmEdicao = null;
        window.location.href = "consultas.html"; // Redireciona de volta para visualização
    } catch (error) {
        alert(error.message);
    }
}

// Modal Genérico (Suportado na página de listagem)
function reagendar(id) {
    consultaEmEdicao = id;
    const consulta = consultas.find(c => c.id === id);
    if (consulta) {
        abrirModal();
        document.getElementById("modalTitle").innerText = "Reagendar Consulta";
        document.getElementById("paciente").value = consulta.paciente;
        document.getElementById("especialidade").value = consulta.especialidade;
        carregarListaMedicos();
        document.getElementById("medico").value = consulta.medico;
        document.getElementById("data").value = consulta.data;
        carregarHorarios();
        document.getElementById("hora").value = consulta.hora;
    }
}

function marcarConsulta() {
    consultaEmEdicao = null;
    abrirModal();
    document.getElementById("modalTitle").innerText = "Marcar Consulta";
    document.getElementById("paciente").value = perfilUsuario.nome; // Auto-preenche com o perfil logado
    document.getElementById("especialidade").value = "";
    if (document.getElementById("medico")) document.getElementById("medico").innerHTML = '<option value="">Selecionar Médico</option>';
    if (document.getElementById("data")) document.getElementById("data").value = "";
    if (document.getElementById("hora")) document.getElementById("hora").innerHTML = '<option value="">Selecionar hora</option>';
}

function abrirModal() { document.getElementById("modal").style.display = "flex"; }
function fecharModal() { document.getElementById("modal").style.display = "none"; }

async function guardarConsulta() {
    const medico = document.getElementById("medico").value;
    const specialty = document.getElementById("especialidade").value;
    const data = document.getElementById("data").value;
    const hora = document.getElementById("hora").value;

    if (!medico || !specialty || !data || !hora) {
        alert("Preencha todos os campos obrigatórios.");
        return;
    }

    const novaConsulta = { id: consultas.length + 1, medico, especialidade: specialty, data, hora, estado: "pendente" };
    consultas.push(novaConsulta);
    
    alert(`Consulta agendada com sucesso!\n\nMédico: ${medico}\nData: ${formatarData(data)}\nHora: ${hora}`);
    fecharModal();
    renderTabelaConsultas();
    atualizarCards();
}

/* ==========================================================================
   PONTOS EXTRA: PERFIL, COMPLEMENTOS E FILTROS
   ========================================================================== */
async function carregarDadosPerfil() {
    const util = JSON.parse(localStorage.getItem("utilizador") || "null");
    if (!util || !util.email) return;

    const perfilPadrao = {
        nome: util.nome || "",
        email: util.email || "",
        telefone: "",
        bii: "",
        dataNascimento: "",
        sexo: "",
        morada: "",
        nomeUtilizador: util.email.split("@")[0] || "",
        dataRegistro: "Não disponível",
        ultimoAcesso: "Não disponível",
        tipo: util.tipo || ""
    };

    let perfil = perfilPadrao;
    try {
        const res = await fetch(`${API_URL}/utilizador?email=${encodeURIComponent(util.email)}`);
        if (res.ok) {
            const data = await res.json();
            perfil = { ...perfilPadrao, ...data };
        }
    } catch (error) {
        console.warn("Não foi possível carregar perfil do servidor:", error);
    }

    if (document.getElementById("nomePerfil")) document.getElementById("nomePerfil").value = perfil.nome;
    if (document.getElementById("biiPerfil")) document.getElementById("biiPerfil").value = perfil.bii || "";
    if (document.getElementById("dataNascimentoPerfil")) document.getElementById("dataNascimentoPerfil").value = perfil.dataNascimento || "";
    if (document.getElementById("sexoPerfil")) document.getElementById("sexoPerfil").value = perfil.sexo || "";
    if (document.getElementById("telefonePerfil")) document.getElementById("telefonePerfil").value = perfil.telefone;
    if (document.getElementById("emailPerfil")) document.getElementById("emailPerfil").value = perfil.email;
    if (document.getElementById("moradaPerfil")) document.getElementById("moradaPerfil").value = perfil.morada || "";
    if (document.getElementById("usernamePerfil")) document.getElementById("usernamePerfil").innerText = perfil.nomeUtilizador || perfilPadrao.nomeUtilizador;
    if (document.getElementById("dataRegistoPerfil")) document.getElementById("dataRegistoPerfil").innerText = perfil.dataRegistro || "Não disponível";
    if (document.getElementById("ultimoAcessoPerfil")) document.getElementById("ultimoAcessoPerfil").innerText = perfil.ultimoAcesso || "Não disponível";
    if (document.getElementById("tipoPerfil")) document.getElementById("tipoPerfil").innerText = perfil.tipo || "-";
}

function obterPrimeiroUltimoNome(nomeCompleto) {
    if (!nomeCompleto) return "";
    const partes = nomeCompleto.trim().split(/\s+/).filter(Boolean);
    if (partes.length === 0) return "";
    if (partes.length === 1) return partes[0];
    return `${partes[0]} ${partes[partes.length - 1]}`;
}

function mostrarUsuarioTopo() {
    const usuarioNome = document.getElementById("usuarioNome");
    const usuarioEmail = document.getElementById("usuarioEmail");
    if (!usuarioNome || !usuarioEmail) return;

    const util = JSON.parse(localStorage.getItem("utilizador") || "null");
    if (util && util.nome && util.email) {
        usuarioNome.innerText = obterPrimeiroUltimoNome(util.nome);
        usuarioEmail.innerText = util.email;
        return;
    }

    usuarioNome.innerText = "Pacientes";
    usuarioEmail.innerText = "";
}

async function salvarPerfil() {
    const util = JSON.parse(localStorage.getItem("utilizador") || "null");
    if (!util || !util.email) {
        alert("Não foi possível encontrar o utilizador da sessão.");
        return;
    }

    const nome = document.getElementById("nomePerfil")?.value.trim() || "";
    const bii = document.getElementById("biiPerfil")?.value.trim() || "";
    const dataNascimento = document.getElementById("dataNascimentoPerfil")?.value || "";
    const sexo = document.getElementById("sexoPerfil")?.value || "";
    const telefone = document.getElementById("telefonePerfil")?.value.trim() || "";
    const email = document.getElementById("emailPerfil")?.value.trim() || "";
    const morada = document.getElementById("moradaPerfil")?.value.trim() || "";

    if (!nome || !email) {
        alert("Nome completo e email são obrigatórios.");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/utilizador`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                emailOriginal: util.email,
                nome,
                email,
                telefone
            })
        });

        if (!res.ok) {
            const erro = await res.json().catch(() => ({}));
            throw new Error(erro.mensagem || "Não foi possível atualizar o perfil.");
        }

        localStorage.setItem("utilizador", JSON.stringify({ ...util, nome, email, tipo: util.tipo }));
        alert("Perfil atualizado com sucesso.");
        carregarDadosPerfil();
    } catch (error) {
        alert(error.message);
    }
}

function preverFoto(event) {
    const arquivo = event.target.files[0];
    if (!arquivo) return;
    const leitor = new FileReader();
    leitor.onload = function(e) {
        const img = document.getElementById("perfilFoto");
        if (img) img.src = e.target.result;
    };
    leitor.readAsDataURL(arquivo);
}

function formatarData(dataString) {
    if (!dataString) return "";
    const partes = dataString.split("-");
    if (partes.length !== 3) return dataString;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

/* ==========================================================================
   INICIALIZAÇÃO DO ECOSSISTEMA
   ========================================================================== */
async function init() {
    await carregarMedicos();
    await carregarConsultas();
    
    document.getElementById("pesquisaGeral")?.addEventListener("input", renderTabelaConsultas);
    document.getElementById("filtroEstado")?.addEventListener("change", renderTabelaConsultas);
    document.getElementById("editData")?.addEventListener("change", carregarHorarios);
    document.getElementById("pesquisaMedico")?.addEventListener("input", renderMedicos);

    if (window.location.hash === "#marcar") {
        marcarConsulta();
    }
    if (window.location.hash === "#historico") {
        ativarAba("historico");
    }
    mostrarUsuarioTopo();
}

window.addEventListener("DOMContentLoaded", init);
>>>>>>> 9aa433b0c00f43ad6b8eaeee44a3e7c34d1aa48c
