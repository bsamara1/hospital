const API_URL = "http://127.0.0.1:5000";
let consultas = [];
let medicos = [];
let consultaEmEdicao = null;
let abaAtiva = "agendadas";

// Variável para controlar qual o filtro ativo ('hoje', 'pendente', 'cancelada' ou null)
let filtroAtivo = null;

// Dados simulados de Perfil e Notificações
let perfilUsuario = { 
    nome: "Benedita", 
    email: "benedita@email.com", 
    telefone: "999999999", 
    foto: "../assets/img/profile.png" 
};

let notificacoes = [
    { texto: "Sua consulta de Cardiologia foi confirmada!", lida: false },
    { texto: "Lembrete: Consulta amanhã às 10:40 com Dr. Mendes.", lida: false },
    { texto: "Consulta reagendada para 17/07/2026 às 10:40.", lida: true }
];

/* ==========================================================================
   CARREGAR DADOS (INIT) AND EVENT LISTENERS
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    // Inicializa os dados da aplicação
    carregarMedicos();
    carregarConsultas();

    // Ouvir o formulário de marcação/triagem se ele existir na página atual
    const formMarcacao = document.getElementById("formMarcacao");
    if (formMarcacao) {
        formMarcacao.addEventListener("submit", function(e) {
            e.preventDefault();
            guardarConsultaTriagem();
        });
    }

    // Ouvir mudanças nos filtros se existirem na página
    document.getElementById("especialidade")?.addEventListener("change", carregarListaMedicos);
    document.getElementById("medico")?.addEventListener("change", carregarHorarios);
    document.getElementById("data")?.addEventListener("change", carregarHorarios);
    document.getElementById("editData")?.addEventListener("change", carregarHorarios);
    document.getElementById("pesquisaGeral")?.addEventListener("input", renderTabelaConsultas);
    document.getElementById("filtroEstado")?.addEventListener("change", renderTabelaConsultas);
    document.getElementById("pesquisaMedico")?.addEventListener("input", renderMedicos);
});

async function carregarMedicos() {
    try {
        const res = await fetch(`${API_URL}/medicos`);
        if (!res.ok) throw new Error("API não disponível");
        medicos = await res.json();
    } catch (error) {
        console.warn("Erro ao carregar médicos da API. Usando fallback local...", error);
        // Fallback local se a API estiver offline com valores normalizados para bater com o HTML
        medicos = [
            { "id": "m1", "nome": "Dr. Mendes", "especialidade": "cardiologia", "horarios": "09:00,10:00,11:00,14:00", "status": "ativo" },
            { "id": "m2", "nome": "Dr. Sousa", "especialidade": "ortopedia", "horarios": "08:00,09:00,10:00,11:00,14:00", "status": "ativo" },
            { "id": "m3", "nome": "Dr. João Silva", "especialidade": "clinica-geral", "horarios": "08:00,09:00,10:00,14:00", "status": "ativo" },
            { "id": "m4", "nome": "Dra. Clara Gomes", "especialidade": "pediatria", "horarios": "09:00,10:00,11:00", "status": "ativo" },
            { "id": "m5", "nome": "Dr. Ricardo Jorge", "especialidade": "dermatologia", "horarios": "08:00,11:00,14:00", "status": "ativo" }
        ];
    }
    carregarListaMedicos();
    carregarEspecialidades();
}

async function carregarConsultas() {
    try {
        const res = await fetch(`${API_URL}/consultas`);
        if (!res.ok) throw new Error("API não disponível");
        consultas = await res.json();
    } catch (error) {
        console.warn("Erro ao carregar consultas da API. Tentando localStorage...", error);
        const localData = localStorage.getItem("consultas");
        if (localData) {
            consultas = JSON.parse(localData);
        } else {
            consultas = [
                { id: 1, paciente: "Benedita", medico: "Dr. Mendes", especialidade: "cardiologia", data: "2026-07-17", hora: "10:00", estado: "confirmada" },
                { id: 2, paciente: "Benedita", medico: "Dr. Sousa", especialidade: "ortopedia", data: "2026-07-20", hora: "08:30", estado: "pendente" },
                { id: 3, paciente: "Benedita", medico: "Dr. Mendes", especialidade: "cardiologia", data: "2026-03-15", hora: "14:00", estado: "realizada" }
            ];
            localStorage.setItem("consultas", JSON.stringify(consultas));
        }
    }

    aplicarFiltroAtual();
    renderTabelaConsultas();
    renderTabelaDashboard();
    renderTabelaReagendamento();
    renderNotificacoes();
    renderMedicos();
    renderDashboardResumo();
    renderAlertasImportantes();
    atualizarCards();
    carregarDadosPerfil();
    mostrarUsuarioTopo();
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

function formatarData(dataStr) {
    if (!dataStr) return "";
    const partes = dataStr.split("-");
    if (partes.length !== 3) return dataStr;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function formatarNomeEspecialidade(slug) {
    const nomes = {
        "clinica-geral": "Clínica Geral",
        "cardiologia": "Cardiologia",
        "ortopedia": "Ortopedia",
        "pediatria": "Pediatria",
        "dermatologia": "Dermatologia"
    };
    return nomes[slug] || slug;
}

function renderTabela(listaParaRenderizar = consultas) {
    const tbody = document.getElementById("tabela-consultas");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (listaParaRenderizar.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 20px; color: #888;">Nenhuma consulta encontrada com este critério.</td></tr>`;
        return;
    }

    listaParaRenderizar.forEach(c => {
        const statusClass = c.estado === 'confirmada' ? 'confirmada' : c.estado === 'pendente' ? 'pendente' : c.estado === 'realizada' ? 'done' : 'cancelada';
        tbody.innerHTML += `
        <tr>
            <td>${c.paciente || c.nome || "Paciente"}</td>
            <td>${c.medico}</td>
            <td>${formatarNomeEspecialidade(c.especialidade)}</td>
            <td>${formatarData(c.data)}</td>
            <td>${c.hora}</td>
            <td><span class="status ${statusClass}">${c.estado.toUpperCase()}</span></td>
            <td>
                ${c.estado === 'pendente' ? `<button class="confirm" onclick="confirmar(${c.id})">Confirmar</button>` : ''}
                <button class="edit" onclick="reagendar(${c.id})">Reagendar</button>
                ${c.estado !== 'cancelada' && c.estado !== 'realizada' ? `<button class="cancel" onclick="cancelar(${c.id})">Cancelar</button>` : ''}
            </td>
        </tr>`;
    });
}

function renderTabelaConsultas() {
    const tbody = document.getElementById("tabela-consultas");
    if (!tbody || filtroAtivo !== null) return; 

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

    if (consultasFiltradas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:18px; color:#555;">Nenhuma consulta encontrada.</td></tr>`;
        return;
    }

    consultasFiltradas.forEach(c => {
        const statusClass = c.estado === 'confirmada' ? 'confirmada' : c.estado === 'pendente' ? 'pendente' : c.estado === 'realizada' ? 'done' : 'cancelada';
        tbody.innerHTML += `
        <tr>
            <td>${formatarData(c.data)}</td>
            <td>${c.hora}</td>
            <td>${c.medico}</td>
            <td>${formatarNomeEspecialidade(c.especialidade)}</td>
            <td><span class="status ${statusClass}">${c.estado.toUpperCase()}</span></td>
            <td>
                ${c.estado !== 'cancelada' && c.estado !== 'realizada' ? `<button class="edit" onclick="reagendar(${c.id})"><i class="fa fa-edit"></i> Reagendar</button>` : ''}
                ${c.estado !== 'cancelada' && c.estado !== 'realizada' ? `<button class="cancel" onclick="cancelar(${c.id})"><i class="fa fa-trash"></i> Cancelar</button>` : ''}
            </td>
        </tr>`;
    });
}

function renderTabelaDashboard() {
    const tbody = document.querySelector("#tabelaConsultas table tbody");
    if (!tbody) return;

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
            <td>${c.paciente || "Benedita"}</td>
            <td>${c.medico}</td>
            <td>${c.hora} (${formatarData(c.data)})</td>
            <td><span class="status ${statusClass}">${c.estado.toUpperCase()}</span></td>
            <td>
                <button class="edit" onclick="window.location.href='reagendamentos.html'">Ir para Reagendamentos</button>
            </td>
        </tr>`;
    });
}

function renderTabelaReagendamento() {
    const tbody = document.getElementById("tabelaReagendamento");
    if (!tbody) return;

    tbody.innerHTML = "";
    const pendentesEDisponiveis = consultas.filter(c => c.estado !== "cancelada" && c.estado !== "realizada");
    
    if (pendentesEDisponiveis.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:15px;">Nenhuma consulta disponível para reagendar.</td></tr>`;
        return;
    }

    pendentesEDisponiveis.forEach(c => {
        const statusClass = c.estado === 'confirmada' ? 'confirmada' : 'pendente';
        tbody.innerHTML += `
        <tr>
            <td>${c.paciente || "Benedita"}</td>
            <td>${c.medico}</td>
            <td>${formatarNomeEspecialidade(c.especialidade)}</td>
            <td>${formatarData(c.data)}</td>
            <td>${c.hora}</td>
            <td><span class="status ${statusClass}">${c.estado.toUpperCase()}</span></td>
            <td><button onclick="selecionarParaReagendar(${c.id})">Selecionar</button></td>
        </tr>`;
    });
}

function acaoAtivarAba(aba) {
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

    resumo.innerHTML = `
        <div class="hero-card">
            <div class="hero-title">Olá, ${perfilUsuario.nome} 👋</div>
            <div class="hero-subtitle">Aqui estão os seus últimos avisos e notificações.</div>
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
        alerta.innerText = "Nenhum aviso urgente no momento. Confira as suas notificações mais recentes.";
        return;
    }

    const proxima = proximas[0];
    const textoHorario = `${formatarData(proxima.data)} às ${proxima.hora}`;

    if (proxima.data === hoje.toISOString().split('T')[0]) {
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
    atualizarCards();
}

function renderMedicos() {
    const lista = document.getElementById("listaMedicos");
    if (!lista) return;

    const termo = document.getElementById("pesquisaMedico")?.value.toLowerCase() || "";
    const encontrados = medicos.filter(m => m.status === "ativo" && (`${m.nome} ${m.especialidade}`.toLowerCase().includes(termo)));

    if (encontrados.length === 0) {
        lista.innerHTML = '<p>Nenhum médico encontrado.</p>';
        return;
    }

    lista.innerHTML = `<div class="medicos-grid">${encontrados.map(m => `
        <div class="medico-card">
            <img class="medico-photo" src="../assets/img/doctor-placeholder.jpg" alt="${m.nome}">
            <div class="medico-info">
                <div class="medico-nome">${m.nome}</div>
                <div class="medico-especialidade">${formatarNomeEspecialidade(m.especialidade)}</div>
                <div class="medico-meta">Disponível: Segunda a Sexta</div>
                <div class="medico-meta">Horário: ${m.horarios.replace(/,/g, ' / ')}</div>
            </div>
            <div class="medico-tags">
                <span class="medico-tag">${formatarNomeEspecialidade(m.especialidade)}</span>
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

    if(!modal) return;

    modalNome.innerText = `${medico.nome} - Agenda`;
    modalDetalhes.innerHTML = `
        <div class="modal-section">
            <div class="modal-row"><strong>Especialidade:</strong> ${formatarNomeEspecialidade(medico.especialidade)}</div>
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

/* ==========================================================================
   ATUALIZAR CARDS INFORMATIVOS (INDICADORES)
   ========================================================================== */
function atualizarCards() {
    const hojeObj = new Date();
    const hojeData = `${hojeObj.getFullYear()}-${String(hojeObj.getMonth() + 1).padStart(2, '0')}-${String(hojeObj.getDate()).padStart(2, '0')}`;

    const totalHoje = consultas.filter(c => c.data === hojeData).length;
    const totalPendentes = consultas.filter(c => c.estado === "pendente").length;
    const totalConfirmadas = consultas.filter(c => c.estado === "confirmada").length;
    const totalCanceladas = consultas.filter(c => c.estado === "cancelada").length;
    const totalRealizadas = consultas.filter(c => c.estado === "realizada").length;

    const listaNomes = consultas.map(c => c.paciente || c.nome);
    const pacientesUnicos = [...new Set(listaNomes)].filter(Boolean).length;

    if(document.getElementById("consultasHoje")) document.getElementById("consultasHoje").innerText = totalHoje;
    if(document.getElementById("pendentes")) document.getElementById("pendentes").innerText = totalPendentes;
    if(document.getElementById("confirmadas")) document.getElementById("confirmadas").innerText = totalConfirmadas;
    if(document.getElementById("canceladas")) document.getElementById("canceladas").innerText = totalCanceladas;
    if(document.getElementById("totalPacientes")) document.getElementById("totalPacientes").innerText = pacientesUnicos;

    const cardProximas = document.querySelector(".cards .card:nth-child(1) p");
    if (cardProximas) cardProximas.innerText = totalConfirmadas + totalPendentes;

    const cardMarcadas = document.querySelector(".cards .card:nth-child(2) p");
    if (cardMarcadas) cardMarcadas.innerText = consultas.length;

    const cardRealizadas = document.querySelector(".cards .card:nth-child(3) p");
    if (cardRealizadas) cardRealizadas.innerText = totalRealizadas;

    const notificacoesCountEl = document.getElementById("notificacoesCount");
    if (notificacoesCountEl) notificacoesCountEl.innerText = notificacoes.filter(n => !n.lida).length;
}

function marcarTodasNotificacoesLidas() {
    notificacoes = notificacoes.map(item => ({ ...item, lida: true }));
    renderNotificacoes();
    atualizarCards();
}

/* ==========================================================================
   FILTROS ALTERNÁVEIS (Ligar/Desligar)
   ========================================================================== */
function filtrarTabelaPorEstado(estadoSelecionado) {
    if (filtroAtivo === estadoSelecionado) {
        filtroAtivo = null;
    } else {
        filtroAtivo = estadoSelecionado;
    }

    document.querySelectorAll('.card').forEach(card => card.classList.remove('active-filter'));
    
    if (filtroAtivo) {
        const cardSelecionado = document.getElementById(`card-${filtroAtivo}`);
        if (cardSelecionado) cardSelecionado.classList.add('active-filter');
    }

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
        const hojeData = `${hojeObj.getFullYear()}-${String(hojeObj.getMonth() + 1).padStart(2, '0')}-${String(hojeObj.getDate()).padStart(2, '0')}`;
        listaFiltrada = consultas.filter(c => c.data === hojeData);
        if (titulo) titulo.innerText = "Consultas de Hoje";
    } else {
        listaFiltrada = consultas.filter(c => c.estado === filtroAtivo);
        if (titulo) titulo.innerText = `Consultas: ${filtroAtivo.charAt(0).toUpperCase() + filtroAtivo.slice(1)}s`;
    }

    renderTabela(listaFiltrada);
}

/* ==========================================================================
   TRATAMENTO DE HORÁRIOS E INPUTS DINÂMICOS
   ========================================================================== */
function obterHorarios(nome) {
    const medico = medicos.find(m => m.nome === nome && m.status === "ativo");
    if (!medico) return [];
    
    if (typeof medico.horarios === "string") {
        return medico.horarios.split(",");
    }
    return medico.horarios || [];
}

function carregarHorarios() {
    const medicoNome = document.getElementById("medico")?.value || document.getElementById("selecionadoMedico")?.innerText;
    const dataInput = document.getElementById("data") || document.getElementById("dataConsulta") || document.getElementById("editData");
    const horaSelect = document.getElementById("hora") || document.getElementById("horaConsulta") || document.getElementById("editHora");

    if (!horaSelect) return;
    horaSelect.innerHTML = `<option value="">Selecionar horário...</option>`;

    const medico = medicos.find(m => m.nome === medicoNome && m.status === "ativo");
    if (!medico) {
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
    const especialidade = document.getElementById("especialidade")?.value;
    const select = document.getElementById("medico");
    if (!select) return;

    select.innerHTML = `<option value="">Selecione o médico...</option>`;
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
    
    // Guardar o valor selecionado se já existir um
    const valorAtual = select.value;
    select.innerHTML = `<option value="">Selecione a especialidade...</option>`;

    const especialidades = [...new Set(medicos.filter(m => m.status === "ativo").map(m => m.especialidade))].sort();
    especialidades.forEach(esp => {
        select.innerHTML += `<option value="${esp}">${formatarNomeEspecialidade(esp)}</option>`;
    });

    if (valorAtual) select.value = valorAtual;
}

/* ==========================================================================
   AÇÕES: CONFIRMAR, CANCELAR E GRAVAR CONSULTA (COM TRIAGEM)
   ========================================================================== */
async function confirmar(id) {
    try {
        try {
            const resultado = await atualizarConsultaBackend(id, { estado: "confirmada" });
            consultas = consultas.map(c => c.id === id ? resultado.consulta : c);
        } catch {
            consultas = consultas.map(c => c.id === id ? {...c, estado: "confirmada"} : c);
        }
        localStorage.setItem("consultas", JSON.stringify(consultas));
        aplicarFiltroAtual();
        renderTabelaConsultas();
        atualizarCards();
    } catch (error) {
        alert(error.message);
    }
}

async function cancelar(id) {
    if (!confirm("Tem a certeza que deseja cancelar esta consulta?")) return;
    try {
        try {
            const resultado = await atualizarConsultaBackend(id, { estado: "cancelada" });
            consultas = consultas.map(c => c.id === id ? resultado.consulta : c);
        } catch {
            consultas = consultas.map(c => c.id === id ? { ...c, estado: "cancelada" } : c);
        }
        localStorage.setItem("consultas", JSON.stringify(consultas));
        alert("Consulta cancelada com sucesso!");
        aplicarFiltroAtual();
        renderTabelaConsultas();
        renderTabelaDashboard();
        atualizarCards();
    } catch (error) {
        alert(error.message);
    }
}

// Salva a consulta a partir do formulário de Triagem estático (HTML anterior)
async function guardarConsultaTriagem() {
    const medico = document.getElementById("medico")?.value;
    const specialty = document.getElementById("especialidade")?.value;
    const data = document.getElementById("dataConsulta")?.value;
    const hora = document.getElementById("horaConsulta")?.value;
    const observacoes = document.getElementById("observacoes")?.value || "";

    if (!medico || !specialty || !data || !hora) {
        alert("Preencha todos os campos obrigatórios.");
        return;
    }

    const novaConsulta = { 
        id: consultas.length + 1, 
        paciente: perfilUsuario.nome, 
        medico, 
        especialidade: specialty, 
        data, 
        hora, 
        observacoes,
        estado: "pendente" 
    };
    
    try {
        // Envio opcional para API backend
        const resposta = await fetch(`${API_URL}/consultas`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(novaConsulta)
        });
        if (resposta.ok) {
            const dadosApi = await resposta.json();
            consultas.push(dadosApi.consulta || novaConsulta);
        } else {
            consultas.push(novaConsulta);
        }
    } catch {
        consultas.push(novaConsulta);
    }

    localStorage.setItem("consultas", JSON.stringify(consultas));
    alert(`Consulta agendada com sucesso!\n\nMédico: ${medico}\nData: ${formatarData(data)}\nHora: ${hora}`);
    window.location.href = "consultas.html";
}

function selecionarParaReagendar(id) {
    const consulta = consultas.find(c => c.id === id);
    if (!consulta) return;

    consultaEmEdicao = consulta.id;
    if(document.getElementById("selecionadoPaciente")) document.getElementById("selecionadoPaciente").innerText = consulta.paciente || "Benedita";
    if(document.getElementById("selecionadoMedico")) document.getElementById("selecionadoMedico").innerText = consulta.medico;
    if(document.getElementById("selecionadoEspecialidade")) document.getElementById("selecionadoEspecialidade").innerText = formatarNomeEspecialidade(consulta.especialidade);
    
    const editData = document.getElementById("editData");
    if(editData) {
        editData.value = consulta.data;
        carregarHorarios();
        const editHora = document.getElementById("editHora");
        if(editHora) editHora.value = consulta.hora;
    }
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
        
        localStorage.setItem("consultas", JSON.stringify(consultas));
        alert(`Consulta Reagendada com Sucesso!\n\nData: ${formatarData(novaData)}\nHora: ${novaHora}`);
        
        consultaEmEdicao = null;
        window.location.href = "consultas.html"; 
    } catch (error) {
        alert(error.message);
    }
}

function reagendar(id) {
    consultaEmEdicao = id;
    const consulta = consultas.find(c => c.id === id);
    if (!consulta) return;

    const modal = document.getElementById("modal");
    if (modal) {
        abrirModal();
        document.getElementById("modalTitle").innerText = "Reagendar Consulta";
        if(document.getElementById("paciente")) document.getElementById("paciente").value = consulta.paciente || perfilUsuario.nome;
        if(document.getElementById("especialidade")) document.getElementById("especialidade").value = consulta.especialidade;
        carregarListaMedicos();
        if(document.getElementById("medico")) document.getElementById("medico").value = consulta.medico;
        if(document.getElementById("data")) document.getElementById("data").value = consulta.data;
        carregarHorarios();
        if(document.getElementById("hora")) document.getElementById("hora").value = consulta.hora;
    } else {
        const d = prompt("Introduza a nova Data (AAAA-MM-DD):", consulta.data);
        const h = prompt("Introduza a nova Hora (HH:MM):", consulta.hora);
        if(!d || !h) return;
        
        consultas = consultas.map(c => c.id === id ? {...c, data: d, hora: h, estado: "pendente"} : c);
        localStorage.setItem("consultas", JSON.stringify(consultas));
        aplicarFiltroAtual();
        atualizarCards();
        alert(`Consulta Reagendada!\nData: ${formatarData(d)}\nHora: ${h}`);
    }
}

function abrirModal() { const m = document.getElementById("modal"); if(m) m.style.display = "flex"; }
function fecharModal() { const m = document.getElementById("modal"); if(m) m.style.display = "none"; }

/* ==========================================================================
   PERFIL E INFRAESTRUTURA DE COMPLEMENTO
   ========================================================================== */
async function carregarDadosPerfil() {
    const util = JSON.parse(localStorage.getItem("utilizador") || "null");
    if (!util || !util.email) return;

    const perfilPadrao = {
        nome: util.nome || perfilUsuario.nome,
        email: util.email || perfilUsuario.email,
        telefone: perfilUsuario.telefone,
        bii: "",
        dataNascimento: "",
        sexo: "",
        morada: "",
        nomeUtilizador: util.email.split("@")[0] || "utilizador",
        dataRegistro: "Não disponível",
        ultimoAcesso: "Não disponível",
        tipo: util.tipo || "Paciente"
    };

    let perfil = perfilPadrao;
    try {
        const res = await fetch(`${API_URL}/utilizador?email=${encodeURIComponent(util.email)}`);
        if (res.ok) {
            const data = await res.json();
            perfil = { ...perfilPadrao, ...data };
        }
    } catch (error) {
        console.warn("Não foi possível carregar o perfil do servidor:", error);
    }

    if (document.getElementById("nomePerfil")) document.getElementById("nomePerfil").value = perfil.nome;
    if (document.getElementById("biiPerfil")) document.getElementById("biiPerfil").value = perfil.bii || "";
    if (document.getElementById("dataNascimentoPerfil")) document.getElementById("dataNascimentoPerfil").value = perfil.dataNascimento || "";
    if (document.getElementById("sexoPerfil")) document.getElementById("sexoPerfil").value = perfil.sexo || "";
    if (document.getElementById("telefonePerfil")) document.getElementById("telefonePerfil").value = perfil.telefone;
    if (document.getElementById("emailPerfil")) document.getElementById("emailPerfil").value = perfil.email;
    if (document.getElementById("moradaPerfil")) document.getElementById("moradaPerfil").value = perfil.morada || "";
    if (document.getElementById("usernamePerfil")) document.getElementById("usernamePerfil").innerText = perfil.nomeUtilizador;
    if (document.getElementById("dataRegistoPerfil")) document.getElementById("dataRegistoPerfil").innerText = perfil.dataRegistro;
    if (document.getElementById("ultimoAcessoPerfil")) document.getElementById("ultimoAcessoPerfil").innerText = perfil.ultimoAcesso;
    if (document.getElementById("tipoPerfil")) document.getElementById("tipoPerfil").innerText = perfil.tipo;
    
    perfilUsuario.nome = perfil.nome;
    perfilUsuario.email = perfil.email;
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
    
    const util = JSON.parse(localStorage.getItem("utilizador") || "null");
    if (util) {
        if (usuarioNome) usuarioNome.innerText = obterPrimeiroUltimoNome(util.nome);
        if (usuarioEmail) usuarioEmail.innerText = util.email;
    } else {
        if (usuarioNome) usuarioNome.innerText = obterPrimeiroUltimoNome(perfilUsuario.nome);
        if (usuarioEmail) usuarioEmail.innerText = perfilUsuario.email;
    }
}