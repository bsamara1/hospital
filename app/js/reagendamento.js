const tbody = document.querySelector("#tabelaReagendamento tbody");

let consultaSelecionada = null;

listar();

function listar(){

    tbody.innerHTML="";

    obterConsultas().forEach(c=>{

        tbody.innerHTML += `
        <tr>
            <td>${c.paciente}</td>
            <td>${c.medico}</td>
            <td>${c.especialidade}</td>
            <td>${formatarData(c.data)}</td>
            <td>${c.hora}</td>
            <td>
                <button onclick="selecionar(${c.id})">
                    Selecionar
                </button>
            </td>
        </tr>`;
    });
}

function selecionar(id){

    consultaSelecionada=id;

}

function guardarEdicao(){

    if(consultaSelecionada==null){
        alert("Selecione uma consulta.");
        return;
    }

    let consultas = obterConsultas();

    consultas = consultas.map(c=>{

        if(c.id==consultaSelecionada){

            c.data=document.getElementById("editData").value;
            c.hora=document.getElementById("editHora").value;

        }

        return c;

    });

    guardarConsultas(consultas);

    listar();

    alert("✅ Consulta reagendada com sucesso!");

    consultaSelecionada=null;

    limparCampos();

}
window.addEventListener("DOMContentLoaded", initReagendamento);