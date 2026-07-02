document.getElementById("recuperarForm").addEventListener("submit", async function(e){

    e.preventDefault();

    const email = document.getElementById("email").value.trim();

    const resposta = await fetch("http://127.0.0.1:5000/esqueceu_senha",{

        method:"POST",

        headers:{
            "Content-Type":"application/json"
        },

        body:JSON.stringify({
            email:email
        })

    });

    const dados = await resposta.json();

        if(dados.sucesso){

        // Guarda o email para usar na verificação
        localStorage.setItem("emailRecuperacao", email);

        // Vai para a página onde o utilizador escreve o código
        window.location.href = "verificar_codigo.html";

    }else{

        document.getElementById("mensagem").innerHTML = dados.mensagem;

    }

});