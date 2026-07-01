const utilizador = JSON.parse(localStorage.getItem("utilizador"));

if (!utilizador) {
window.location.href = "login.html";
}
const consultas = carregar("consultas") || [];

const totalConsultas = document.getElementById("totalConsultas");
const consultasHoje = document.getElementById("consultasHoje");
const tabela = document.getElementById("ultimasConsultas");

// TOTAL
totalConsultas.innerText = consultas.length;

// CONSULTAS DE HOJE
const hoje = new Date().toISOString().split("T")[0];

const hojeFiltradas = consultas.filter(c => c.data === hoje);

consultasHoje.innerText = hojeFiltradas.length;

// ÚLTIMAS CONSULTAS
const ultimas = consultas.slice(-5).reverse();

tabela.innerHTML = "";

ultimas.forEach(c => {
tabela.innerHTML += `
<tr>
<td>${c.nome}</td>
<td>${c.medico}</td>
<td>${c.data}</td>
<td>${c.hora}</td>
</tr>
`;
});

const canvas = document.getElementById("graficoConsultas");
const ctx = canvas.getContext("2d");

const consultas = carregar("consultas") || [];

const dias = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

let dados = [0,0,0,0,0,0,0];

// Simular distribuição por dia da semana
consultas.forEach(c => {
let dia = new Date(c.data).getDay();
if(dia === 0) dia = 6; else dia -= 1;
dados[dia]++;
});

// Desenhar gráfico simples
ctx.beginPath();
ctx.moveTo(0, 150);

dados.forEach((valor, i) => {
ctx.lineTo(i * 60, 150 - valor * 10);
});

ctx.strokeStyle = "#005baa";
ctx.stroke();