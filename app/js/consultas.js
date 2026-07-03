const API_URL = "http://127.0.0.1:5000";
let consultas = [];
let medicos = [];
let consultaEmEdicao = null;
let abaAtiva = "agendadas";
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
   INICIALIZAÇÃO (INIT) & LISTENERS DINÂMICOS
   ========================================================================== */

document.addEventListener("DOMContentLoaded", async () => {
    // Carrega a base de dados em memória
    await carregarMedicos();
    await carregarConsultas();

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
        console.warn("Usando fallback de médicos local...");
        medicos = [
            { "id": 1, "nome": "Dr. Mendes", "especialidade": "cardiologia", "horarios": "09:00,10:00,11:00,14:00", "status": "ativo" },
            { "id": 2, "nome": "Dr. Sousa", "especialidade": "ortopedia", "horarios": "08:00,09:00,10:00,11:00,14:00", "status": "ativo" },
            { "id": 3, "nome": "Dr. João Silva", "especialidade": "clinica-geral", "horarios": "08:00,09:00,10:00,14:00", "status": "ativo" },
            { "id": 4, "nome": "Dra. Clara Gomes", "especialidade": "pediatria", "horarios": "09:00,10:00,11:00", "status": "ativo" },
            { "id": 5, "nome": "Dr. Ricardo Jorge", "especialidade": "dermatologia", "horarios": "08:00,11:00,14:00", "status": "ativo" }
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
                { id: 1, paciente: "Benedita", medico: "Dr. Mendes", especialidade: "cardiologia", data: "2026-07-17", hora: "10:00", estado: "confirmada" },
                { id: 2, paciente: "Benedita", medico: "Dr. Sousa", especialidade: "ortopedia", data: "2026-07-20", hora: "08:30", estado: "pendente" },
                { id: 3, paciente: "Benedita", medico: "Dr. Mendes", especialidade: "cardiologia", data: "2026-03-15", hora: "14:00", estado: "realizada" }
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

    // Extrai especialidades ativas únicas
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
    // Deteta se o input de data é o da triagem autónoma ou do modal clássico
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
   CRUD & SUBMISSÕES
   ========================================================================== */

async function guardarConsultaTriagem() {
    const especialidade = document.getElementById("especialidade").value;
    const medico = document.getElementById("medico").value;
    const data = document.getElementById("dataConsulta").value;
    const hora = document.getElementById("horaConsulta").value;
    const observacoes = document.getElementById("observacoes")?.value || "";

    // Captura os sintomas selecionados para a triagem
    const sintomasSelecionados = [];
    document.querySelectorAll('input[name="sintoma"]:checked').forEach(cb => {
        sintomasSelecionados.push(cb.value);
    });

    if (!especialidade || !medico || !data || !hora) {
        alert("Por favor, preencha todos os campos obrigatórios.");
        return;
    }

    const novaConsulta = {
        id: consultas.length + 1,
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

    alert(`Consulta enviada para triagem com sucesso!\nEstado: PENDENTE\nMédico: ${medico}\nHorário: ${formatarData(data)} às ${hora}`);
    window.location.href = "consultas.html";
}

// Guarda a consulta a partir do Modal Clássico de consultas.html
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
        id: consultas.length + 1,
        paciente: perfilUsuario.nome,
        medico,
        especialidade,
        data,
        hora,
        estado: "pendente"
    };

    consultas.push(novaConsulta);
    localStorage.setItem("consultas", JSON.stringify(consultas));
    
    alert("Consulta marcada com sucesso!");
    fecharModal();
    carregarConsultas();
}

/* ==========================================================================
   RENDERERS DE TABELAS & AUXILIARES
   ========================================================================== */

function renderTabelaConsultas() {
    const tbody = document.getElementById("tabela-consultas");
    if (!tbody) return;

    const filtroPesquisa = document.getElementById("pesquisaGeral")?.value.toLowerCase() || "";
    const filtroEstado = document.getElementById("filtroEstado")?.value || "todas";

    tbody.innerHTML = "";

    const consultasFiltradas = consultas.filter(c => {
        const texto = `${c.medico} ${c.especialidade} ${c.data} ${c.estado}`.toLowerCase();
        const bateTexto = texto.includes(filtroPesquisa);
        
        const bateEstado = (filtroEstado === "todas") || 
                           (filtroEstado === "agendadas" && c.estado !== "realizada" && c.estado !== "cancelada") || 
                           (c.estado === filtroEstado);
        
        const bateAba = abaAtiva === "historico" ? (c.estado === "realizada" || c.estado === "cancelada") : (c.estado !== "cancelada" && c.estado !== "realizada");
        
        return bateTexto && bateEstado && bateAba;
    });

    if (consultasFiltradas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:18px; color:#555;">Nenhuma consulta registada nesta aba.</td></tr>`;
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
            <td><span class="${statusClass}">${c.estado.toUpperCase()}</span></td>
        </tr>`;
    });
}

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

function marcarConsulta() { abrirModal(); }
function abrirModal() { const m = document.getElementById("modal"); if(m) m.style.display = "flex"; }
function fecharModal() { const m = document.getElementById("modal"); if(m) m.style.display = "none"; }