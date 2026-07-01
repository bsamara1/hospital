let consultaAtual = null;
const tabela =
document.querySelector("#tabelaReagendamento tbody");

mostrar();

function mostrar(){

let consultas = carregar("consultas");

tabela.innerHTML="";

consultas.forEach(c=>{

tabela.innerHTML +=`

<tr>

<td>${c.nome}</td>
<td>${c.medico}</td>
<td>${c.especialidade}</td>
<td>${c.data}</td>
<td>${c.hora}</td>

<td>

<button onclick="editar(${c.id})">
Editar
</button>

<button onclick="cancelar(${c.id})" style="background:red;color:white;margin-left:5px;">
Cancelar
</button>

</td>

</tr>

`;

});

}

function editar(id){

let consultas = carregar("consultas");

consultaAtual = consultas.find(c => c.id == id);

document.getElementById("editData").value = consultaAtual.data;
document.getElementById("editHora").value = consultaAtual.hora;

document.getElementById("modal").style.display = "flex";
}
function guardarEdicao(){

let consultas = carregar("consultas");

consultaAtual.data = document.getElementById("editData").value;
consultaAtual.hora = document.getElementById("editHora").value;

consultas = consultas.map(c =>
c.id === consultaAtual.id ? consultaAtual : c
);

guardar("consultas", consultas);

fecharModal();
mostrar();

alert("Consulta atualizada com sucesso.");
}

function cancelar(id){

let confirmacao = confirm("Tens a certeza que queres cancelar esta consulta?");

if(!confirmacao) return;

let consultas = carregar("consultas");

consultas = consultas.filter(c => c.id !== id);

guardar("consultas", consultas);

mostrar();

alert("Consulta cancelada com sucesso.");
}

function fecharModal(){
document.getElementById("modal").style.display = "none";
}