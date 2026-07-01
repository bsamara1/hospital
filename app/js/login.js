document.getElementById("loginForm").addEventListener("submit", async function (e) {

    e.preventDefault();

    const utilizador = document.getElementById("utilizador").value.trim();
    const senha = document.getElementById("senha").value;

    try {

        const resposta = await fetch("http://127.0.0.1:5000/login", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                utilizador: utilizador,
                senha: senha

            })

        });

        const dados = await resposta.json();

        if (dados.sucesso) {

            localStorage.setItem("utilizador", utilizador);

            // 👇 AQUI É ONDE ENTRA O CÓDIGO
            if (dados.tipo === "admin") {
                window.location.href = "admin.html";
            } else {
                window.location.href = "index.html";
            }

        } else {

            document.getElementById("mensagem").style.color = "red";
            document.getElementById("mensagem").innerHTML = dados.mensagem;
        }

    } catch (erro) {

        document.getElementById("mensagem").style.color = "red";
        document.getElementById("mensagem").innerHTML = "Erro ao comunicar com o servidor.";

    }

});