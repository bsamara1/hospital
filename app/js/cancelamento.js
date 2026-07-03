const API_URL = "http://127.0.0.1:5000";
let consultas = [];
let corpo = null;

async function initCancelamento() {
    corpo = document.getElementById("tabelaCancelamento");
    await carregarConsultas();
}

<<<<<<< HEAD
function listarCancelamento() {
    if (!corpo) return;
    corpo.innerHTML = "";

    const consultas = obterConsultas();
    
    // Só mostra consultas que ainda não foram canceladas
    const cancelaveis = consultas.filter(c => c.estado !== "🔴 Cancelada");

    if (cancelaveis.length === 0) {
        corpo.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#718096;">Nenhuma consulta ativa disponível para cancelar.</td></tr>`;
        return;
    }

    cancelaveis.forEach(c => {
        corpo.innerHTML += `
        <tr>
            <td data-label="Paciente">${c.paciente}</td>
            <td data-label="Médico">${c.medico}</td>
            <td data-label="Especialidade">${c.especialidade}</td>
            <td data-label="Data">${c.data}</td>
            <td data-label="Hora">${c.hora}</td>
            <td data-label="Estado"><strong>${c.estado}</strong></td>
            <td data-label="Ação">
                <button class="btn-cancelar" onclick="cancelar(${c.id})" style="background-color:#dc3545; color:white; border:none; padding:6px 12px; border-radius:6px; cursor:pointer;">
                    <i class="fa-solid fa-trash-can"></i> Cancelar
                </button>
=======
async function carregarConsultas() {
    const res = await fetch(`${API_URL}/consultas`);
    consultas = await res.json();
    renderTabela();
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
>>>>>>> b3916c6b9506d1ff865d0efe4ddaba2dc36f51b9
            </td>
        </tr>`;
    });
}

<<<<<<< HEAD
function cancelar(id) {
    if (!confirm("Tem a certeza que deseja cancelar esta consulta?")) return;

    let consultas = obterConsultas();

    // Muda o estado para Cancelada
    consultas = consultas.map(c => {
        if (c.id == id) {
            c.estado = "🔴 Cancelada";
        }
        return c;
    });

    guardarConsultas(consultas);
    listarCancelamento(); // Remove da lista na hora

    alert("❌ Consulta cancelada com sucesso!");
}
=======
function formatarData(dataString) {
    if (!dataString) return "";
    const partes = dataString.split("-");
    if (partes.length !== 3) return dataString;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
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
>>>>>>> b3916c6b9506d1ff865d0efe4ddaba2dc36f51b9
