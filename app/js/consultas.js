// ===============================
// CONSULTAS.JS - SISTEMA HOSPITALAR
// ===============================

let consultas = [];

// ===============================
// CARREGAR CONSULTAS DO TXT
// ===============================
async function carregarConsultas() {
    try {
        const res = await fetch("consultas.txt");
        const data = await res.text();

        consultas = JSON.parse(data);

        renderTabela();
        atualizarCards();

    } catch (error) {
        console.log("Erro ao carregar consultas:", error);
    }
}

// ===============================
// RENDER TABELA
// ===============================
function renderTabela() {
    const tbody = document.getElementById("tabela-consultas");
    tbody.innerHTML = "";

    consultas.forEach(c => {
        tbody.innerHTML += `
        <tr>
            <td>${c.paciente}</td>
            <td>${c.medico}</td>
            <td>${c.especialidade}</td>
            <td>${c.data}</td>
            <td>${c.hora}</td>
            <td>
                <span class="${c.estado}">
                    ${c.estado}
                </span>
            </td>
            <td>
                <button class="confirm" onclick="confirmarConsulta(${c.id})">Confirmar</button>
                <button class="edit" onclick="reagendarConsulta(${c.id})">Reagendar</button>
                <button class="cancel" onclick="cancelarConsulta(${c.id})">Cancelar</button>
            </td>
        </tr>
        `;
    });
}

// ===============================
// ATUALIZAR CARDS
// ===============================
function atualizarCards() {
    const pendentes = consultas.filter(c => c.estado === "pendente").length;
    const confirmadas = consultas.filter(c => c.estado === "confirmada").length;
    const canceladas = consultas.filter(c => c.estado === "cancelada").length;

    document.getElementById("pendentes").innerText = pendentes;
    document.getElementById("confirmadas").innerText = confirmadas;
    document.getElementById("canceladas").innerText = canceladas;
}

// ===============================
// CONFIRMAR CONSULTA
// ===============================
function confirmarConsulta(id) {
    consultas = consultas.map(c => {
        if (c.id === id) {
            return { ...c, estado: "confirmada" };
        }
        return c;
    });

    renderTabela();
    atualizarCards();
}

// ===============================
// CANCELAR CONSULTA
// ===============================
function cancelarConsulta(id) {
    consultas = consultas.map(c => {
        if (c.id === id) {
            return { ...c, estado: "cancelada" };
        }
        return c;
    });

    renderTabela();
    atualizarCards();
}

// ===============================
// REAGENDAR CONSULTA (simples)
// ===============================
function reagendarConsulta(id) {
    const novaData = prompt("Nova data (YYYY-MM-DD):");
    const novaHora = prompt("Nova hora (HH:MM):");

    if (!novaData || !novaHora) return;

    consultas = consultas.map(c => {
        if (c.id === id) {
            return {
                ...c,
                data: novaData,
                hora: novaHora,
                estado: "pendente"
            };
        }
        return c;
    });

    renderTabela();
    atualizarCards();
}

// ===============================
// MARCAR NOVA CONSULTA
// ===============================
function marcarConsulta() {
    document.getElementById("modal").style.display = "flex";
}
function carregarHorarios() {

    const medico = document.getElementById("medico").value;
    const data = document.getElementById("data").value;
    const selectHora = document.getElementById("hora");

    selectHora.innerHTML = "<option value=''>Selecionar hora</option>";

    if (!medico || !data) return;

    const horarios = obterHorarios(medico);

    horarios.forEach(h => {
        selectHora.innerHTML += `<option value="${h}">${h}</option>`;
    });
}
function guardarConsulta() {

    const paciente = document.getElementById("paciente").value;
    const medico = document.getElementById("medico").value;
    const especialidade = document.getElementById("especialidade").value;
    const data = document.getElementById("data").value;
    const hora = document.getElementById("hora").value;

    if (!paciente || !medico || !especialidade || !data || !hora) {
        alert("Preenche todos os campos!");
        return;
    }

    const novaConsulta = {
        id: Date.now(),
        paciente,
        medico,
        especialidade,
        data,
        hora,
        estado: "pendente"
    };

    consultas.push(novaConsulta);

    renderTabela();
    atualizarCards();
    fecharModal();
}
let medicos = [];

async function carregarMedicos() {
    const res = await fetch("medicos.txt");
    const data = await res.text();

    medicos = JSON.parse(data);
}
function obterHorarios(medicoNome) {

    const medico = medicos.find(m => m.nome === medicoNome);

    if (!medico) return [];

    return medico.horarios.split(",");
}
function obterMedicosAtivos() {
    return medicos.filter(m => m.status === "ativo");
}
function carregarListaMedicos() {

    const select = document.getElementById("medico");

    select.innerHTML = "<option value=''>Selecionar médico</option>";

    obterMedicosAtivos().forEach(m => {
        select.innerHTML += `
            <option value="${m.nome}">
                ${m.nome} - ${m.especialidade}
            </option>
        `;
    });
}
// ===============================
// INICIAR SISTEMA
// ===============================
carregarConsultas();
carregarMedicos().then(() => {
    carregarListaMedicos();
});
