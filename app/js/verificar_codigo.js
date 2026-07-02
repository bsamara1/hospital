const email = localStorage.getItem("emailRecuperacao");

document.getElementById("verificar").addEventListener("click", async function () {

    const codigo = document.getElementById("codigo").value.trim();

    const resposta = await fetch("http://127.0.0.1:5000/verificar_codigo", {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            email: email,
            codigo: codigo
        })

    });

    const dados = await resposta.json();

    if (dados.sucesso) {

        document.getElementById("novaSenha").style.display = "block";

    } else {

        alert(dados.mensagem);

    }

});


document.getElementById("guardarSenha").addEventListener("click", async function () {

    const senha1 = document.getElementById("senha1").value;
    const senha2 = document.getElementById("senha2").value;

    if (senha1 !== senha2) {
        alert("As palavras-passe não coincidem.");
        return;
    }

    const resposta = await fetch("http://127.0.0.1:5000/alterar_senha", {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            email: email,
            nova_senha: senha1
        })

    });

    const dados = await resposta.json();

    alert(dados.mensagem);

    if (dados.sucesso) {
        window.location.href = "login.html";
    }

});