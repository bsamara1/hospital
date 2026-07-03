const CHAVE = "consultas";

// Procura as consultas guardadas. Se não existir nenhuma, devolve um array vazio []
function obterConsultas() {
    return JSON.parse(localStorage.getItem(CHAVE)) || [];
}

// Grava a lista atualizada no LocalStorage do navegador
function guardarConsultas(lista) {
    localStorage.setItem(CHAVE, JSON.stringify(lista));
}

// Função global para o botão de Terminar Sessão
function logout() {
    if (confirm("Deseja realmente terminar a sua sessão?")) {
        window.location.href = "index.html";
    }
}