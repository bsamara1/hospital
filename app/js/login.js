window.addEventListener("DOMContentLoaded", () => {
  localStorage.removeItem("utilizador");

  const form = document.getElementById("loginForm");
  if (!form) {
    console.error("loginForm não encontrado");
    return;
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value;
    const lembrar = document.getElementById("lembrar").checked;

    try {
      const resposta = await fetch("http://127.0.0.1:5000/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, senha }),
      });

      const dados = await resposta.json();

      if (dados.sucesso) {
        // --- CASO DE SUCESSO ---
        if (lembrar) {
          localStorage.setItem("email", email);
        } else {
          localStorage.removeItem("email");
        }

        const utilizador = { ...dados, email };
        localStorage.setItem("utilizador", JSON.stringify(utilizador));

        // GUARDA UTILIZADOR LOGADO PARA O SISTEMA
        localStorage.setItem(
          "utilizadorLogado",
          JSON.stringify({
            email: email,
            nome: dados.nome,
            tipo: dados.tipo,
          }),
        );

        // REDIRECIONAMENTO CORRETO CONFORME O PERFIL
        if (dados.tipo === "admin") {
          window.location.href = "./admin/index.html";
        } else if (dados.tipo === "rececao") {
          window.location.href = "./Recepcionista/index.html";
        } else if (dados.tipo === "medico") {
          window.location.href = "./medicos/index.html";
        } else {
          window.location.href = "./pacientes/index.html";
        }

      } else {
        // --- CASO DE ERRO ---
        // Só entra aqui se o backend responder que o sucesso é falso
        document.getElementById("mensagem").style.color = "red";
        document.getElementById("mensagem").innerHTML = dados.mensagem || "Email ou palavra-passe incorretos.";
      }
    } catch (erro) {
      document.getElementById("mensagem").style.color = "red";
      document.getElementById("mensagem").innerHTML = "Erro ao comunicar com o servidor.";
      console.error(erro);
    }
  });
});

window.addEventListener("load", () => {
  const emailGuardado = localStorage.getItem("email");
  
  if (emailGuardado) {
    document.getElementById("email").value = emailGuardado;
    document.getElementById("lembrar").checked = true;
  } else {
    document.getElementById("email").value = "";
    document.getElementById("lembrar").checked = false;
  }
  
  // Limpa sempre o campo da senha por segurança ao recarregar
  document.getElementById("senha").value = "";
});