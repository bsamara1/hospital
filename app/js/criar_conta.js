const form = document.getElementById("criarContaForm");
const mensagem = document.getElementById("mensagem");

form.addEventListener("submit", async (e) => {

    e.preventDefault();

    const utilizador = document.getElementById("utilizador").value.trim();
    const email = document.getElementById("email").value.trim();
    const telefone = document.getElementById("telefone").value.trim();
    const senha = document.getElementById("senha").value;
    const confirmarSenha = document.getElementById("confirmarSenha").value;

    mensagem.innerHTML = "";

    if (utilizador === "" || email === "" || telefone === "" || senha === "") {

        mensagem.style.color = "red";
        mensagem.innerHTML = "Preencha todos os campos.";

        return;
    }

    if (senha !== confirmarSenha) {

        mensagem.style.color = "red";
        mensagem.innerHTML = "As palavras-passe não coincidem.";

        return;
    }

    try {

        const resposta = await fetch("http://127.0.0.1:5000/criar_conta", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                utilizador,
                email,
                telefone,
                senha

            })

        });

        const dados = await resposta.json();

        mensagem.innerHTML = dados.mensagem;

        if (dados.sucesso) {

            mensagem.style.color = "green";

            form.reset();

        } else {

            mensagem.style.color = "red";

        }

    } catch (erro) {

        mensagem.style.color = "red";
        mensagem.innerHTML = "Erro ao ligar ao servidor.";

    }

});