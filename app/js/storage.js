function guardar(chave,dados){

localStorage.setItem(chave,JSON.stringify(dados));

}

function carregar(chave){

return JSON.parse(localStorage.getItem(chave)) || [];

}