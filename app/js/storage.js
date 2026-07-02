const CHAVE = "consultas";

function obterConsultas() {
    return JSON.parse(localStorage.getItem(CHAVE)) || [];
}

function guardarConsultas(lista) {
    localStorage.setItem(CHAVE, JSON.stringify(lista));
}