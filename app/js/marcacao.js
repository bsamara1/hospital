const form = document.getElementById("formConsulta");
const tabela = document.querySelector("#tabelaConsultas tbody");

// Executa a listagem assim que a página abre
listarConsultas();

form.addEventListener("submit", function(e) {
    e.preventDefault();

    // 1. Captura os dados preenchidos no formulário
    const consulta = {
        id: Date.now(), // Gera um ID único baseado no tempo atual
        paciente: document.getElementById("nome").value,
        especialidade: document.getElementById("especialidade").value,
        medico: document.getElementById("medico").value,
        data: document.getElementById("data").value,
        hora: document.getElementById("hora").value,
        estado: "🟢 Confirmada" // Estado padrão inicial
    };

    // 2. Obtém a lista atual, adiciona a nova consulta e guarda tudo no LocalStorage
    const consultas = obterConsultas();
    consultas.push(consulta);
    guardarConsultas(consultas);

    // 3. Atualiza a tabela da própria página de marcação imediatamente
    listarConsultas();

    // 4. Mostra a mensagem de confirmação na tela
    alert(`🎉 Consulta marcada com sucesso!\n\n🔹 Especialidade: ${consulta.especialidade}\n🔹 Médico: ${consulta.medico}\n🔹 Data: ${consulta.data}\n🔹 Hora: ${consulta.hora}`);

    // Limpa o formulário para uma nova marcação
    form.reset();
});

function listarConsultas() {
    if (!tabela) return;
    tabela.innerHTML = "";

    const consultas = obterConsultas();

    // Lista apenas as que não foram canceladas nesta tabela
    const ativas = consultas.filter(c => c.estado !== "🔴 Cancelada");

    if (ativas.length === 0) {
        tabela.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#718096;">Nenhuma consulta marcada.</td></tr>`;
        return;
    }

    ativas.forEach(c => {
        tabela.innerHTML += `
        <tr>
            <td>${c.paciente}</td>
            <td>${c.especialidade}</td>
            <td>${c.medico}</td>
            <td>${c.data}</td>
            <td>${c.hora}</td>
            <td><strong>${c.estado}</strong></td>
        </tr>`;
    });
}