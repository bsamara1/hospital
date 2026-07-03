async function carregarConsultas() {

    const resposta = await fetch("../dados/consultas.txt");

    const consultas = await resposta.json();

    mostrarCards(consultas);

    mostrarConsultas(consultas);

    mostrarPacientesEspera(consultas);

    mostrarAgenda(consultas);

}

carregarConsultas();

function mostrarCards(consultas){

    const hoje = new Date().toISOString().split("T")[0];

    const consultasHoje = consultas.filter(c=>c.data===hoje);

    const pendentes = consultas.filter(c=>c.estado==="pendente");

    const canceladas = consultas.filter(c=>c.estado==="cancelada");

    const pacientes = [...new Set(consultas.map(c=>c.paciente))];

    document.getElementById("consultasHoje").textContent=consultasHoje.length;

    document.getElementById("pacientesTotal").textContent=pacientes.length;

    document.getElementById("pendentes").textContent=pendentes.length;

    document.getElementById("canceladas").textContent=canceladas.length;

}
async function carregarConsultas() {

    const resposta = await fetch("../dados/consultas.txt");
    const consultas = await resposta.json();

    atualizarCards(consultas);
    carregarTabela(consultas);

}

function atualizarCards(consultas){

    const hoje = new Date().toISOString().split("T")[0];

    const hojeList = consultas.filter(c => c.data === hoje);
    const pendentes = consultas.filter(c => c.estado === "pendente");
    const canceladas = consultas.filter(c => c.estado === "cancelada");

    const pacientes = [...new Set(consultas.map(c => c.paciente))];

    document.getElementById("consultasHoje").innerText = hojeList.length;
    document.getElementById("pacientesTotal").innerText = pacientes.length;
    document.getElementById("pendentes").innerText = pendentes.length;
    document.getElementById("canceladas").innerText = canceladas.length;
    document.getElementById("espera").innerText = pendentes.length;
}

function carregarTabela(consultas){

    const hoje = new Date().toISOString().split("T")[0];
    const tbody = document.getElementById("tabelaConsultas");

    tbody.innerHTML = "";

    consultas
    .filter(c => c.data === hoje)
    .forEach(c => {

        let estadoClass = "";

        if(c.estado === "pendente") estadoClass = "pending";
        if(c.estado === "confirmada") estadoClass = "done";
        if(c.estado === "cancelada") estadoClass = "cancel";

        tbody.innerHTML += `
        <tr>
            <td>${c.paciente}</td>
            <td>${c.medico}</td>
            <td>${c.hora}</td>
            <td><span class="status ${estadoClass}">${c.estado}</span></td>
        </tr>
        `;
    });
}

carregarConsultas();