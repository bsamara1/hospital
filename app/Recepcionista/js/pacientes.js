// ==========================================================================
// PACIENTES.JS - SINCRO COM STORAGE GERAL (RECEÇÃO)
// ==========================================================================

let listaPacientesGlobal = [];

/**
 * Inicializa a página carregando os dados normalizados através da camada storage.js
 */
async function initPacientesAtivos() {
    // Tenta marcar o link ativo se a função auxiliar global existir
    if (typeof marcarSidebarAtiva === "function") {
        marcarSidebarAtiva("pacientes");
    }

    try {
        // Pega todos os utilizadores (unificados do txt + API) da camada central
        const todosUtilizadores = await obterUsuariosGerais();
        
        // Filtra estritamente para manter apenas quem for mapeado como "paciente"
        listaPacientesGlobal = todosUtilizadores.filter(u => String(u.perfil).toLowerCase() === "paciente");
    } catch (err) {
        console.error("Erro ao carregar pacientes via storage central:", err);
        listaPacientesGlobal = [];
    }

    // Vincula o evento de digitação na barra de pesquisa
    const inputPesquisa = document.getElementById("pesquisaPaciente");
    if (inputPesquisa) {
        // Remove ouvintes duplicados se houver e adiciona o atual
        inputPesquisa.removeEventListener("input", renderTabelaPacientes);
        inputPesquisa.addEventListener("input", renderTabelaPacientes);
    }
    
    renderTabelaPacientes();
}

/**
 * Renderiza as linhas da tabela aplicando o termo de pesquisa inserido na UI
 */
function renderTabelaPacientes() {
    const tbody = document.getElementById("pacientesTabela");
    if (!tbody) return;

    const termo = document.getElementById("pesquisaPaciente")?.value.trim().toLowerCase() || "";
    
    // Filtra com base nos critérios estabelecidos na pesquisa
    const filtrados = listaPacientesGlobal.filter(p => 
        (p.nome || "").toLowerCase().includes(termo) ||
        (p.bi || "").toLowerCase().includes(termo) ||
        (p.email || "").toLowerCase().includes(termo)
    );

    // Sincroniza os contadores superiores exatos do pacientes.html
    const totalPacientesEl = document.getElementById("totalPacientes");
    const pacientesAtivosEl = document.getElementById("pacientesAtivos");
    
    if (totalPacientesEl) totalPacientesEl.innerText = listaPacientesGlobal.length;
    if (pacientesAtivosEl) pacientesAtivosEl.innerText = filtrados.length;

    tbody.innerHTML = "";
    if (filtrados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:#777;">Nenhum registo de paciente encontrado.</td></tr>`;
        return;
    }

    // Mapeia e monta a estrutura HTML exata com a coluna de ações e escape HTML
    tbody.innerHTML = filtrados.map(p => {
        const emailSeguro = encodeURIComponent(p.email || '');
        return `
        <tr>
            <td><b>${escapeHtml(p.nome)}</b></td>
            <td>${escapeHtml(p.bi || "—")}</td>
            <td>${p.dataNascimento && p.dataNascimento !== "-" ? formatDate(p.dataNascimento) : "—"}</td>
            <td>${escapeHtml(p.sexo || "—")}</td>
            <td>${escapeHtml(p.telefone || "—")}</td>
            <td>${escapeHtml(p.email)}</td>
            <td style="white-space: nowrap; text-align: center;">
                <button class="view-btn" onclick="alert('Ficha Completa de Utente\\n\\nNome: ${escapeHtml(p.nome)}\\nBI: ${escapeHtml(p.bi)}\\nEstado: ${p.estado}')" style="margin-right: 4px;">
                    <i class="fa fa-info-circle"></i>
                </button>
                <button class="view-btn" style="background-color: #0284c7;" onclick="alternarEstadoPaciente('${emailSeguro}')">
                    <i class="fa fa-sync-alt"></i>
                </button>
            </td>
        </tr>
    `;}).join("");
}

/**
 * Salva o registro chamando as validações e a requisição estruturada do backend
 */
async function salvarPaciente() {
    const nome = document.getElementById("pacienteNome").value.trim();
    const bi = document.getElementById("pacienteBI").value.trim();
    const dataNascimento = document.getElementById("pacienteDataNascimento").value;
    const sexo = document.getElementById("pacienteSexo").value;
    const telefone = document.getElementById("pacienteTelefone").value.trim();
    const email = document.getElementById("pacienteEmail").value.trim();
    const senha = document.getElementById("pacienteSenha").value;

    if (!nome || !bi || !dataNascimento || !sexo || !email || !senha) {
        alert("Preencha todos os campos obrigatórios da ficha.");
        return;
    }

    try {
        // Envia o payload utilizando a função centralizadora de persistência do seu storage
        if (typeof criarUtilizadorApi === "function") {
            await criarUtilizadorApi(nome, bi, dataNascimento, sexo, telefone, email, senha, "paciente");
        } else {
            throw new Error("Função de persistência criarUtilizadorApi não localizada.");
        }
        
        // Regista o log local de auditoria de forma preventiva se disponível
        if (typeof registrarLogAcesso === "function") {
            registrarLogAcesso("Receção", `Inscrição efetuada para o paciente: ${nome}`);
        }

        alert("Paciente registado com sucesso!");
        
        // Reseta o formulário da UI
        document.getElementById("form-user")?.reset();
        
        // Recarrega os dados e atualiza o ecrã
        await initPacientesAtivos();
    } catch (err) {
        alert(err.message || "Ocorreu um erro ao tentar salvar a ficha do paciente.");
    }
}

/**
 * Permite gerir o estado de atividade do paciente usando as ações unificadas
 */
async function alternarEstadoPaciente(emailSeguro) {
    const email = decodeURIComponent(emailSeguro);
    try {
        if (typeof alternarEstadoUtilizadorApi === "function") {
            await alternarEstadoUtilizadorApi(email);
            if (typeof registrarLogAcesso === "function") {
                registrarLogAcesso("Receção", `Alternou estado do paciente: ${email}`);
            }
            await initPacientesAtivos();
        }
    } catch (erro) {
        alert("Erro ao modificar o estado: " + erro.message);
    }
}

// Vincula a inicialização automática ao carregar o ecossistema DOM
window.addEventListener("DOMContentLoaded", initPacientesAtivos);