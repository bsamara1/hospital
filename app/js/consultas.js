const API_URL = "http://127.0.0.1:5000";
let consultas = [];
let medicos = [];
let consultaEmEdicao = null;
let abaAtiva = "agendadas";
let filtroAtivo = null;

// Dados simulados de Perfil
let perfilUsuario = { 
    nome: "Benedita", 
    email: "benedita@email.com", 
    telefone: "999999999", 
    foto: "../assets/img/profile.png" 
};

// Dados mockados iniciais de notificações
const notificacoesIniciais = [
    { id: 1, texto: "A sua consulta de Clínica Geral foi agendada com sucesso para o dia 12/08/2026 às 09:00.", lida: false },
    { id: 2, texto: "Aviso: O Dr. Carlos Santos alterou o horário do seu atendimento de Ortopedia.", lida: false },
    { id: 3, texto: "A sua triagem clínica definiu prioridade Média para o sintoma de febre alta.", lida: true }
];

/* ==========================================================================
   INICIALIZAÇÃO (INIT) & LISTENERS DINÂMICOS
   ========================================================================== */

document.addEventListener("DOMContentLoaded", async () => {
    await carregarMedicos();
    await carregarConsultas();
    renderMedicos();
    // Inicializa as notificações se não existirem
    if (!localStorage.getItem('notificacoes')) {
        localStorage.setItem('notificacoes', JSON.stringify(notificacoesIniciais));
    }

    // Carrega a base de dados em memória
    await carregarMedicos();
    await carregarConsultas();
    renderizarNotificacoes();

    // Configura Listeners para a página autónoma de Marcação/Triagem se existir
    const selectEsp = document.getElementById("especialidade");
    if (selectEsp) {
        selectEsp.addEventListener("change", carregarListaMedicos);
    }
    
    const selectMed = document.getElementById("medico");
    if (selectMed) {
        selectMed.addEventListener("change", carregarHorarios);
    }

    const inputDataTriagem = document.getElementById("dataConsulta");
    if (inputDataTriagem) {
        inputDataTriagem.addEventListener("change", carregarHorarios);
        inputDataTriagem.min = new Date().toISOString().split('T')[0]; // Bloqueia dias passados
    }

    // Configura Listeners para filtros de pesquisa na listagem
    document.getElementById("pesquisaGeral")?.addEventListener("input", renderTabelaConsultas);
    document.getElementById("filtroEstado")?.addEventListener("change", renderTabelaConsultas);

    // Captura o formulário de Triagem
    const formMarcacao = document.getElementById("formMarcacao");
    if (formMarcacao) {
        formMarcacao.addEventListener("submit", (e) => {
            e.preventDefault();
            guardarConsultaTriagem();
        });
    }
});

async function carregarMedicos() {
    try {
        const res = await fetch(`${API_URL}/medicos`);
        if (!res.ok) throw new Error("API offline");
        medicos = await res.json();
    } catch (error) {
        console.warn("Usando base de dados local de médicos fornecida...");
        medicos = [
          {
            "id": 1,
            "nome": "Dr. Mendes",
            "especialidade": "cardiologia",
            "horarios": "09:00,10:00,11:00,14:00",
            "status": "ativo"
          },
          {
            "id": 2,
            "nome": "Dr. Sousa",
            "especialidade": "ortopedia",
            "horarios": "08:30,09:30,13:00,15:00",
            "status": "ativo"
          }
        ];
    }
    carregarEspecialidades();
}

async function carregarConsultas() {
    try {
        const res = await fetch(`${API_URL}/consultas`);
        if (!res.ok) throw new Error("API offline");
        consultas = await res.json();
    } catch (error) {
        const localData = localStorage.getItem("consultas");
        if (localData) {
            consultas = JSON.parse(localData);
        } else {
            consultas = [
                { id: 1783030312048, paciente: "Aline", medico: "Dr. Mendes", especialidade: "cardiologia", data: "2026-07-11", hora: "09:00", estado: "cancelada", prioridade: "alta", sintomas: ["febre-alta", "dor-cabeca"] },
                { id: 1783031677253, paciente: "lolo", medico: "Dr. Mendes", especialidade: "cardiologia", data: "2026-07-10", hora: "10:00", estado: "cancelada", prioridade: "baixa", sintomas: ["rotina"] },
                { id: 1783031708735, paciente: "lal", medico: "Dr. Sousa", especialidade: "ortopedia", data: "2026-07-24", hora: "13:00", estado: "cancelada", prioridade: "media", sintomas: ["tosse"] },
                { id: 1783031923496, paciente: "carlos", medico: "Dr. Mendes", especialidade: "cardiologia", data: "2026-07-25", hora: "10:00", estado: "pendente", prioridade: "urgente", sintomas: ["dor-peito", "falta-ar"] },
                { id: 1783034070238, paciente: "lili", medico: "Dr. Sousa", especialidade: "ortopedia", data: "2026-07-18", hora: "15:00", estado: "cancelada", prioridade: "media", sintomas: ["tosse"] }
            ];
            localStorage.setItem("consultas", JSON.stringify(consultas));
        }
    }
    renderTabelaConsultas();
    atualizarCards();
    mostrarUsuarioTopo();
}

/* ==========================================================================
   LÓGICA DE FILTROS & INPUTS DINÂMICOS
   ========================================================================== */

function carregarEspecialidades() {
    const select = document.getElementById("especialidade");
    if (!select) return;

    const valorPrevio = select.value;
    select.innerHTML = '<option value="">Selecione a especialidade...</option>';

    const especialidades = [...new Set(medicos.filter(m => m.status === "ativo").map(m => m.especialidade))].sort();
    
    especialidades.forEach(esp => {
        select.innerHTML += `<option value="${esp}">${formatarNomeEspecialidade(esp)}</option>`;
    });

    if (valorPrevio) select.value = valorPrevio;
}

function carregarListaMedicos() {
    const especialidade = document.getElementById("especialidade")?.value;
    const selectMedico = document.getElementById("medico");
    if (!selectMedico) return;

    selectMedico.innerHTML = '<option value="">Selecione o médico...</option>';
    
    if (!especialidade) {
        selectMedico.disabled = true;
        return;
    }

    const medicosFiltrados = medicos.filter(m => m.status === "ativo" && m.especialidade === especialidade);
    medicosFiltrados.forEach(m => {
        selectMedico.innerHTML += `<option value="${m.nome}">${m.nome}</option>`;
    });

    selectMedico.disabled = medicosFiltrados.length === 0;
    carregarHorarios();
}

function carregarHorarios() {
    const medicoNome = document.getElementById("medico")?.value;
    const inputData = document.getElementById("dataConsulta") || document.getElementById("data");
    const selectHora = document.getElementById("horaConsulta") || document.getElementById("hora");

    if (!selectHora) return;
    selectHora.innerHTML = '<option value="">Selecione o horário...</option>';

    if (!medicoNome || !inputData || !inputData.value) {
        selectHora.disabled = true;
        return;
    }

    const medico = medicos.find(m => m.nome === medicoNome && m.status === "ativo");
    if (!medico) return;

    selectHora.disabled = false;
    const horariosDisponiveis = typeof medico.horarios === "string" ? medico.horarios.split(",") : medico.horarios;
    
    horariosDisponiveis.forEach(h => {
        selectHora.innerHTML += `<option value="${h}">${h}</option>`;
    });
}

/* ==========================================================================
   CRUD & SUBMISSÕES (ENVIO COM GERADOR DE NOTIFICAÇÕES)
   ========================================================================== */

async function guardarConsultaTriagem() {
    const especialidade = document.getElementById("especialidade").value;
    const medico = document.getElementById("medico").value;
    const data = document.getElementById("dataConsulta").value;
    const hora = document.getElementById("horaConsulta").value;
    const observacoes = document.getElementById("observacoes")?.value || "";

    const sintomasSelecionados = [];
    document.querySelectorAll('input[name="sintoma"]:checked').forEach(cb => {
        sintomasSelecionados.push(cb.value);
    });

    if (!especialidade || !medico || !data || !hora) {
        alert("Por favor, preencha todos os campos obrigatórios.");
        return;
    }

    const novaConsulta = {
        id: Date.now(),
        paciente: perfilUsuario.nome,
        medico,
        especialidade,
        data,
        hora,
        observacoes,
        sintomas: sintomasSelecionados,
        estado: "pendente"
    };

    consultas.push(novaConsulta);
    localStorage.setItem("consultas", JSON.stringify(consultas));

    // GERA E INSERE NOTIFICAÇÃO DO FORMULÁRIO DE TRIAGEM
    let listaNotif = JSON.parse(localStorage.getItem('notificacoes')) || [];
    listaNotif.unshift({
        id: Date.now(),
        texto: `A sua triagem para ${formatarNomeEspecialidade(especialidade)} com o ${medico} foi submetida para o dia ${formatarData(data)} às ${hora}! Estado atual: PENDENTE.`,
        lida: false
    });
    localStorage.setItem('notificacoes', JSON.stringify(listaNotif));

    alert(`Consulta enviada para triagem com sucesso!\nEstado: PENDENTE\nMédico: ${medico}\nHorário: ${formatarData(data)} às ${hora}`);
    window.location.href = "consultas.html";
}

function guardarConsulta() {
    const especialidade = document.getElementById("especialidade").value;
    const medico = document.getElementById("medico").value;
    const data = document.getElementById("data").value;
    const hora = document.getElementById("hora").value;

    if (!especialidade || !medico || !data || !hora) {
        alert("Preencha todos os campos.");
        return;
    }

    const novaConsulta = {
        id: Date.now(),
        paciente: perfilUsuario.nome,
        medico,
        especialidade,
        data,
        hora,
        estado: "pendente"
    };

    consultas.push(novaConsulta);
    localStorage.setItem("consultas", JSON.stringify(consultas));
    
    // GERA E INSERE NOTIFICAÇÃO DO MODAL CLÁSSICO
    let listaNotif = JSON.parse(localStorage.getItem('notificacoes')) || [];
    listaNotif.unshift({
        id: Date.now(),
        texto: `Nova consulta de ${formatarNomeEspecialidade(especialidade)} agendada com ${medico} para o dia ${formatarData(data)} às ${hora}.`,
        lida: false
    });
    localStorage.setItem('notificacoes', JSON.stringify(listaNotif));

    alert("Consulta marcada com sucesso!");
    fecharModal();
    carregarConsultas();
}

/* ==========================================================================
   RENDERERS DE TABELAS & SISTEMA DE NOTIFICAÇÕES
   ========================================================================== */

/* ==========================================================================
   CORRIGIDO: EXIBIÇÃO DE CONSULTAS CONFIRMADAS E CANCELADAS NA TABELA
   ========================================================================== */

function renderTabelaConsultas() {
    const tbody = document.getElementById("tabela-consultas");
    if (!tbody) return;

    const filtroPesquisa = document.getElementById("pesquisaGeral")?.value.toLowerCase() || "";
    const filtroEstado = document.getElementById("filtroEstado")?.value || "todas";

    tbody.innerHTML = "";

    const consultasFiltradas = consultas.filter(c => {
        // Junta os campos para a pesquisa textual por input
        const texto = `${c.medico} ${c.especialidade} ${c.data} ${c.estado}`.toLowerCase();
        const bateTexto = texto.includes(filtroPesquisa);
        
        // CORREÇÃO DO FILTRO DE ESTADO: Garante consistência com o select dropdown
        const bateEstado = (filtroEstado === "todas") || 
                           (filtroEstado === "agendadas" && c.estado !== "realizada" && c.estado !== "cancelada") || 
                           (c.estado === filtroEstado);
        
        // CORREÇÃO DA ABA ATIVA: 
        // - Aba 'historico': exibe apenas o que já foi Concluído/Realizado.
        // - Aba 'agendadas': exibe tudo o que está ativo no presente/futuro (Pendentes, Confirmadas e Canceladas recentemente).
        const bateAba = abaAtiva === "historico" 
            ? (c.estado === "realizada") 
            : (c.estado === "pendente" || c.estado === "confirmada" || c.estado === "cancelada");
        
        return bateTexto && bateEstado && bateAba;
    });

    if (consultasFiltradas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:18px; color:#555;">Nenhuma consulta registada nesta aba para o filtro selecionado.</td></tr>`;
        return;
    }

    // Renderiza as linhas na tabela aplicando as cores corretas do seu CSS
    consultasFiltradas.forEach(c => {
        // Mapeia o estado para a classe CSS exata definida no seu <style>
        const statusClass = c.estado === 'confirmada' ? 'confirmada' : 
                            c.estado === 'pendente' ? 'pendente' : 
                            c.estado === 'cancelada' ? 'cancelada' : 'view'; // 'view' ou cinza padrão para realizada
                            
        tbody.innerHTML += `
        <tr>
            <td>${formatarData(c.data)}</td>
            <td>${c.hora}</td>
            <td>${c.medico}</td>
            <td>${formatarNomeEspecialidade(c.especialidade)}</td>
            <td><span class="${statusClass}">${c.estado.toUpperCase()}</span></td>
        </tr>`;
    });
}

function renderizarNotificacoes() {
    const listaContainer = document.getElementById('listaNotificacoes');
    const contadorDash = document.getElementById('notificacoesCount'); 
    
    if (!listaContainer) return;

    const lista = JSON.parse(localStorage.getItem('notificacoes')) || [];
    listaContainer.innerHTML = ''; 

    if (lista.length === 0) {
        listaContainer.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">Você não tem nenhuma notificação.</p>';
        if (contadorDash) contadorDash.innerText = '0';
        return;
    }

    let naoLidas = 0;

    lista.forEach(notif => {
        if (!notif.lida) naoLidas++;

        const divNotif = document.createElement('div');
        divNotif.className = `notificacao ${notif.lida ? 'lida' : 'nova'}`;
        divNotif.innerHTML = `
            <div class="notificacao-texto">${notif.texto}</div>
            ${!notif.lida ? `<button onclick="marcarComoLida(${notif.id})">Marcar como lida</button>` : ''}
        `;
        listaContainer.appendChild(divNotif);
    });

    if (contadorDash) contadorDash.innerText = naoLidas;
}

window.marcarComoLida = function(id) {
    let lista = JSON.parse(localStorage.getItem('notificacoes')) || [];
    lista = lista.map(n => { if (n.id === id) n.lida = true; return n; });
    localStorage.setItem('notificacoes', JSON.stringify(lista));
    renderizarNotificacoes();
};

window.marcarTodasNotificacoesLidas = function() {
    let lista = JSON.parse(localStorage.getItem('notificacoes')) || [];
    lista = lista.map(n => { n.lida = true; return n; });
    localStorage.setItem('notificacoes', JSON.stringify(lista));
    renderizarNotificacoes();
};

function ativarAba(aba) {
    abaAtiva = aba;
    document.getElementById("abaAgendadas")?.classList.toggle("active-tab", aba === "agendadas");
    document.getElementById("abaHistorico")?.classList.toggle("active-tab", aba === "historico");
    renderTabelaConsultas();
}

function atualizarCards() {
    const totalPendentes = consultas.filter(c => c.estado === "pendente").length;
    const totalConfirmadas = consultas.filter(c => c.estado === "confirmada").length;
    const totalCanceladas = consultas.filter(c => c.estado === "cancelada").length;

    if(document.getElementById("pendentes")) document.getElementById("pendentes").innerText = totalPendentes;
    if(document.getElementById("confirmadas")) document.getElementById("confirmadas").innerText = totalConfirmadas;
    if(document.getElementById("canceladas")) document.getElementById("canceladas").innerText = totalCanceladas;
}

function formatarData(dataStr) {
    if (!dataStr) return "";
    const partes = dataStr.split("-");
    return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : dataStr;
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

function mostrarUsuarioTopo() {
    const util = JSON.parse(localStorage.getItem("utilizador") || "null");
    const nome = util?.nome || perfilUsuario.nome;
    const partes = nome.trim().split(/\s+/);
    const formatado = partes.length > 1 ? `${partes[0]} ${partes[partes.length - 1]}` : partes[0];
    const el = document.getElementById("usuarioNome");
    if (el) el.innerText = formatado;
}
/* ==========================================================================
   ADICIONADO: RENDERIZAÇÃO E PESQUISA DE MÉDICOS (Para medicos.html)
   ========================================================================== */

function renderMedicos() {
    const container = document.getElementById("listaMedicos");
    if (!container) return; // Só executa se estiver na página medicos.html

    const termoPesquisa = document.getElementById("pesquisaMedico")?.value.toLowerCase() || "";

    // Filtra os médicos ativos com base no nome ou na especialidade
    const medicosFiltrados = medicos.filter(m => {
        const nomeMatch = m.nome.toLowerCase().includes(termoPesquisa);
        const espMatch = formatarNomeEspecialidade(m.especialidade).toLowerCase().includes(termoPesquisa);
        const horasMatch = m.horarios.toLowerCase().includes(termoPesquisa);
        return m.status === "ativo" && (nomeMatch || espMatch || horasMatch);
    });

    if (medicosFiltrados.length === 0) {
        container.innerHTML = `<p style="text-align:center; color:#666; padding:20px;">Nenhum médico encontrado com esse critério.</p>`;
        return;
    }

    // Cria a estrutura em Grid usando as classes de CSS que já tem no HTML
    let htmlGrid = `<div class="medicos-grid">`;

    medicosFiltrados.forEach(m => {
        // Divide a string de horários para criar pequenas tags visuais
        const listaHoras = typeof m.horarios === "string" ? m.horarios.split(",") : m.horarios;
        let tagsHoras = "";
        listaHoras.forEach(h => {
            tagsHoras += `<span class="medico-tag">${h}</span>`;
        });

        htmlGrid += `
            <div class="medico-card">
                <img src="../assets/img/profile.png" class="medico-photo" alt="${m.nome}" onerror="this.src='https://cdn-icons-png.flaticon.com/512/607/607653.png'">
                <div class="medico-info">
                    <div class="medico-nome">${m.nome}</div>
                    <div class="medico-especialidade"><strong>Especialidade:</strong> ${formatarNomeEspecialidade(m.especialidade)}</div>
                    <div class="medico-meta">Horários de Atendimento:</div>
                    <div class="medico-tags">
                        ${tagsHoras}
                    </div>
                </div>
                <div class="medico-actions" style="margin-top:auto;">
                    <button onclick="abrirModalMedico('${m.nome}')"><i class="fa fa-calendar-alt"></i> Ver Agenda</button>
                </div>
            </div>
        `;
    });

    htmlGrid += `</div>`;
    container.innerHTML = htmlGrid;
}

/* ==========================================================================
   ADICIONADO: CONTROLO DO MODAL DE DETALHES DO MÉDICO
   ========================================================================== */

window.abrirModalMedico = function(nomeMedico) {
    const modal = document.getElementById("modalAgenda");
    const titulo = document.getElementById("modalMedicoNome");
    const detalhes = document.getElementById("modalMedicoDetalhes");

    if (!modal || !titulo || !detalhes) return;

    const medico = medicos.find(m => m.nome === nomeMedico);
    if (!medico) return;

    titulo.innerText = `Agenda do ${medico.nome}`;
    
    detalhes.innerHTML = `
        <div class="modal-section">
            <div class="modal-row"><strong>Especialidade Clínica:</strong> <span>${formatarNomeEspecialidade(medico.especialidade)}</span></div>
            <div class="modal-row" style="margin-top: 10px;"><strong>Status do Profissional:</strong> <span style="color: green; font-weight: bold;">Disponível (Ativo)</span></div>
        </div>
        <div class="modal-section">
            <strong style="display:block; margin-bottom:8px;">Horários Disponíveis para Consulta:</strong>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
                ${medico.horarios.split(",").map(h => `<span style="background:#eef4ff; color:#1d3f7a; padding:6px 12px; border-radius:8px; font-size:14px;">${h}</span>`).join("")}
            </div>
        </div>
    `;

    modal.style.display = "flex";
}

window.fecharModalMedico = function() {
    const modal = document.getElementById("modalAgenda");
    if (modal) modal.style.display = "none";
}

// Atualizar o Listener de inicialização para também renderizar os médicos na tela
const originalInit = document.addEventListener;

function marcarConsulta() { abrirModal(); }
function abrirModal() { const m = document.getElementById("modal"); if(m) m.style.display = "flex"; }
function fecharModal() { const m = document.getElementById("modal"); if(m) m.style.display = "none"; }