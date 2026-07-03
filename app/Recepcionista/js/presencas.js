let consultas = [];

async function initPresencas() {
    marcarSidebarAtiva("presencas");
    consultas = await loadConsultas();
    renderPresencas();
}

function consultasHoje() {
    const hoje = hojeISO();
    return consultas.filter(c =>
        c.data === hoje &&
        (c.estado === "confirmada" || c.estado === "pendente" || c.estado === "presente")
    );
}

function renderPresencas() {
    const lista = consultasHoje().sort((a, b) => a.hora.localeCompare(b.hora));
    const tbody = document.getElementById("tabelaPresencas");

    document.getElementById("totalHoje").innerText = lista.length;
    document.getElementById("aguardam").innerText = lista.filter(c => c.estado !== "presente").length;
    document.getElementById("totalPresentes").innerText = lista.filter(c => c.estado === "presente").length;

    if (lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:20px;color:#777;">Nenhum paciente agendado para hoje.</td></tr>`;
        return;
    }

    tbody.innerHTML = lista.map(c => `
        <tr>
            <td>${escapeHtml(c.paciente)}</td>
            <td>${escapeHtml(c.medico)} — ${escapeHtml(c.especialidade || "")}</td>
            <td>${escapeHtml(c.hora)}</td>
            <td>
                ${c.estado === "presente"
                    ? '<span class="presence-done">Presente</span>'
                    : `<button class="confirm" type="button" onclick="confirmarPresenca(${c.id})">Confirmar</button>`
                }
            </td>
        </tr>
    `).join("");
}

async function confirmarPresenca(id) {
    try {
        await atualizarConsulta(id, { estado: "presente" });
        consultas = await loadConsultas();
        renderPresencas();
    } catch (error) {
        alert(error.message || "Não foi possível confirmar a presença.");
    }
}

window.addEventListener("DOMContentLoaded", initPresencas);
