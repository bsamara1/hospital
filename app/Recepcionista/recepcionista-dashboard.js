async function initRecepcionistaDashboard() {
    const consultas = await loadConsultas();
    const pacientes = await loadPacientes();

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const consultasHoje = consultas.filter(c => parseDate(c.data) && parseDate(c.data).getTime() === hoje.getTime()).length;
    const pendentes = consultas.filter(c => c.estado === "pendente").length;
    const canceladas = consultas.filter(c => c.estado === "cancelada").length;
    const medicosServico = new Set(consultas.filter(c => {
        const data = parseDate(c.data);
        return data && data >= hoje && (c.estado === "confirmada" || c.estado === "pendente");
    }).map(c => c.medico)).size;
    const presentes = consultas.filter(c => {
        const data = parseDate(c.data);
        return data && data.getTime() === hoje.getTime() && c.estado === "confirmada";
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
    renderUltimosRegistos(pacientes);
    renderUltimasNotificacoes(consultas);
}

async function loadConsultas() {
    try {
        const res = await fetch("../../consultas.txt");
        if (!res.ok) throw new Error();
        return await res.json();
    } catch (error) {
        console.warn("Não foi possível carregar consultas.txt:", error);
        return [];
    }
}

async function loadPacientes() {
    try {
        const res = await fetch("../../utilizadores.txt");
        if (!res.ok) throw new Error();
        const text = await res.text();
        return parsePacientes(text);
    } catch (error) {
        console.warn("Não foi possível carregar utilizadores.txt:", error);
        return [];
    }
}

function parsePacientes(text) {
    return text
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line && !line.startsWith("admin;") && !line.startsWith("rececao;") && line.includes("@"))
        .map(line => {
            const parts = line.split(";").map(p => p.trim());
            return {
                nome: parts[0] || "",
                email: parts[1] || "",
                telefone: parts[2] || ""
            };
        });
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
        lista.innerHTML = '<p>Nenhuma próxima consulta encontrada.</p>';
        return;
    }

    lista.innerHTML = proximas.map(c => `
        <div class="item-row">
            <span class="item-time">${c.hora}</span>
            <span class="item-paciente">${c.paciente}</span>
            <span class="item-medico">${c.medico}</span>
            <span class="item-estado ${c.estado}">${capitalize(c.estado)}</span>
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
        `${conflitos} conflito${conflitos === 1 ? "o" : "s"} de horário detectado${conflitos === 1 ? "" : "s"}`,
        `${canceladasHoje} consultas canceladas hoje`
    ].filter(Boolean);

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
        container.innerHTML = '<p>Sem agenda médica disponível.</p>';
        return;
    }

    container.innerHTML = agenda.map(c => `<div class="agenda-item"><strong>${c.hora}</strong> - ${c.medico}</div>`).join("");
}

function renderUltimosRegistos(pacientes) {
    const container = document.getElementById("ultimosRegistos");
    const ultimos = pacientes.slice(-3).reverse();
    if (ultimos.length === 0) {
        container.innerHTML = '<p>Sem registos recentes.</p>';
        return;
    }
    container.innerHTML = `<div class="pill-list">${ultimos.map(p => `<span>${p.nome}</span>`).join("")}</div>`;
}

function renderUltimasNotificacoes(consultas) {
    const lista = document.getElementById("ultimasNotificacoes");
    const eventos = consultas
        .slice()
        .sort((a, b) => compareConsultas(b, a))
        .map(c => {
            if (c.estado === "confirmada") return `Consulta confirmada: ${c.paciente}`;
            if (c.estado === "pending" || c.estado === "pendente") return `Consulta pendente: ${c.paciente}`;
            return `Consulta cancelada: ${c.paciente}`;
        })
        .slice(0, 3);

    if (eventos.length === 0) {
        lista.innerHTML = '<p>Sem notificações recentes.</p>';
        return;
    }

    lista.innerHTML = `<div class="notification-list">${eventos.map(ev => `<div>${ev}</div>`).join("")}</div>`;
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

function parseDate(value) {
    if (!value) return null;
    const parts = value.split("-");
    if (parts.length !== 3) return null;
    return new Date(`${parts[0]}-${parts[1]}-${parts[2]}`);
}

function compareConsultas(a, b) {
    const dataA = parseDate(a.data);
    const dataB = parseDate(b.data);
    if (!dataA || !dataB) return 0;
    if (dataA.getTime() !== dataB.getTime()) return dataA - dataB;
    return a.hora.localeCompare(b.hora);
}

function capitalize(text) {
    if (!text) return text;
    return text.charAt(0).toUpperCase() + text.slice(1);
}

window.addEventListener("DOMContentLoaded", initRecepcionistaDashboard);
