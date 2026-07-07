// =========================================================================
// CONTROLO DE PRESENÇAS E SALA DE ESPERA (LÓGICA BLINDADA)
// =========================================================================

let consultasPresenca = [];

async function initPresencas() {
    if (typeof marcarSidebarAtiva === "function") {
        marcarSidebarAtiva("presencas");
    }
    
    try {
        // Tenta carregar os dados através do storage global da aplicação
        if (typeof loadConsultas === "function") {
            consultasPresenca = await loadConsultas();
        } else if (typeof window.loadConsultas === "function") {
            consultasPresenca = await window.loadConsultas();
        } else {
            console.warn("Função loadConsultas não detetada. A extrair do localStorage local.");
            consultasPresenca = JSON.parse(localStorage.getItem("consultas") || "[]");
        }
    } catch (error) {
        console.error("Erro ao ler repositório de consultas:", error);
    }

    const pesquisaInput = document.getElementById("pesquisaPresenca");
    if (pesquisaInput) {
        pesquisaInput.addEventListener("input", renderPresencas);
    }

    renderPresencas();
}

function renderPresencas() {
    const tbody = document.getElementById("tabelaPresencas");
    if (!tbody) return;

    const termo = document.getElementById("pesquisaPresenca")?.value.trim().toLowerCase() || "";
    
    // 1. Obtém a data de hoje de forma estrita para validação do card
    let hoje = "";
    if (typeof hojeISO === "function") {
        hoje = hojeISO();
    } else {
        const d = new Date();
        const ano = d.getFullYear();
        const mes = String(d.getMonth() + 1).padStart(2, '0');
        const dia = String(d.getDate()).padStart(2, '0');
        hoje = `${ano}-${mes}-${dia}`;
    }

    // 2. Lista base com todas as consultas ativas do sistema (evita zerar a tabela em testes)
    let listaGeral = consultasPresenca.filter(c => 
        c.estado === "confirmada" || c.estado === "pendente" || c.estado === "presente" || c.estado === "realizada"
    );

    // 3. ATUALIZAÇÃO DOS CARDS (Lógica Corrigida de forma independente)
    // Card "Total Hoje": Olha estritamente para a data de hoje (vai a 0 se não houver consultas hoje)
    if(document.getElementById("totalHoje")) {
        const totalHoje = listaGeral.filter(c => c.data === hoje).length;
        document.getElementById("totalHoje").innerText = totalHoje; 
    }
    // Card "Aguardam": Conta pacientes que não iniciaram atendimento (não zera baseado na data)
    if(document.getElementById("aguardam")) {
        document.getElementById("aguardam").innerText = listaGeral.filter(c => c.estado !== "presente" && c.estado !== "realizada").length;
    }
    // Card "Total Presentes": Conta pacientes que estão atualmente na sala (não zera baseado na data)
    if(document.getElementById("totalPresentes")) {
        document.getElementById("totalPresentes").innerText = listaGeral.filter(c => c.estado === "presente").length;
    }

    // 4. Preparação da Tabela (Ordenação por hora)
    let listaTabela = listaGeral.sort((a, b) => (a.hora || "").localeCompare(b.hora || ""));

    // Filtro da barra de pesquisa por digitação
    if (termo) {
        listaTabela = listaTabela.filter(c =>
            (c.paciente || "").toLowerCase().includes(termo) ||
            (c.medico || "").toLowerCase().includes(termo) ||
            (c.especialidade || "").toLowerCase().includes(termo)
        );
    }

    if (listaTabela.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:20px;color:#777;">Nenhuma consulta localizada para os filtros aplicados.</td></tr>`;
        return;
    }

    // 5. Renderização das linhas da tabela (Sem o ícone de cadeira no texto "Na Sala")
    tbody.innerHTML = listaTabela.map(c => `
        <tr>
            <td><b>${escapeHtml(c.paciente)}</b></td>
            <td>Dr(a). ${escapeHtml(c.medico)}</td>
            <td>${escapeHtml(c.especialidade || "Geral")}</td>
            <td>${escapeHtml(c.data)}</td>
            <td><b>${escapeHtml(c.hora)}</b></td>
            <td>${estadoBadgePresenca(c.estado)}</td>
            <td>
                ${c.estado !== "presente" && c.estado !== "realizada"
                    ? `<button class="confirm" type="button" onclick="darEntradaPaciente(${c.id})"><i class="fa fa-check"></i> Confirmar Presença</button>`
                    : c.estado === "realizada" 
                        ? `<span style="color:#64748b; font-size:13px;"><i class="fa fa-user-check"></i> Atendido</span>`
                        : `<span style="color:#16a34a; font-weight:bold; font-size:13px;">Na Sala</span>`
                }
            </td>
        </tr>
    `).join("");
}

// Altera o estado para "presente" permitindo que os médicos visualizem na triagem
async function darEntradaPaciente(id) {
    try {
        if (typeof atualizarConsulta === "function") {
            await atualizarConsulta(id, { estado: "presente" });
            
            // Recarrega os dados atualizados para atualizar a UI
            if (typeof loadConsultas === "function") {
                consultasPresenca = await loadConsultas();
            } else {
                consultasPresenca = JSON.parse(localStorage.getItem("consultas") || "[]");
            }
            renderPresencas();
        } else {
            // Modificação manual caso a persistência global não esteja disponível no escopo
            const index = consultasPresenca.findIndex(c => c.id === id);
            if(index !== -1) {
                consultasPresenca[index].estado = "presente";
                localStorage.setItem("consultas", JSON.stringify(consultasPresenca));
                renderPresencas();
            }
        }
    } catch (error) {
        console.error("Erro ao registrar entrada:", error);
        alert("Não foi possível registar o check-in do paciente.");
    }
}

// Distintivos visuais dinâmicos alinhados com o CSS
function estadoBadgePresenca(estado) {
    const map = { pendente: "pendente", confirmada: "confirmada", presente: "presente", realizada: "realizada" };
    const cls = map[estado] || "pendente";
    
    let textoExibido = estado;
    if (estado === "presente") textoExibido = "Na Sala";
    else if (estado === "confirmada") textoExibido = "Confirmada";
    else if (estado === "pendente") textoExibido = "Pendente";
    else if (estado === "realizada") textoExibido = "Realizada";

    return `<span class="badge ${cls}">${textoExibido}</span>`;
}

function escapeHtml(string) {
    if (!string) return "";
    return String(string).replace(/[&<>"']/g, function (s) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[s];
    });
}

window.addEventListener("DOMContentLoaded", initPresencas);