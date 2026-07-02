const corpo = document.querySelector("#tabelaCancelamento tbody");

listarCancelamento();

function listarCancelamento(){

    corpo.innerHTML="";

    obterConsultas().forEach(c=>{

        corpo.innerHTML += `
        <tr>
            <td>${c.paciente}</td>
            <td>${c.medico}</td>
            <td>${c.especialidade}</td>
            <td>${c.data}</td>
            <td>${c.hora}</td>
            <td>
                <button onclick="cancelar(${c.id})">
                    Cancelar
                </button>
            </td>
        </tr>`;

    });

}

function cancelar(id){

    if(!confirm("Deseja cancelar esta consulta?")) return;

    const consultas = obterConsultas().filter(c=>c.id!=id);

    guardarConsultas(consultas);

    listarCancelamento();

    alert("✅ Consulta cancelada com sucesso!");

}