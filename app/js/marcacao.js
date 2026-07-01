const formulario =
document.getElementById("formConsulta");

const tabela =
document.querySelector("#tabelaConsultas tbody");

mostrarConsultas();

formulario.addEventListener("submit",function(e){

e.preventDefault();

let consultas = carregar("consultas");

const consulta = {

id: Date.now(),
nome: document.getElementById("nome").value,
especialidade: document.getElementById("especialidade").value,
medico: document.getElementById("medico").value,
data: document.getElementById("data").value,
hora: document.getElementById("hora").value,
prioridade: document.getElementById("prioridade").value

};

consultas.push(consulta);

let consultas = carregar("consultas") || [];

let resultado = validarConsulta(consulta, consultas);

if(resultado !== "OK"){
alert(resultado);
return;
}

consultas.push(consulta);
guardar("consultas", consultas);
formulario.reset();
mostrarConsultas();

guardar("consultas",consultas);

formulario.reset();

mostrarConsultas();

});

tabela.innerHTML += `
<tr>
<td>${c.nome}</td>
<td>${c.especialidade}</td>
<td>${c.medico}</td>
<td>${c.data}</td>
<td>${c.hora}</td>
<td><strong>${c.prioridade}</strong></td>
</tr>
`;
function mostrarConsultas(){

let consultas = carregar("consultas") || [];

const nome = document.getElementById("pesquisaNome").value.toLowerCase();
const medico = document.getElementById("filtroMedico").value;
const data = document.getElementById("filtroData").value;

consultas = consultas.filter(c => {

return (
(c.nome.toLowerCase().includes(nome) || nome === "") &&
(c.medico === medico || medico === "") &&
(c.data === data || data === "")
);

});

tabela.innerHTML = "";

consultas.forEach(c => {

tabela.innerHTML += `
<tr>
<td>${c.nome}</td>
<td>${c.especialidade}</td>
<td>${c.medico}</td>
<td>${c.data}</td>
<td>${c.hora}</td>
</tr>
`;

});

}
document.getElementById("pesquisaNome").addEventListener("input", mostrarConsultas);
document.getElementById("filtroMedico").addEventListener("change", mostrarConsultas);
document.getElementById("filtroData").addEventListener("change", mostrarConsultas);

function limparFiltros(){

document.getElementById("pesquisaNome").value = "";
document.getElementById("filtroMedico").value = "";
document.getElementById("filtroData").value = "";

mostrarConsultas();
}

function validarConsulta(novaConsulta, consultas){

// 1. conflito de médico + hora
let conflitoMedico = consultas.find(c =>
c.medico === novaConsulta.medico &&
c.data === novaConsulta.data &&
c.hora === novaConsulta.hora
);

// 2. paciente duplicado no mesmo horário
let conflitoPaciente = consultas.find(c =>
c.nome === novaConsulta.nome &&
c.data === novaConsulta.data &&
c.hora === novaConsulta.hora
);

if(conflitoMedico){
return "❌ Médico já tem consulta marcada nesta hora.";
}

if(conflitoPaciente){
return "❌ Paciente já tem uma consulta neste horário.";
}

return "OK";
}