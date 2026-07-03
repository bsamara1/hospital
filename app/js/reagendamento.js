const API_URL = "http://127.0.0.1:5000";
let medicos = [];
let consultas = [];
let consultaSelecionada = null;

const tbody = document.getElementById("tabelaReagendamento");

async function initReagendamento() {
    await carregarMedicos();
    await carregarConsultas();
    document.getElementById("editData").addEventListener("change", carregarHorarios);
}

async function carregarMedicos() {
    try {
        const res = await fetch(`${API_URL}/medicos`);
        if (!res.ok) throw new Error();
        medicos = await res.json();
    } catch (error) {
        const fallback = await fetch("../../medicos.txt");
        const text = await fallback.text();
        medicos = JSON.parse(text);
    }
}

async function carregarConsultas() {
    try {
        const res = await fetch(`${API_URL}/consultas`);
        if (!res.ok) throw new Error();
        consultas = await res.json();
    } catch (error) {
        try {
            const fallback = await fetch("../../consultas.txt");
            const text = await fallback.text();
            consultas = JSON.parse(text);
        } catch (fallbackError) {
            consultas = [];
        }
    }
    renderTabela();
}

function renderTabela() {
    tbody.innerHTML = "";

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const reagendaveis = consultas.filter(c => {
        const dataConsulta = new Date(`${c.data}T${c.hora}`);
        const statusOk = c.estado === "confirmada" || c.estado === "pendente";
        return statusOk && dataConsulta >= hoje;
    });

    if (reagendaveis.length === 0) {
        tbody.innerHTML = `
        <tr><td colspan="7" style="padding:18px; text-align:center; color:#555;">Nenhuma consulta disponível para reagendamento.</td></tr>`;
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
    document.getElementById("editHora").innerHTML = `<option value="">Selecionar hora</option>`;
    carregarHorarios();
}

function carregarHorarios() {
    const horaSelect = document.getElementById("editHora");
    const dataValue = document.getElementById("editData").value;
    horaSelect.innerHTML = `<option value="">Selecionar hora</option>`;

    if (!consultaSelecionada) return;
    if (!dataValue) return;

    const medico = medicos.find(m => m.nome === consultaSelecionada.medico && m.status === "ativo");
    if (!medico) return;

    medico.horarios.split(",").forEach(h => {
        horaSelect.innerHTML += `<option value="${h}">${h}</option>`;
    });
}

async function guardarEdicao() {
    if (!consultaSelecionada) {
        alert("Selecione uma consulta para reagendar.");
        return;
    }

    const data = document.getElementById("editData").value;
    const hora = document.getElementById("editHora").value;

    if (!data || !hora) {
        alert("Escolha uma nova data e hora.");
        return;
    }

    try {
        const resposta = await fetch(`${API_URL}/consultas/${consultaSelecionada.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data, hora })
        });

        if (!resposta.ok) {
            const erro = await resposta.json().catch(() => ({}));
            throw new Error(erro.mensagem || "Não foi possível reagendar a consulta.");
        }

        const resultado = await resposta.json();
        consultaSelecionada = null;
        document.getElementById("editData").value = "";
        document.getElementById("editHora").innerHTML = `<option value="">Selecionar hora</option>`;
        document.getElementById("selecionadoPaciente").innerText = "-";
        document.getElementById("selecionadoMedico").innerText = "-";
        document.getElementById("selecionadoEspecialidade").innerText = "-";
        await carregarConsultas();
        alert("Consulta reagendada com sucesso.");
    } catch (error) {
        alert(error.message);
    }
}

window.addEventListener("DOMContentLoaded", initReagendamento);