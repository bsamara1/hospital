const API_URL = "http://127.0.0.1:5000";
const utilizadorLogado = JSON.parse(localStorage.getItem("utilizador") || "null");

const tbody = document.querySelector("#tabelaReagendamento");
const selectHora = document.getElementById("editHora");

let consultas = [];
let medicos = [];
let consultaSelecionada = null;

async function initReagendamento() {
    preencherUsuarioHeader();
    await carregarDados();
    listar();
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

async function carregarDados() {
    const [resConsultas, resMedicos] = await Promise.all([
        fetch(`${API_URL}/consultas`),
        fetch(`${API_URL}/medicos`)
    ]);
    const todasConsultas = await resConsultas.json();
    const paciente = utilizadorLogado?.nome || "";
    consultas = todasConsultas.filter(c => (c.paciente || "").toLowerCase() === paciente.toLowerCase());
    medicos = await resMedicos.json();
    atualizarBadgeNotificacoes();
}

function formatarData(dataString) {
    if (!dataString) return "";
    const partes = dataString.split("-");
    if (partes.length !== 3) return dataString;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function listar() {
    tbody.innerHTML = "";

    const reagendaveis = consultas.filter(c => c.estado !== "cancelada");

    if (reagendaveis.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:18px; color:#555;">Não há consultas disponíveis para reagendar.</td></tr>`;
        return;
    }

    reagendaveis.forEach(c => {
        tbody.innerHTML += `
        <tr>
            <td>${c.paciente}</td>
            <td>${c.medico}</td>
            <td>${c.especialidade}</td>
            <td>${formatarData(c.data)}</td>
            <td>${c.hora}</td>
            <td>${c.estado}</td>
            <td>
                <button onclick="selecionar(${c.id})">Selecionar</button>
            </td>
        </tr>`;
    });
}

function selecionar(id) {
    consultaSelecionada = consultas.find(c => c.id === id);
    if (!consultaSelecionada) return;

    document.getElementById("selecionadoPaciente").innerText = consultaSelecionada.paciente;
    document.getElementById("selecionadoMedico").innerText = consultaSelecionada.medico;
    document.getElementById("selecionadoEspecialidade").innerText = consultaSelecionada.especialidade;
    document.getElementById("editData").value = consultaSelecionada.data;

    const medico = medicos.find(m => m.nome === consultaSelecionada.medico);
    const horarios = medico ? (medico.horarios || "").split(",").map(h => h.trim()).filter(Boolean) : [];

    selectHora.innerHTML = '<option value="">Selecionar hora</option>' +
        horarios.map(h => `<option value="${h}">${h}</option>`).join("");
    selectHora.value = consultaSelecionada.hora;
}

async function guardarEdicao() {
    if (consultaSelecionada == null) {
        alert("Selecione uma consulta.");
        return;
    }

    const novaData = document.getElementById("editData").value;
    const novaHora = selectHora.value;

    if (!novaData || !novaHora) {
        alert("Escolha uma nova data e hora.");
        return;
    }

    try {
        const resposta = await fetch(`${API_URL}/consultas/${consultaSelecionada.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: novaData, hora: novaHora })
        });

        if (!resposta.ok) {
            const erro = await resposta.json().catch(() => ({}));
            throw new Error(erro.mensagem || "Não foi possível reagendar a consulta.");
        }

        await carregarDados();
        listar();
        alert("Consulta reagendada com sucesso!");
        limparCampos();
    } catch (error) {
        alert(error.message);
    }
}

function limparCampos() {
    consultaSelecionada = null;
    document.getElementById("selecionadoPaciente").innerText = "-";
    document.getElementById("selecionadoMedico").innerText = "-";
    document.getElementById("selecionadoEspecialidade").innerText = "-";
    document.getElementById("editData").value = "";
    selectHora.innerHTML = '<option value="">Selecionar hora</option>';
}

window.addEventListener("DOMContentLoaded", initReagendamento);
