const API_URL = "http://127.0.0.1:5000";
// Carrega o utilizador logado do localStorage
const utilizadorLogado = JSON.parse(localStorage.getItem("utilizador") || "null");

// --- TRUQUE PARA DESATIVAR AS FUNÇÕES ANTIGAS DOS SEUS HTMLs ---
// Isto impede que o código antigo estático "esmague" os novos dados dinâmicos
window.aplicarIdentidadeFixa = function() { console.log("Função antiga bloqueada com sucesso."); };
window.salvarPerfilLocal = function() { console.log("Função antiga bloqueada com sucesso."); };

// 1. Preenche as informações no Cabeçalho Superior (Header)
function preencherUsuarioHeader() {
    const nomeEl = document.getElementById("usuarioNome");
    const emailEl = document.getElementById("usuarioEmail");
    const avatarEl = document.getElementById("usuarioAvatar");

    if (utilizadorLogado) {
        if (nomeEl && utilizadorLogado.nome) nomeEl.innerText = utilizadorLogado.nome;
        if (emailEl && utilizadorLogado.email) emailEl.innerText = utilizadorLogado.email;

        if (avatarEl && utilizadorLogado.nome) {
            const partes = utilizadorLogado.nome.trim().split(" ");
            const sigla = partes.length > 1 ? (partes[0][0] + partes[partes.length - 1][0]) : partes[0][0];
            avatarEl.innerText = sigla.toUpperCase();
        }
    }
}

// 2. Preenche os campos do formulário/painel de perfil (HTML)
function preencherFormularioPerfil() {
    const nomePerfilEl = document.getElementById("nomePerfil");
    const emailPerfilEl = document.getElementById("emailPerfil");

    if (utilizadorLogado) {
        if (nomePerfilEl && utilizadorLogado.nome) nomePerfilEl.value = utilizadorLogado.nome;
        if (emailPerfilEl && utilizadorLogado.email) emailPerfilEl.value = utilizadorLogado.email;
    }
}

// 3. Atualiza o Badge de Notificações
async function atualizarBadgeNotificacoes() {
    const badge = document.getElementById("notifBadge");
    if (!badge || !utilizadorLogado?.nome) return;

    try {
        const res = await fetch(`${API_URL}/consultas`);
        if (!res.ok) throw new Error();
        const consultas = await res.json();
        const minhas = consultas.filter(c => c.medico === utilizadorLogado.nome);
        const relevantes = minhas.filter(c => c.estado === "pendente" || c.estado === "confirmada");

        if (relevantes.length > 0) {
            badge.innerText = relevantes.length > 9 ? "9+" : relevantes.length;
            badge.style.display = "inline-block";
        } else {
            badge.style.display = "none";
        }
    } catch (erro) {
        console.warn("Não foi possível carregar notificações.");
    }
}

// Executa tudo assim que a página carregar
function inicializarTudo() {
    preencherUsuarioHeader();
    preencherFormularioPerfil();
    atualizarBadgeNotificacoes();
}

// Vincula aos eventos de carregamento para garantir execução imediata
document.addEventListener("DOMContentLoaded", inicializarTudo);
window.addEventListener("load", inicializarTudo);
// Executa imediatamente caso o script seja carregado no fim do body
inicializarTudo();