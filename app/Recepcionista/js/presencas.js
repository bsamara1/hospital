let consultasPresenca = [];

async function initPresencas() {
    marcarSidebarAtiva("presencas");
    consultasPresenca = await loadConsultas();
    renderPresencas();
}

function consultasHojeFiltradas() {
    const hoje = hojeISO();
    return consultasPresenca.filter(c =>
        c.data === hoje &&
        (c.estado === "confirmada" || c.estado === "pendente" || c.estado === "presente")
    );
}

function renderPresencas() {
    const lista = consultasHojeFiltradas().sort((a, b) => a.hora.localeCompare(b.hora));
    const tbody = document.getElementById("tabelaPresencas");
    if (!tbody) return;

    document.getElementById("totalHoje").innerText = lista.length;
    document.getElementById("aguardam").innerText = lista.filter(c => c.estado !== "presente").length;
    document.getElementById("totalPresentes").innerText = lista.filter(c => c.estado === "presente").length;

    if (lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:20px;color:#777;">Sem agendamentos confirmados para a data de hoje.</td></tr>`;
        return;
    }

    tbody.innerHTML = lista.map(c => `
        <tr>
            <td><b>${escapeHtml(c.paciente)}</b></td>
            <td>Dr(a). ${escapeHtml(c.medico)} — <span style="color:#666;">${escapeHtml(c.especialidade || "Geral")}</span></td>
            <td><b>${escapeHtml(c.hora)}</b></td>
            <td>
                ${c.estado === "presente"
                    ? '<span class="presence-done"><i class="fa fa-check-circle"></i> Confirmado</span>'
                    : `<button class="confirm-btn" type="button" onclick="darEntradaPaciente(${c.id})">Registar Entrada</button>`
                }
            </td>
        </tr>
    `).join("");
}

async function darEntradaPaciente(id) {
    try {
        await atualizarConsulta(id, { estado: "presente" });
        consultasPresenca = await loadConsultas();
        renderPresencas();
    } catch (error) {
        alert(error.message || "Não foi possível registar o check-in do paciente.");
    }
}

window.addEventListener("DOMContentLoaded", initPresencas);