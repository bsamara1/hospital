let consultasCache = [];
let medicosCache = [];

async function initMarcacao() {
    consultasCache = await obterConsultas();
    medicosCache = await obterMedicosInfo();

    const selectMedico = document.getElementById("filtroMedico");
    selectMedico.innerHTML = '<option value="">Todos os médicos</option>' +
        medicosCache.map(m => `<option value="${m.nome}">${m.nome}</option>`).join("");

    document.getElementById("pesquisaNome").addEventListener("input", renderTabela);
    selectMedico.addEventListener("change", renderTabela);
    document.getElementById("filtroData").addEventListener("change", renderTabela);

    renderTabela();
}

function renderTabela() {
    const tbody = document.querySelector("#tabelaConsultas tbody");
    const termoNome = document.getElementById("pesquisaNome").value.trim().toLowerCase();
    const medico = document.getElementById("filtroMedico").value;
    const data = document.getElementById("filtroData").value;

    const filtradas = consultasCache.filter(c => {
        const bateNome = !termoNome || (c.paciente || "").toLowerCase().includes(termoNome);
        const bateMedico = !medico || c.medico === medico;
        const bateData = !data || c.data === data;
        return bateNome && bateMedico && bateData;
    });

    tbody.innerHTML = "";
    if (filtradas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:#888;">Nenhuma consulta encontrada.</td></tr>`;
        return;
    }

    filtradas.forEach(c => {
        tbody.innerHTML += `
            <tr>
                <td>${c.paciente}</td>
                <td>${c.especialidade || ""}</td>
                <td>${c.medico}</td>
                <td>${c.data}</td>
                <td>${c.hora}</td>
            </tr>
        `;
    });
}

function limparFiltros() {
    document.getElementById("pesquisaNome").value = "";
    document.getElementById("filtroMedico").value = "";
    document.getElementById("filtroData").value = "";
    renderTabela();
}

window.onload = initMarcacao;
