// API_URL já vem definido em storage.js (carregado antes deste ficheiro)

// ==========================================
// FUNÇÕES DE SUPORTE E LEITURA DA API
// ==========================================

async function obterConsultas() {
    try {
        const resposta = await fetch(`${API_URL}/consultas`);
        if (!resposta.ok) throw new Error("Erro na resposta do servidor");
        return await resposta.json();
    } catch (erro) {
        console.error("Falha ao buscar consultas do servidor:", erro);
        return [];
    }
}

// ==========================================
// TABELA 1: GESTÃO DE CONSULTAS (ADMIN)
// ==========================================

async function carregarTabelaConsultas() {
    try {
        const consultas = await obterConsultas();
        const corpoTabela = document.getElementById('corpo-tabela-consultas');
        
        if (!corpoTabela) return; // Salvaguarda caso este elemento não exista nesta página
        corpoTabela.innerHTML = ''; 

        consultas.forEach(consulta => {
            // Tratamento preventivo seguro (se for nulo/indefinido, assume 'baixa')
            const prio = consulta.prioridade ? consulta.prioridade.toLowerCase().trim() : 'baixa';
            
            const linha = document.createElement('tr');
            linha.innerHTML = `
                <td>${consulta.id}</td>
                <td>${consulta.paciente || "Não informado"}</td>
                <td>${consulta.medico || "Não atribuído"}</td>
                <td>${consulta.especialidade || "Geral"}</td>
                <td>${consulta.data || ""} às ${consulta.hora || "--:--"}</td>
                <td><span class="badge-${prio}">${prio.toUpperCase()}</span></td>
                <td>${consulta.estado}</td>
                <td>
                    <button onclick="mudarPrioridade(${consulta.id}, 'urgente')">Urgente</button>
                    <button onclick="mudarPrioridade(${consulta.id}, 'alta')">Alta</button>
                    <button onclick="mudarPrioridade(${consulta.id}, 'media')">Média</button>
                    <button onclick="mudarPrioridade(${consulta.id}, 'baixa')">Baixa</button>
                </td>
            `;
            corpoTabela.appendChild(linha);
        });
    } catch (erro) {
        console.error("Erro ao renderizar tabela de gestão:", erro);
    }
}

// Função para atualizar dinamicamente a prioridade
async function mudarPrioridade(id, novaPrioridade) {
    try {
        const resposta = await fetch(`${API_URL}/consultas/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prioridade: novaPrioridade })
        });
        const dados = await resposta.json();
        if (dados.sucesso) {
            // Atualiza ambas as tabelas para manter o painel sincronizado
            await carregarTabelaConsultas();
            await initPrioridades();
        }
    } catch (erro) {
        alert("Erro ao mudar a prioridade.");
    }
}

// ==========================================
// TABELA 2: FILA DE TRIAGEM / PRIORIDADES
// ==========================================

async function initPrioridades() {
    const tbody = document.querySelector("#tabelaPrioridades tbody");
    if (!tbody) return;

    // 1. Feedback visual de carregamento inicial
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:#666;"><i class="fa fa-spinner fa-spin"></i> A carregar fila de triagem...</td></tr>`;

    // 2. Procura os dados no servidor Flask
    const consultas = await obterConsultas();
    
    // 3. Filtrar apenas consultas ativas (ignora as já realizadas ou canceladas)
    const ativas = consultas.filter(c => c.estado !== "cancelada" && c.estado !== "realizada");

    // 4. Agrupar de forma segura tratando dados nulos/indefinidos
    const porPrioridade = {
        urgente: ativas.filter(c => (c.prioridade || "baixa").toLowerCase().trim() === "urgente"),
        alta: ativas.filter(c => (c.prioridade || "baixa").toLowerCase().trim() === "alta"),
        media: ativas.filter(c => (c.prioridade || "baixa").toLowerCase().trim() === "media"),
        baixa: ativas.filter(c => (c.prioridade || "baixa").toLowerCase().trim() === "baixa")
    };

    // 5. Atualizar os contadores visuais do topo de forma segura
    if (document.getElementById("contadorUrgente")) document.getElementById("contadorUrgente").innerText = porPrioridade.urgente.length;
    if (document.getElementById("contadorAlta")) document.getElementById("contadorAlta").innerText = porPrioridade.alta.length;
    if (document.getElementById("contadorMedia")) document.getElementById("contadorMedia").innerText = porPrioridade.media.length;
    if (document.getElementById("contadorBaixa")) document.getElementById("contadorBaixa").innerText = porPrioridade.baixa.length;

    // 6. Juntar a fila por ordem estrita de gravidade
    const filaOrdenada = [...porPrioridade.urgente, ...porPrioridade.alta, ...porPrioridade.media, ...porPrioridade.baixa];

    // 7. Se a fila estiver vazia
    if (filaOrdenada.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:#888;"><i class="fa fa-info-circle"></i> Nenhuma consulta na fila de atendimento ativa.</td></tr>`;
        return;
    }

    // 8. Construção segura na memória
    let linhasHtml = "";

    filaOrdenada.forEach(c => {
        const prioLimpa = (c.prioridade || "baixa").toLowerCase().trim();
        const dataConsulta = c.data ? `${c.data} às ` : "";
        
        linhasHtml += `
            <tr>
                <td><strong>${c.paciente || "Não informado"}</strong></td>
                <td><i class="fa fa-user-md" style="color:#64748b; margin-right:4px;"></i> ${c.medico || "Não atribuído"}</td>
                <td>${c.especialidade || "Geral"}</td>
                <td>${dataConsulta}${c.hora || "--:--"}</td>
                <td>
                    <span class="badge-prioridade prioridade-${prioLimpa}">
                        ${prioLimpa.toUpperCase()}
                    </span>
                </td>
            </tr>
        `;
    });

    // 9. Injeta de uma só vez na tabela
    tbody.innerHTML = linhasHtml;
}

// ==========================================
// INICIALIZAÇÃO AUTOMÁTICA
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    carregarTabelaConsultas();
    initPrioridades();
});