async function initPrioridades() {
    const consultas = await obterConsultas();
    const ativas = consultas.filter(c => c.estado !== "cancelada" && c.estado !== "realizada");

    const porPrioridade = {
        urgente: ativas.filter(c => c.prioridade === "urgente"),
        alta: ativas.filter(c => c.prioridade === "alta"),
        media: ativas.filter(c => c.prioridade === "media"),
        baixa: ativas.filter(c => !c.prioridade || c.prioridade === "baixa")
    };

    document.getElementById("contadorUrgente").innerText = porPrioridade.urgente.length;
    document.getElementById("contadorAlta").innerText = porPrioridade.alta.length;
    document.getElementById("contadorMedia").innerText = porPrioridade.media.length;
    document.getElementById("contadorBaixa").innerText = porPrioridade.baixa.length;

    const ordemPrioridade = { urgente: 0, alta: 1, media: 2, baixa: 3 };
    const filaOrdenada = [...porPrioridade.urgente, ...porPrioridade.alta, ...porPrioridade.media, ...porPrioridade.baixa];

    const tbody = document.querySelector("#tabelaPrioridades tbody");
    tbody.innerHTML = "";

    if (filaOrdenada.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:#888;">Nenhuma consulta na fila de atendimento.</td></tr>`;
        return;
    }

    filaOrdenada.forEach(c => {
        tbody.innerHTML += `
            <tr>
                <td>${c.paciente}</td>
                <td>${c.medico}</td>
                <td>${c.especialidade || ""}</td>
                <td>${c.hora}</td>
                <td style="text-transform: capitalize;">${c.prioridade || "baixa"}</td>
            </tr>
        `;
    });
}

window.onload = initPrioridades;
