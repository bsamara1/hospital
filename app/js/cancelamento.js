const API_URL = "http://127.0.0.1:5000";
const utilizadorLogado = JSON.parse(localStorage.getItem("utilizador") || "null");

let consultas = [];
let corpo = null;

async function initCancelamento() {
    preencherUsuarioHeader();
    corpo = document.getElementById("tabelaCancelamento");
    await carregarConsultas();
}

function preencherUsuarioHeader() {
    const nomeEl = document.getElementById("usuarioNome");
    const emailEl = document.getElementById("usuarioEmail");
    const avatarEl = document.getElementById("usuarioAvatar");
    if (nomeEl && utilizadorLogado?.nome) nomeEl.innerText = utilizadorLogado.nome;
    if (emailEl && utilizadorLogado?.email) emailEl.innerText = utilizadorLogado.email;
    if (avatarEl && utilizadorLogado?.nome) {
        const partes = utilizadorLogado.nome.trim().split(" ");
        const sigla = partes.length > 1 ? (partes[0][0] + partes[partes.length - 1][0]) : partes[0][0];
        avatarEl.innerText = sigla.toUpperCase();
    }
}

async function carregarConsultas() {
    const res = await fetch(`${API_URL}/consultas`);
    const todasConsultas = await res.json();
    const paciente = utilizadorLogado?.nome || "";
    consultas = todasConsultas.filter(c => (c.paciente || "").toLowerCase() === paciente.toLowerCase());
    renderTabela();
    atualizarBadgeNotificacoes();
}

function atualizarBadgeNotificacoes() {
    const badge = document.getElementById("notifBadge");
    if (!badge) return;
    const relevantes = consultas.filter(c => c.estado === "pendente" || c.estado === "cancelada" || c.estado === "confirmada");
    if (relevantes.length > 0) {
        badge.innerText = relevantes.length > 9 ? "9+" : relevantes.length;
        badge.style.display = "inline-block";
    } else {
        badge.style.display = "none";
    }
}

function formatarData(dataString) {
    if (!dataString) return "";
    const partes = dataString.split("-");
    if (partes.length !== 3) return dataString;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function renderTabela() {
    if (!corpo) return;
    corpo.innerHTML = "";

    const consultasAtivas = consultas.filter(c => c.estado !== "cancelada");
    if (consultasAtivas.length === 0) {
        corpo.innerHTML = `
        <tr>
            <td colspan="7" style="text-align:center; padding:18px; color:#555;">Não há consultas ativas para cancelar.</td>
        </tr>`;
        return;
    }

    consultasAtivas.forEach(c => {
        corpo.innerHTML += `
        <tr>
            <td>${c.paciente}</td>
            <td>${c.medico}</td>
            <td>${c.especialidade}</td>
            <td>${formatarData(c.data)}</td>
            <td>${c.hora}</td>
            <td>${c.estado}</td>
            <td>
                <button onclick="cancelar(${c.id})">Cancelar</button>
            </td>
        </tr>`;
    });
}

async function cancelar(id) {
    if (!confirm("Deseja cancelar esta consulta?")) return;

    try {
        const resposta = await fetch(`${API_URL}/consultas/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ estado: "cancelada" })
        });

        if (!resposta.ok) {
            const erro = await resposta.json().catch(() => ({}));
            throw new Error(erro.mensagem || "Não foi possível cancelar a consulta.");
        }

        await carregarConsultas();
        alert("Consulta cancelada com sucesso.");
    } catch (error) {
        alert(error.message);
    }
}

window.addEventListener("DOMContentLoaded", initCancelamento);
