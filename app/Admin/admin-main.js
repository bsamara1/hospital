// Filtro inicial padrão ao abrir a aba
let perfilSelecionado = 'paciente'; 

function filtrarUtilizadores(perfil) {
    perfilSelecionado = perfil;
    
    // Atualiza o estado visual dos botões de filtro
    document.querySelectorAll('.filter-bar button').forEach(btn => btn.classList.remove('active-filter'));
    const btnAtivo = document.getElementById(`btn-filter-${perfil}`);
    if (btnAtivo) btnAtivo.classList.add('active-filter');

    // Altera dinamicamente o título da listagem
    const txtTitulo = document.getElementById("titulo-tabela-usuarios");
    if(txtTitulo) {
        if(perfil === 'todos') txtTitulo.innerText = "Todos os Utilizadores Registados";
        if(perfil === 'paciente') txtTitulo.innerText = "Lista de Pacientes Registados";
        if(perfil === 'medico') txtTitulo.innerText = "Lista de Médicos Registados";
        if(perfil === 'recepcionista') txtTitulo.innerText = "Lista de Recepcionistas Registadas";
    }

    atualizarTelas();
}

// Alternar as seções principais
function trocarSecao(secaoId) {
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.sidebar a').forEach(a => a.classList.remove('active'));

    // Torna a seção alvo visível
    const secaoAlvo = document.getElementById(`sec-${secaoId}`);
    if(secaoAlvo) secaoAlvo.classList.add('active');
    
    const menuAlvo = document.getElementById(`menu-${secaoId}`);
    if(menuAlvo) menuAlvo.classList.add('active');

    const nomenclaturas = {
        dashboard: "Dashboard Administrador", utilizadores: "Gestão Completa de Utilizadores",
        medicos: "Controle de Corpo Clínico & Horários", especialidades: "Gestão de Especialidades Clínicas",
        consultas: "Histórico Unificado de Consultas", notificacoes: "Notificações em Massa",
        seguranca: "Auditoria & Logs de Segurança"
    };
    
    const tituloPagina = document.getElementById("titulo-pagina");
    if(tituloPagina) tituloPagina.innerText = nomenclaturas[secaoId];
    
    atualizarTelas();
}

// Função Principal de Renderização Visual
function atualizarTelas() {
    const usuarios = obterUsuariosGerais();
    const medicos = obterMedicosInfo();
    const especialidades = obterEspecialidadesLista();
    const consultas = JSON.parse(localStorage.getItem("consultas")) || [];

    // 1. ATUALIZAR CONTADORES DO DASHBOARD
    if(document.getElementById("count-pacientes")) {
        document.getElementById("count-pacientes").innerText = usuarios.filter(u => u.perfil === "paciente").length;
        document.getElementById("count-medicos").innerText = medicos.length;
        document.getElementById("count-realizadas").innerText = consultas.filter(c => c.estado === "confirmada" || c.estado === "done").length;
        document.getElementById("count-canceladas").innerText = consultas.filter(c => c.estado === "cancelada").length;
    }

    // 2. RENDERIZAR TABELA DE UTILIZADORES COM FILTRO OBRIGATÓRIO (Abre sempre a lista)
    const tUsers = document.getElementById("tabela-utilizadores");
    if(tUsers) {
        tUsers.innerHTML = "";
        
        const dadosFiltrados = usuarios.filter(u => {
            if (perfilSelecionado === 'todos') return true;
            return u.perfil === perfilSelecionado;
        });

        // Se a lista estiver vazia, garante que exibe uma linha informativa estruturada dentro da tabela
        if(dadosFiltrados.length === 0) {
            tUsers.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#ff6b6b; font-weight:500; padding:20px;">A lista de ${perfilSelecionado}s está atualmente vazia.</td></tr>`;
        } else {
            dadosFiltrados.forEach(u => {
                tUsers.innerHTML += `
                <tr>
                    <td>${u.nome}</td>
                    <td>${u.email}</td>
                    <td><strong style="text-transform:capitalize;">${u.perfil}</strong></td>
                    <td><span class="status ${u.estado}">${u.estado}</span></td>
                    <td>
                        <button class="secondary" onclick="inverterStatusUsuario(${u.id})">Inverter Estado</button>
                        <button class="delete" onclick="apagarUsuario(${u.id})">Remover</button>
                    </td>
                </tr>`;
            });
        }
    }

    // 3. TABELA DE MÉDICOS
    const tMedicos = document.getElementById("tabela-medicos");
    if(tMedicos) {
        tMedicos.innerHTML = "";
        medicos.forEach(m => {
            tMedicos.innerHTML += `
            <tr>
                <td>${m.nome}</td>
                <td>${m.especialidade}</td>
                <td>${m.dias}</td>
                <td>${m.horario}</td>
                <td><button class="delete" onclick="apagarConfigMedico(${m.id})">Remover</button></td>
            </tr>`;
        });
    }

    // 4. ESPECIALIDADES
    const tEsp = document.getElementById("tabela-especialidades");
    if(tEsp) {
        tEsp.innerHTML = "";
        especialidades.forEach((esp, index) => {
            tEsp.innerHTML += `<tr><td>${esp}</td><td><button class="delete" onclick="apagarEspecialidade(${index})">Remover</button></td></tr>`;
        });
    }

    // 5. RANKING DE ATENDIMENTOS (Dashboard)
    const tRank = document.getElementById("ranking-medicos");
    if(tRank) {
        tRank.innerHTML = "";
        [...medicos].sort((a,b) => b.totalAtendimentos - a.totalAtendimentos).forEach(m => {
            tRank.innerHTML += `<tr><td>${m.nome}</td><td>${m.especialidade}</td><td><b>${m.totalAtendimentos} atendimentos</b></td></tr>`;
        });
    }

    // 6. HISTÓRICO GLOBAL DE CONSULTAS
    const tConsultas = document.getElementById("tabela-todas-consultas");
    if(tConsultas) {
        tConsultas.innerHTML = "";
        if(consultas.length === 0) {
            tConsultas.innerHTML = "<tr><td colspan='5' style='text-align:center;color:#888;'>Nenhuma consulta registrada na recepção ainda.</td></tr>";
        } else {
            consultas.forEach(c => {
                tConsultas.innerHTML += `<tr><td>${c.paciente || c.nome}</td><td>${c.medico}</td><td>${c.especialidade || 'Geral'}</td><td>${c.data} às ${c.hora}</td><td><span class="status pending">${c.estado}</span></td></tr>`;
            });
        }
    }

    // 7. CARREGAR SELECTS DINÂMICOS
    carregarSelectsAuxiliares(usuarios, medicos, especialidades);
    
    // 8. LOGS
    const tLogs = document.getElementById("tabela-logs");
    if(tLogs) {
        tLogs.innerHTML = "";
        obterLogsAcesso().slice(0, 15).forEach(l => {
            tLogs.innerHTML += `<tr><td>${l.data}</td><td>${l.operador}</td><td>${l.acao}</td></tr>`;
        });
    }
}

function carregarSelectsAuxiliares(usuarios, medicos, especialidades) {
    const selMed = document.getElementById("select-medico-user");
    const selEsp = document.getElementById("select-medico-esp");
    if(!selMed || !selEsp) return;

    selMed.innerHTML = '<option value="">Selecionar Médico...</option>';
    usuarios.filter(u => u.perfil === "medico" && u.estado === "ativo").forEach(m => {
        selMed.innerHTML += `<option value="${m.nome}">${m.nome}</option>`;
    });

    selEsp.innerHTML = '<option value="">Atribuir Especialidade...</option>';
    especialidades.forEach(e => {
        selEsp.innerHTML += `<option value="${e}">${e}</option>`;
    });
}

function dispararNotificacao(e) {
    e.preventDefault();
    alert("Notificação Geral transmitida em tempo real para todo o sistema!");
    registrarLogAcesso("Administrador", "Emissão de comunicado global aos utilizadores.");
    document.getElementById("form-notif").reset();
}

function ejecutarBackupSystem() {
    const backupData = {
        utilizadores: obterUsuariosGerais(),
        medicos: obterMedicosInfo(),
        especialidades: obterEspecialidadesLista(),
        consultas: JSON.parse(localStorage.getItem("consultas")) || []
    };
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `backup_han_${Date.now()}.json`);
    dlAnchorElem.click();
    
    registrarLogAcesso("Administrador", "Efetuou cópia de segurança (Backup) dos dados.");
    atualizarTelas();
}

// Inicialização automática
window.addEventListener("DOMContentLoaded", () => {
    registrarLogAcesso("Administrador", "Autenticação efetuada com sucesso no Painel de Controle.");
    // Ativa por defeito o botão visual dos pacientes ao carregar
    filtrarUtilizadores('paciente');
});