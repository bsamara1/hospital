let consultas = [];
let medicos = [];

/* =======================
CARREGAR MÉDICOS
======================= */
async function carregarMedicos() {
    const res = await fetch("../data/medicos.txt");
    const data = await res.text();
    medicos = JSON.parse(data);

    carregarListaMedicos();
}

/* =======================
CARREGAR CONSULTAS
======================= */
async function carregarConsultas() {
    const res = await fetch("../data/consultas.txt");
    const data = await res.text();

    consultas = JSON.parse(data);

    renderTabela();
    atualizarCards();
}

/* =======================
LISTA MÉDICOS
======================= */
function carregarListaMedicos() {

    const select = document.getElementById("medico");
    select.innerHTML = "";

    medicos
    .filter(m => m.status === "ativo")
    .forEach(m => {
        select.innerHTML += `
        <option value="${m.nome}">
            ${m.nome} - ${m.especialidade}
        </option>`;
    });
}

/* =======================
HORÁRIOS
======================= */
function obterHorarios(nome) {
    const medico = medicos.find(m => m.nome === nome);
    if (!medico) return [];
    return medico.horarios.split(",");
}

function carregarHorarios() {

    const medico = document.getElementById("medico").value;
    const data = document.getElementById("data").value;
    const hora = document.getElementById("hora");

    hora.innerHTML = "";

    if (!medico || !data) return;

    obterHorarios(medico).forEach(h => {
        hora.innerHTML += `<option>${h}</option>`;
    });
}

/* =======================
TABELA
======================= */
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
        <td><span class="${c.estado}">${c.estado}</span></td>
        <td>
            <button class="confirm" onclick="confirmar(${c.id})">✔</button>
            <button class="edit" onclick="reagendar(${c.id})">✏️</button>
            <button class="cancel" onclick="cancelar(${c.id})">❌</button>
        </td>
        </tr>`;
    });
}

/* =======================
CARDS
======================= */
function atualizarCards() {
    document.getElementById("pendentes").innerText =
    consultas.filter(c => c.estado==="pendente").length;

    document.getElementById("confirmadas").innerText =
    consultas.filter(c => c.estado==="confirmada").length;

    document.getElementById("canceladas").innerText =
    consultas.filter(c => c.estado==="cancelada").length;
}

/* =======================
AÇÕES
======================= */
function confirmar(id){
consultas = consultas.map(c=>c.id===id?{...c,estado:"confirmada"}:c);
renderTabela();atualizarCards();
}

function cancelar(id){
consultas = consultas.map(c=>c.id===id?{...c,estado:"cancelada"}:c);
renderTabela();atualizarCards();
}

function reagendar(id){
const d=prompt("Data");const h=prompt("Hora");
consultas=consultas.map(c=>c.id===id?{...c,data:d,hora:h}:c);
renderTabela();atualizarCards();
}

/* =======================
MODAL
======================= */
function abrirModal(){
document.getElementById("modal").style.display="flex";
}

function fecharModal(){
document.getElementById("modal").style.display="none";
}

/* =======================
GUARDAR
======================= */
function guardarConsulta(){

const nova = {
id:Date.now(),
paciente:paciente.value,
medico:medico.value,
especialidade:especialidade.value,
data:data.value,
hora:hora.value,
estado:"pendente"
};

consultas.push(nova);

renderTabela();
atualizarCards();
fecharModal();
}

/* =======================
INIT
======================= */
async function init(){
await carregarMedicos();
await carregarConsultas();
}

init();