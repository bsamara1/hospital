const API_URL = "http://127.0.0.1:5000";
const utilizadorLogado = JSON.parse(localStorage.getItem("utilizador") || "null");

function preencherUsuarioHeader() {
    const nomeEl = document.getElementById("usuarioNome");
    const avatarEl = document.getElementById("usuarioAvatar");
    if (nomeEl && utilizadorLogado?.nome) nomeEl.innerText = utilizadorLogado.nome;
    if (avatarEl && utilizadorLogado?.nome) {
        const partes = utilizadorLogado.nome.trim().split(" ");
        const sigla = partes.length > 1 ? (partes[0][0] + partes[partes.length - 1][0]) : partes[0][0];
        avatarEl.innerText = sigla.toUpperCase();
    }
}

async function atualizarBadgeNotificacoes() {
    const badge = document.getElementById("notifBadge");
    if (!badge || !utilizadorLogado?.nome) return;

    try {
        const res = await fetch(`${API_URL}/consultas`);
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
        console.warn("Não foi possível carregar notificações do médico.", erro);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    preencherUsuarioHeader();
    atualizarBadgeNotificacoes();
});
