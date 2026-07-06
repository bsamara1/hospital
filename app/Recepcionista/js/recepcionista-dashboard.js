let consultasCache = [];
let chartInstancia = null;

async function initRecepcionistaDashboard() {
    marcarSidebarAtiva("index");
    try {
        consultasCache = await loadConsultas();
        const medicos = await loadMedicos();
        const hoje = hojeISO();

        // 1. Cálculos de Comparativos Diários
        const ontemObj = new Date();
        ontemObj.setDate(ontemObj.getDate() - 1);
        const ontem = ontemObj.toISOString().split("T")[0];

        const totalHoje = consultasCache.filter(c => c.data === hoje).length;
        const totalOntem = consultasCache.filter(c => c.data === ontem).length;
        const medicosAtivos = medicos.filter(m => m.status !== "inativo").length;

        // 2. Injeção das Métricas Principais nos Cards
        document.getElementById("consultas-hoje").innerText = totalHoje;
        document.getElementById("total-medicos").innerText = medicosAtivos;

        const diff = totalOntem > 0 ? Math.round(((totalHoje - totalOntem) / totalOntem) * 100) : totalHoje * 100;
        const consultasVsEl = document.getElementById("consultas-vs");
        consultasVsEl.innerText = `${diff >= 0 ? '+' : ''}${diff}% vs ontem`;
        consultasVsEl.style.color = diff >= 0 ? "#15803d" : "#b91c1c";

        const urgenciasHoje = consultasCache.filter(c => c.data === hoje && 
            (String(c.prioridade).toLowerCase() === 'urgente' || String(c.prioridade).toLowerCase() === 'alta' || String(c.triagem).toLowerCase() === 'urgente')
        ).length;
        document.getElementById("urgencias-hoje").innerText = urgenciasHoje;

        const pendentesHoje = consultasCache.filter(c => c.data === hoje && c.estado === 'pendente').length;
        const tempoCalculado = pendentesHoje > 0 ? pendentesHoje * 12 : 15;
        document.getElementById("tempo-espera").innerText = `${tempoCalculado} min`;
        
        const esperaVsEl = document.getElementById("espera-vs");
        esperaVsEl.innerText = tempoCalculado > 30 ? "Fluxo Intenso" : "Fluxo Normal";
        esperaVsEl.style.color = tempoCalculado > 30 ? "#b91c1c" : "#15803d";

        // 3. Renderização Visual dos Componentes
        gerarGraficoPrioridades(consultasCache);
        renderTabelaDashboard('todos');
    } catch (err) {
        console.error("Erro ao inicializar o Painel:", err);
    }
}

function gerarGraficoPrioridades(consultas) {
    let urgente = 0, alta = 0, media = 0, baixa = 0;
    consultas.forEach(c => {
        const p = String(c.prioridade || c.triagem || 'média').toLowerCase();
        if (p === 'urgente') urgente++;
        else if (p === 'alta') alta++;
        else if (p === 'baixa') baixa++;
        else media++;
    });

    const total = urgente + alta + media + baixa;
    const pUrgente = total > 0 ? Math.round((urgente / total) * 100) : 0;
    const pAlta = total > 0 ? Math.round((alta / total) * 100) : 0;
    const pMedia = total > 0 ? Math.round((media / total) * 100) : 0;
    const pBaixa = total > 0 ? Math.round((baixa / total) * 100) : 0;

    const canvas = document.getElementById('prioridadesChart');
    if (!canvas) return;
    
    if (chartInstancia) chartInstancia.destroy();
    chartInstancia = new Chart(canvas.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: [`Urgente (${pUrgente}%)`, `Alta (${pAlta}%)`, `Média (${pMedia}%)`, `Baixa (${pBaixa}%)`],
            datasets: [{
                data: [urgente, alta, media, baixa],
                backgroundColor: ['#b91c1c', '#d97706', '#2563eb', '#16a34a'],
                borderWidth: 1
            }]
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } }, cutout: '72%' }
    });
}

function renderTabelaDashboard(tipo) {
    const tbody = document.getElementById('tabela-consultas');
    if (!tbody) return;

    const hoje = hojeISO();
    let lista = consultasCache;

    if (tipo === 'hoje') lista = consultasCache.filter(c => c.data === hoje);
    else if (tipo === 'urgente') lista = consultasCache.filter(c => 
        String(c.prioridade).toLowerCase() === 'urgente' || String(c.prioridade).toLowerCase() === 'alta'
    );

    tbody.innerHTML = "";
    if (lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px; color:#888;">Nenhuma consulta registada.</td></tr>`;
        return;
    }

    lista.forEach(c => {
        const pNome = c.paciente || "Não Informado";
        const triagem = c.prioridade || c.triagem || 'Média';
        let classeTriagem = 'status media';

        if (triagem.toLowerCase() === 'urgente') classeTriagem = 'status cancelada';
        else if (triagem.toLowerCase() === 'alta') classeTriagem = 'status pendente';
        else if (triagem.toLowerCase() === 'baixa') classeTriagem = 'status confirmada';

        tbody.innerHTML += `
            <tr>
                <td><b>${escapeHtml(pNome)}</b></td>
                <td>${escapeHtml(c.medico)}</td>
                <td><span style="color:#4a5568;">${escapeHtml(c.especialidade || 'Geral')}</span></td>
                <td>${formatDate(c.data)}</td>
                <td>${escapeHtml(c.hora)}</td>
                <td><span class="${classeTriagem}">${escapeHtml(triagem.toUpperCase())}</span></td>
                <td><span class="status ${c.estado}">${escapeHtml(c.estado)}</span></td>
                <td><button class="view-btn" onclick="verDetalhesDoPaciente('${escapeHtml(pNome)}')"><i class="fa fa-eye"></i></button></td>
            </tr>`;
    });
}

function filtrarAbas(tipo, botao) {
    document.querySelectorAll(".aba-btn").forEach(b => b.classList.remove("active-filter"));
    botao.classList.add("active-filter");
    renderTabelaDashboard(tipo);
}

function verDetalhesDoPaciente(nome) {
    localStorage.setItem("filtroConsultaPaciente", nome);
    window.location.href = "consultas.html";
}

window.addEventListener("DOMContentLoaded", initRecepcionistaDashboard);