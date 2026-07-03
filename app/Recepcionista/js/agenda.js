let consultas = [];
let medicos = [];

async function initAgenda() {
    marcarSidebarAtiva("agenda");
    [consultas, medicos] = await Promise.all([loadConsultas(), loadMedicos()]);

    document.getElementById("agendaData").value = hojeISO();
    preencherFiltros();

    document.getElementById("agendaData").addEventListener("change", renderAgenda);
    document.getElementById("filtroEspecialidade").addEventListener("change", onEspecialidadeChange);
    document.getElementById("filtroMedico").addEventListener("change", renderAgenda);

    renderAgenda();
}

function preencherFiltros() {
    const especialidades = [...new Set(medicos.map(m => m.especialidade).filter(Boolean))];
    const selEsp = document.getElementById("filtroEspecialidade");
    selEsp.innerHTML = '<option value="">Todas as especialidades</option>' +
        especialidades.map(e => `<option value="${escapeHtml(e)}">${escapeHtml(e)}</option>`).join("");
    onEspecialidadeChange();
}

function onEspecialidadeChange() {
    const esp = document.getElementById("filtroEspecialidade").value;
    const filtrados = medicos.filter(m => !esp || m.especialidade === esp);
    const selMed = document.getElementById("filtroMedico");
    selMed.innerHTML = '<option value="">Todos os médicos</option>' +
        filtrados.map(m => `<option value="${escapeHtml(m.nome)}">${escapeHtml(m.nome)}</option>`).join("");
    renderAgenda();
}

function renderAgenda() {
    const data = document.getElementById("agendaData").value;
    const esp = document.getElementById("filtroEspecialidade").value;
    const medicoFiltro = document.getElementById("filtroMedico").value;

    let medicosFiltrados = medicos.filter(m => m.status !== "inativo");
    if (esp) medicosFiltrados = medicosFiltrados.filter(m => m.especialidade === esp);
    if (medicoFiltro) medicosFiltrados = medicosFiltrados.filter(m => m.nome === medicoFiltro);

    const consultasDia = consultas.filter(c =>
        c.data === data &&
        c.estado !== "cancelada" &&
        (!medicoFiltro || c.medico === medicoFiltro) &&
        (!esp || c.especialidade === esp)
    );

    const slotsOcupados = new Set(consultasDia.map(c => `${c.medico}|${c.hora}`));
    const todosSlots = [];
    const slotsLivres = [];

    medicosFiltrados.forEach(m => {
        const horarios = (m.horarios || "").split(",").map(h => h.trim()).filter(Boolean);
        horarios.forEach(hora => {
            const key = `${m.nome}|${hora}`;
            todosSlots.push({ medico: m.nome, hora, ocupado: slotsOcupados.has(key) });
            if (!slotsOcupados.has(key)) {
                slotsLivres.push({ medico: m.nome, hora, especialidade: m.especialidade });
            }
        });
    });

    document.getElementById("medicosDisponiveis").innerText = medicosFiltrados.length;
    document.getElementById("horariosLivres").innerText = slotsLivres.length;
    document.getElementById("horariosOcupados").innerText = slotsOcupados.size;

    renderCalendarioDia(data, consultasDia);
    renderListaMedicos(medicosFiltrados);
    renderSlots("horariosDisponiveis", slotsLivres, "livre");
    renderSlots("horariosOcupadosLista", consultasDia.map(c => ({
        medico: c.medico,
        hora: c.hora,
        especialidade: c.especialidade
    })), "ocupado");
}

function renderCalendarioDia(data, consultasDia) {
    const container = document.getElementById("calendarioDia");
    const dataFmt = formatDate(data);

    if (consultasDia.length === 0) {
        container.innerHTML = `<p>Nenhuma consulta marcada para ${dataFmt}.</p>`;
        return;
    }

    container.innerHTML = consultasDia
        .sort((a, b) => a.hora.localeCompare(b.hora))
        .map(c => `
            <div class="item-row">
                <span class="item-time">${escapeHtml(c.hora)}</span>
                <span>${escapeHtml(c.medico)}</span>
                <span>${escapeHtml(c.especialidade || "")}</span>
                <span class="badge ${c.estado}">${capitalize(c.estado)}</span>
            </div>
        `).join("");
}

function renderListaMedicos(lista) {
    const container = document.getElementById("listaMedicos");
    if (lista.length === 0) {
        container.innerHTML = "<p>Nenhum médico disponível para os filtros selecionados.</p>";
        return;
    }

    container.innerHTML = lista.map(m => `
        <div class="item-row">
            <span>${escapeHtml(m.nome)}</span>
            <span>${escapeHtml(m.especialidade)}</span>
            <span class="badge confirmada">${m.status === "ativo" ? "Disponível" : capitalize(m.status)}</span>
        </div>
    `).join("");
}

function renderSlots(containerId, items, tipo) {
    const container = document.getElementById(containerId);
    if (items.length === 0) {
        container.innerHTML = `<p>Nenhum horário ${tipo === "livre" ? "disponível" : "ocupado"}.</p>`;
        return;
    }

    container.innerHTML = items.map(item => `
        <span class="slot ${tipo}">${escapeHtml(item.hora)} — ${escapeHtml(item.medico)}</span>
    `).join("");
}

window.addEventListener("DOMContentLoaded", initAgenda);
