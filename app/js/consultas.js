let consultas = [];
let medicos = [];

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
}

/* =======================
CARREGAR CONSULTAS
======================= */
async function carregarConsultas() {
    try {
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
    });
}

/* =======================
HORÁRIOS
======================= */
function obterHorarios(nome) {
    const medico = medicos.find(m => m.nome === nome);
    if (!medico) return [];
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