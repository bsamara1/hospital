const form = document.getElementById("formConsulta");
const tabela = document.querySelector("#tabelaConsultas tbody");

listarConsultas();

form.addEventListener("submit", function(e){

    e.preventDefault();

    const consulta = {
        id: Date.now(),
        paciente: document.getElementById("nome").value,
        especialidade: document.getElementById("especialidade").value,
        medico: document.getElementById("medico").value,
        data: document.getElementById("data").value,
        hora: document.getElementById("hora").value
    };

    const consultas = obterConsultas();
    consultas.push(consulta);

    guardarConsultas(consultas);

    listarConsultas();

    alert("✅ Consulta marcada com sucesso!");

    form.reset();

});

function listarConsultas(){

    tabela.innerHTML="";

    const consultas = obterConsultas();

    consultas.forEach(c=>{

        tabela.innerHTML += `
        <tr>
            <td>${c.paciente}</td>
            <td>${c.especialidade}</td>
            <td>${c.medico}</td>
            <td>${c.data}</td>
            <td>${c.hora}</td>
        </tr>`;
    });

}