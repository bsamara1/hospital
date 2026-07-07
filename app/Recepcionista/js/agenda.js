let consultas = [];
let medicos = [];
let especialidades = [];

async function initAgenda() {
    if (typeof marcarSidebarAtiva === "function") {
        marcarSidebarAtiva("agenda");
    }
    
    // Carrega consultas, médicos e o ficheiro especialidades.json em simultâneo
    try {
        const resEsp = await fetch('../data/especialidades.json').catch(() => null);
        if (resEsp && resEsp.ok) {
            especialidades = await resEsp.json();
        }
    } catch (e) {
        console.log("Não foi possível carregar especialidades.json, usando fallback dos médicos.");
    }

    [consultas, medicos] = await Promise.all([loadConsultas(), loadMedicos()]);

    // Define o input de data para o dia de hoje por padrão
    if (!document.getElementById("agendaData").value) {
        document.getElementById("agendaData").value = hojeISO();
    }
    
    preencherFiltros();

    document.getElementById("agendaData").addEventListener("change", renderAgenda);
    document.getElementById("filtroEspecialidade").addEventListener("change", onEspecialidadeChange);
    document.getElementById("filtroMedico").addEventListener("change", renderAgenda);

    renderAgenda();
}

function preencherFiltros() {
    const selEsp = document.getElementById("filtroEspecialidade");
    
    // Se o JSON de especialidades foi carregado com sucesso, usa-o. Caso contrário, faz fallback dos médicos.
    let listaEsp = [];
    if (especialidades && especialidades.length > 0) {
        listaEsp = especialidades.map(e => typeof e === 'object' ? e.nome : e);
    } else {
        listaEsp = [...new Set(medicos.map(m => m.especialidade).filter(Boolean))];
    }

    selEsp.innerHTML = '<option value="">Todas as especialidades</option>' +
        listaEsp.map(e => `<option value="${escapeHtml(e)}">${escapeHtml(e)}</option>`).join("");
    
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
    const dataSelected = document.getElementById("agendaData").value;
    const espSelected = document.getElementById("filtroEspecialidade").value;
    const medicoSelected = document.getElementById("filtroMedico").value;

    // Filtra médicos ativos
    let medicosFiltrados = medicos.filter(m => m.status === "ativo");
    if (espSelected) medicosFiltrados = medicosFiltrados.filter(m => m.especialidade === espSelected);
    if (medicoSelected) medicosFiltrados = medicosFiltrados.filter(m => m.nome === medicoSelected);

    // Filtra as consultas marcadas para o dia (Removendo espaços para evitar falhas como Dr.Carlos vs Dr. Carlos)
    const consultasDia = consultas.filter(c => {
        if (c.data !== dataSelected || c.estado === "cancelada") return false;
        if (espSelected && c.especialidade !== espSelected) return false;
        if (medicoSelected) {
            return c.medico.replace(/\s+/g, '').toLowerCase() === medicoSelected.replace(/\s+/g, '').toLowerCase();
        }
        return true;
    });

    // Cria um mapa de chaves únicas de ocupação eliminando os espaços em branco internos
    const chavesOcupadas = new Set(consultasDia.map(c => {
        return `${c.medico.replace(/\s+/g, '').toLowerCase()}|${c.hora.trim()}`;
    }));

    const slotsLivres = [];
    const slotsOcupadosParaVisualizacao = [];

    // Percorre cada médico e verifica os seus horários configurados
    medicosFiltrados.forEach(m => {
        const medicoChave = m.nome.replace(/\s+/g, '').toLowerCase();
        const horarios = (m.horarios || "").split(",").map(h => h.trim()).filter(Boolean);
        
        horarios.forEach(hora => {
            const compositeKey = `${medicoChave}|${hora}`;
            
            if (chavesOcupadas.has(compositeKey)) {
                slotsOcupadosParaVisualizacao.push({ hora, medico: m.nome, especialidade: m.especialidade });
            } else {
                slotsLivres.push({ hora, medico: m.nome, especialidade: m.especialidade });
            }
        });
    });

    // Atualiza os contadores no topo
    document.getElementById("medicosDisponiveis").innerText = medicosFiltrados.length;
    document.getElementById("horariosLivres").innerText = slotsLivres.length;
    document.getElementById("horariosOcupados").innerText = slotsOcupadosParaVisualizacao.length;

    // Renderiza as tabelas e blocos estruturados
    renderCalendarioDia(dataSelected, consultasDia);
    renderListaMedicos(medicosFiltrados);
    renderSlotsVisual("horariosDisponiveis", slotsLivres);
    renderSlotsVisual("horariosOcupadosLista", slotsOcupadosParaVisualizacao);
}

function renderCalendarioDia(data, consultasDia) {
    const container = document.getElementById("calendarioDia");
    if (consultasDia.length === 0) {
        container.innerHTML = `<p style="color:#64748b; font-size:14px; text-align:center; padding:15px 0;">Nenhuma consulta marcada para este dia.</p>`;
        return;
    }

    container.innerHTML = `
        <table class="consultas-table">
            <thead>
                <tr>
                    <th>Hora</th>
                    <th>Médico</th>
                    <th>Especialidade</th>
                    <th>Estado</th>
                </tr>
            </thead>
            <tbody>
                ${consultasDia.sort((a,b) => a.hora.localeCompare(b.hora)).map(c => `
                    <tr>
                        <td style="font-weight:600; color:#0b2a4a;">${escapeHtml(c.hora)}</td>
                        <td>${escapeHtml(c.medico)}</td>
                        <td>${escapeHtml(c.especialidade || "")}</td>
                        <td><span class="badge ${c.estado.toLowerCase()}">${capitalize(c.estado)}</span></td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
}

function renderListaMedicos(lista) {
    const container = document.getElementById("listaMedicos");
    if (lista.length === 0) {
        container.innerHTML = `<p style="color:#64748b; font-size:14px; text-align:center; padding:15px 0;">Nenhum médico ativo disponível.</p>`;
        return;
    }

    container.innerHTML = `
        <table class="consultas-table">
            <thead>
                <tr>
                    <th>Médico</th>
                    <th>Especialidade</th>
                    <th>Estado</th>
                </tr>
            </thead>
            <tbody>
                ${lista.map(m => `
                    <tr>
                        <td style="font-weight:600; color:#0b2a4a;">${escapeHtml(m.nome)}</td>
                        <td>${escapeHtml(m.especialidade)}</td>
                        <td><span class="badge disponível">Disponível</span></td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
}

function renderSlotsVisual(containerId, items) {
    const container = document.getElementById(containerId);
    if (items.length === 0) {
        container.innerHTML = `<p style="color:#64748b; font-size:14px; text-align:center; padding:10px 0; grid-column:1/-1;">Nenhum horário.</p>`;
        return;
    }

    container.innerHTML = items.map(item => `
        <div class="slot-item">
            <strong style="display:block; font-size:15px;">${escapeHtml(item.hora)}</strong>
            <span style="display:block; font-size:11px; opacity:0.8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(item.medico)}</span>
        </div>
    `).join("");
}

// Funções Utilitárias de proteção (Fallback caso não venham do ficheiro common)
function hojeISO() { return new Date().toISOString().split('T')[0]; }
function escapeHtml(str) { return str ? String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') : ''; }
function capitalize(str) { return str ? str.charAt(0).toUpperCase() + str.slice(1) : ''; }

window.addEventListener("DOMContentLoaded", initAgenda);