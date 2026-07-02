const form = document.getElementById("criarContaForm");
const mensagem = document.getElementById("mensagem");

form.addEventListener("submit", async (e) => {

    e.preventDefault();

    const nome = document.getElementById("nome").value.trim();
    const bi = document.getElementById("bi").value.trim();
    const dataNascimento = document.getElementById("dataNascimento").value;
    const sexo = document.getElementById("sexo").value;
    const telefone = document.getElementById("telefone").value.trim();
    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value;
    const confirmarSenha = document.getElementById("confirmarSenha").value;

    mensagem.innerHTML = "";

    if (
        nome === "" ||
        bi === "" ||
        dataNascimento === "" ||
        sexo === "" ||
        telefone === "" ||
        email === "" ||
        senha === ""
    ) {
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
                nome,
                bi,
                dataNascimento,
                sexo,
                telefone,
                email,
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