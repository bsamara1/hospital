let notificacoes = [];

async function initNotificacoes() {
    marcarSidebarAtiva("notificacoes");
    await gerarNotificacoes();
    document.getElementById("filtroTipo").addEventListener("change", renderNotificacoes);
    renderNotificacoes();
}

async function gerarNotificacoes() {
    const [consultas, pacientes, medicos] = await Promise.all([
        loadConsultas(),
        loadPacientes(),
        loadMedicos()
    ]);

    notificacoes = [];

    consultas.forEach(c => {
        if (c.estado === "cancelada") {
            notificacoes.push({
                tipo: "cancelada",
                titulo: "Consulta cancelada",
                mensagem: `${c.paciente} — ${c.medico} em ${formatDate(c.data)} às ${c.hora}`,
                data: c.data
            });
        }
        if (c.estado === "pendente") {
            notificacoes.push({
                tipo: "reagendada",
                titulo: "Consulta reagendada ou pendente",
                mensagem: `${c.paciente} aguarda confirmação (${formatDate(c.data)} ${c.hora})`,
                data: c.data
            });
        }
    });

    medicos.filter(m => m.status && m.status !== "ativo").forEach(m => {
        notificacoes.push({
            tipo: "medico",
            titulo: "Médico indisponível",
            mensagem: `${m.nome} (${m.especialidade}) — ${capitalize(m.status)}`,
            data: hojeISO()
        });
    });

    pacientes.slice(-5).forEach(p => {
        notificacoes.push({
            tipo: "paciente",
            titulo: "Novo paciente",
            mensagem: `${p.nome} registado no sistema`,
            data: hojeISO()
        });
    });

    notificacoes.push({
        tipo: "admin",
        titulo: "Aviso do administrador",
        mensagem: "Verifique consultas pendentes de confirmação antes do meio-dia.",
        data: hojeISO()
    });

    notificacoes.sort((a, b) => (b.data || "").localeCompare(a.data || ""));
}

function renderNotificacoes() {
    const filtro = document.getElementById("filtroTipo").value;
    let lista = notificacoes;
    if (filtro) lista = lista.filter(n => n.tipo === filtro);

    document.getElementById("totalNotificacoes").innerText = notificacoes.length;
    document.getElementById("notificacoesHoje").innerText = notificacoes.filter(n => n.data === hojeISO()).length;
    document.getElementById("naoLidas").innerText = lista.length;

    const container = document.getElementById("listaNotificacoes");
    if (lista.length === 0) {
        container.innerHTML = "<p>Nenhuma notificação encontrada.</p>";
        return;
    }

    container.innerHTML = lista.map(n => `
        <div>
            <strong>${escapeHtml(n.titulo)}</strong>
            <p style="margin-top:6px;color:#555;">${escapeHtml(n.mensagem)}</p>
            <small style="color:#888;">${formatDate(n.data)}</small>
        </div>
    `).join("");
}

window.addEventListener("DOMContentLoaded", initNotificacoes);

function renderNotificacoes() {
    // ... (todo o seu código atual da função) ...

    // Adicione isto na última linha da função para sincronizar o badge com os itens visíveis:
    if (typeof atualizarBadgeNotificacoes === "function") {
        const lista = filtro ? notificacoes.filter(n => n.tipo === filtro) : notificacoes;
        // Passando a quantidade atual filtrada diretamente para o componente visual
        const badge = document.getElementById("notifBadge");
        if (badge) {
            badge.innerText = lista.length > 9 ? "9+" : lista.length;
            badge.style.display = lista.length > 0 ? "inline-block" : "none";
        }
    }
}