// =========================================================================
// CONFIGURAÇÕES, VALIDAÇÃO DE SESSÃO E UTILITÁRIOS GLOBAIS
// =========================================================================
const API_URL = "http://127.0.0.1:5000";

const utilizadorLogado = JSON.parse(localStorage.getItem("utilizador") || "null");
const tipoUtilizador = String(utilizadorLogado?.tipo || "").toLowerCase();

// Proteção de Rotas: Garante que apenas a receção ou admin acede
if (!utilizadorLogado || !["rececao", "recepcionista", "admin"].includes(tipoUtilizador)) {
    window.location.href = "../login.html";
}

document.addEventListener("DOMContentLoaded", () => {
    const logout = document.querySelector(".logout");
    if (logout) {
        logout.addEventListener("click", () => {
            localStorage.removeItem("utilizador");
            localStorage.removeItem("email");
        });
    }
    preencherUsuarioHeader();
    atualizarBadgeNotificacoes();
});

function preencherUsuarioHeader() {
    const nomeEl = document.getElementById("usuarioNome");
    const emailEl = document.getElementById("usuarioEmail");
    if (nomeEl && utilizadorLogado?.nome) nomeEl.innerText = utilizadorLogado.nome;
    if (emailEl && utilizadorLogado?.email) emailEl.innerText = utilizadorLogado.email;
    
    // Configura o avatar com siglas dinâmicas se existir o elemento na página
    const avatarEl = document.getElementById("usuarioAvatar");
    if (avatarEl && utilizadorLogado?.nome) {
        const partes = utilizadorLogado.nome.trim().split(" ");
        const sigla = partes.length > 1 ? (partes[0][0] + partes[partes.length - 1][0]) : partes[0][0];
        avatarEl.innerText = sigla.toUpperCase();
    }
}

async function atualizarBadgeNotificacoes() {
    const badge = document.getElementById("notifBadge");
    if (!badge) return;

    try {
        // Carrega os dados em paralelo (igual ao notificacoes.js)
        const [consultas, pacientes, medicos] = await Promise.all([
            loadConsultas(),
            loadPacientes(),
            loadMedicos()
        ]);

        let totalReal = 0;

        // 1. Contar consultas pendentes ou canceladas
        totalReal += consultas.filter(c => c.estado === "cancelada" || c.estado === "pendente").length;

        // 2. Contar médicos indisponíveis
        totalReal += medicos.filter(m => m.status && m.status !== "ativo").length;

        // 3. Contar novos pacientes (os últimos 5 sempre geram 5 notificações)
        totalReal += pacientes.slice(-5).length;

        // 4. Contar o aviso fixo do administrador
        totalReal += 1;

        // Atualiza o elemento visual
        if (totalReal > 0) {
            badge.innerText = totalReal > 9 ? "9+" : totalReal;
            badge.style.display = "inline-block";
        } else {
            badge.style.display = "none";
        }
    } catch (error) {
        console.error("Erro ao recalcular badge global:", error);
    }
}
// =========================================================================
// COMUNICAÇÃO COM AS FONTES DE DADOS (API COM FALLBACK PARA TXT)
// =========================================================================
async function loadConsultas() {
    try {
        const res = await fetch(`${API_URL}/consultas`);
        if (!res.ok) throw new Error();
        return await res.json();
    } catch {
        try {
            // Fallback para ler o ficheiro local se a API estiver offline
            const res = await fetch("consultas.txt");
            if (!res.ok) throw new Error();
            return await res.json();
        } catch (error) {
            console.warn("Não foi possível carregar consultas de nenhuma fonte:", error);
            return [];
        }
    }
}

async function loadPacientes() {
    try {
        const res = await fetch(`${API_URL}/utilizadores`);
        if (!res.ok) throw new Error();
        const dados = await res.json();
        // Filtra para garantir que apenas utilizadores do tipo Paciente são retornados
        return dados.filter(u => String(u.tipo).toLowerCase() === "paciente");
    } catch (error) {
        console.warn("Não foi possível carregar pacientes:", error);
        return [];
    }
}

async function loadMedicos() {
    try {
        const res = await fetch(`${API_URL}/medicos`);
        if (!res.ok) throw new Error();
        return await res.json();
    } catch (error) {
        console.warn("Não foi possível carregar médicos:", error);
        return [];
    }
}

async function atualizarConsulta(id, dados) {
    const res = await fetch(`${API_URL}/consultas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.mensagem || "Erro ao atualizar consulta.");
    return data.consulta;
}

async function criarConsulta(dados) {
    const res = await fetch(`${API_URL}/consultas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.mensagem || "Erro ao criar consulta.");
    return data.consulta;
}

// =========================================================================
// TRATAMENTO DE FORMATOS E DATA
// =========================================================================
function parseDate(value) {
    if (!value) return null;
    const parts = value.split("-");
    if (parts.length !== 3) return null;
    return new Date(`${parts[0]}-${parts[1]}-${parts[2]}`);
}

function formatDate(value) {
    const data = parseDate(value);
    if (!data) return value || "";
    return data.toLocaleDateString("pt-PT");
}

function hojeISO() {
    return new Date().toISOString().split("T")[0];
}

function compareConsultas(a, b) {
    const dataA = parseDate(a.data);
    const dataB = parseDate(b.data);
    if (!dataA || !dataB) return 0;
    if (dataA.getTime() !== dataB.getTime()) return dataA - dataB;
    return (a.hora || "").localeCompare(b.hora || "");
}

function capitalize(text) {
    if (!text) return text;
    return text.charAt(0).toUpperCase() + text.slice(1);
}

function escapeHtml(text) {
    if (!text) return "";
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function marcarSidebarAtiva(pagina) {
    document.querySelectorAll(".sidebar a[data-page]").forEach(link => {
        link.classList.toggle("active", link.dataset.page === pagina);
    });
}