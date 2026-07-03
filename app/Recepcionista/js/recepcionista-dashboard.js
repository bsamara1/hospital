async function initRecepcionistaDashboard() {
    marcarSidebarAtiva("index");

    const consultas = await loadConsultas();
    const pacientes = await loadPacientes();

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const consultasHoje = consultas.filter(c => {
        const data = parseDate(c.data);
        return data && data.getTime() === hoje.getTime();
    }).length;

    const pendentes = consultas.filter(c => c.estado === "pendente").length;
    const canceladas = consultas.filter(c => c.estado === "cancelada").length;
    const medicosServico = new Set(consultas.filter(c => {
        const data = parseDate(c.data);
        return data && data >= hoje && (c.estado === "confirmada" || c.estado === "pendente");
    }).map(c => c.medico)).size;
    const presentes = consultas.filter(c => {
        const data = parseDate(c.data);
        return data && data.getTime() === hoje.getTime() && c.estado === "presente";
    }).length;

    document.getElementById("consultasHoje").innerText = consultasHoje;
    document.getElementById("pacientesTotal").innerText = pacientes.length;
    document.getElementById("pendentes").innerText = pendentes;
    document.getElementById("canceladas").innerText = canceladas;
    document.getElementById("medicosServico").innerText = medicosServico;
    document.getElementById("presentes").innerText = presentes;

    renderProximasConsultas(consultas);
    renderAvisosDoDia(consultas);
    renderAgendaMedica(consultas);
    renderUltimasNotificacoes(consultas);
}

function renderProximasConsultas(consultas) {
    const lista = document.getElementById("proximasConsultas");
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const proximas = consultas
        .filter(c => {
            const data = parseDate(c.data);
            return data && data >= hoje && (c.estado === "confirmada" || c.estado === "pendente");
        })
        .sort((a, b) => compareConsultas(a, b))
        .slice(0, 5);

    if (proximas.length === 0) {
        lista.innerHTML = "<p>Nenhuma próxima consulta encontrada.</p>";
        return;
    }

    lista.innerHTML = proximas.map(c => `
        <div class="item-row">
            <span class="item-time">${escapeHtml(c.hora)}</span>
            <span>${escapeHtml(c.paciente)}</span>
            <span>${escapeHtml(c.medico)}</span>
            <span class="badge ${c.estado}">${capitalize(c.estado)}</span>
        </div>
    `).join("");
}

function renderAvisosDoDia(consultas) {
    const container = document.getElementById("avisosDoDia");
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const confirmacoesPendentes = consultas.filter(c => c.estado === "pendente").length;
    const conflitos = countConflitos(consultas);
    const canceladasHoje = consultas.filter(c => {
        const data = parseDate(c.data);
        return data && data.getTime() === hoje.getTime() && c.estado === "cancelada";
    }).length;

    const avisos = [
        `${confirmacoesPendentes} consultas aguardam confirmação`,
        `${conflitos} conflito${conflitos === 1 ? "" : "s"} de horário detectado${conflitos === 1 ? "" : "s"}`,
        `${canceladasHoje} consulta${canceladasHoje === 1 ? "" : "s"} cancelada${canceladasHoje === 1 ? "" : "s"} hoje`
    ];

    container.innerHTML = `<ul class="warning-list">${avisos.map(aviso => `<li>${aviso}</li>`).join("")}</ul>`;
}

function renderAgendaMedica(consultas) {
    const container = document.getElementById("agendaMedicaResumo");
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const agenda = consultas
        .filter(c => {
            const data = parseDate(c.data);
            return data && data >= hoje && (c.estado === "confirmada" || c.estado === "pendente");
        })
        .sort((a, b) => compareConsultas(a, b))
        .slice(0, 5);

    if (agenda.length === 0) {
        container.innerHTML = "<p>Sem agenda médica disponível.</p>";
        return;
    }

    container.innerHTML = agenda.map(c => `
        <div class="item-row">
            <span class="item-time">${escapeHtml(c.hora)}</span>
            <span>${escapeHtml(c.medico)}</span>
            <span>${escapeHtml(c.especialidade || "")}</span>
            <span class="badge ${c.estado}">${capitalize(c.estado)}</span>
        </div>
    `).join("");
}

function renderUltimasNotificacoes(consultas) {
    const lista = document.getElementById("ultimasNotificacoes");
    const eventos = consultas
        .slice()
        .sort((a, b) => compareConsultas(b, a))
        .map(c => {
            if (c.estado === "confirmada") return `Consulta confirmada: ${c.paciente}`;
            if (c.estado === "pendente") return `Consulta pendente: ${c.paciente}`;
            if (c.estado === "presente") return `Presença confirmada: ${c.paciente}`;
            if (c.estado === "cancelada") return `Consulta cancelada: ${c.paciente}`;
            return `Consulta atualizada: ${c.paciente}`;
        })
        .slice(0, 5);

    if (eventos.length === 0) {
        lista.innerHTML = "<p>Sem notificações recentes.</p>";
        return;
    }

    lista.innerHTML = `<div class="notification-list">${eventos.map(ev => `<div>${escapeHtml(ev)}</div>`).join("")}</div>`;
}

function countConflitos(consultas) {
    const agendas = {};
    consultas.forEach(c => {
        if (!c.medico || !c.data || !c.hora) return;
        const key = `${c.medico}|${c.data}|${c.hora}`;
        agendas[key] = (agendas[key] || 0) + 1;
    });
    return Object.values(agendas).filter(count => count > 1).length;
}

window.addEventListener("DOMContentLoaded", initRecepcionistaDashboard);
