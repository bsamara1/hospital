// ../js/consultas.js

// 1. BASE DE DADOS DOS MÉDICOS REAIS (Fornecida pelo utilizador)
const medicosHospital = [
  {
    "id": 1,
    "nome": "Dr. Mendes",
    "especialidade": "Cardiologia",
    "documento": "1000000012",
    "nascimento": "1975-04-12",
    "genero": "Masculino",
    "telefone": "9911111",
    "email": "mendes@hospital.cv",
    "horarios": "09:00,10:00,11:00,14:00",
    "status": "ativo"
  },
  {
    "id": 2,
    "nome": "Dr. Sousa",
    "especialidade": "Ortopedia",
    "documento": "100000002",
    "nascimento": "1980-08-22",
    "genero": "Masculino",
    "telefone": "9922222",
    "email": "sousa@hospital.cv",
    "horarios": "08:30,09:30,13:00,15:00",
    "status": "ativo"
  },
  {
    "id": 3,
    "nome": "Dr. Carlos Semedo",
    "especialidade": "Clínica Geral",
    "documento": "100000003",
    "nascimento": "1988-11-05",
    "genero": "Masculino",
    "telefone": "9933333",
    "email": "carlos.semedo@hospital.cv",
    "horarios": "10:00,11:00,12:00,13:00,14:00",
    "status": "ativo"
  },
  {
    "id": 4,
    "nome": "Dr. lili",
    "especialidade": "Dermatologia",
    "documento": "100000004",
    "nascimento": "1992-02-14",
    "genero": "Feminino",
    "telefone": "9944444",
    "email": "lili@hospital.cv",
    "horarios": "08:00,09:00,10:00",
    "status": "ativo"
  },
  {
    "id": 5,
    "nome": "Dr. Carla Semedo da Rosa",
    "especialidade": "Ginecologia",
    "documento": "2090384334",
    "nascimento": "1984-10-05",
    "genero": "Feminino",
    "telefone": "987654",
    "email": "carlarosa@gmail.com",
    "horarios": "08:30,09:30,13:00,15:00",
    "status": "ativo"
  },
  {
    "id": 6,
    "nome": "Dr.liliana",
    "especialidade": "Clínica Geral",
    "documento": "12345632",
    "nascimento": "1990-06-12",
    "genero": "Feminino",
    "telefone": "987654",
    "email": "liliana@hospital.cv",
    "horarios": "08:00,09:00,10:00",
    "status": "ativo"
  },
  {
    "id": 1783357638429,
    "nome": "sdfg",
    "especialidade": "Clínica Geral",
    "horarios": "08:00",
    "status": "ativo",
    "documento": "123456",
    "nascimento": "2005-06-08",
    "genero": "Feminino",
    "telefone": "9876543",
    "email": "ain@hospital.cv"
  }
];

// Mapeamento de Elementos do DOM
const selectEspecialidade = document.getElementById('especialidade');
const selectMedico = document.getElementById('medico');
const inputData = document.getElementById('data');
const selectHora = document.getElementById('hora');
const formAgendamento = document.getElementById('formAgendamento');
const mensagemFeedback = document.getElementById('mensagemFeedback');

document.addEventListener('DOMContentLoaded', () => {
    // Carregar informações de sessão no Header do formulário
    const utilizador = JSON.parse(localStorage.getItem('utilizadorLogado')) || { nome: "João Baptista Silva", email: "joao.silva@email.cv" };
    document.getElementById('usuarioNome').textContent = utilizador.nome;
    document.getElementById('usuarioEmail').textContent = utilizador.email;
    document.getElementById('usuarioAvatar').textContent = utilizador.nome.charAt(0).toUpperCase();

    // Travar datas retroativas no formulário (Apenas hoje ou datas futuras)
    const hoje = new Date().toISOString().split('T')[0];
    if(inputData) inputData.min = hoje;

    // Extrair especialidades únicas dos médicos ativos e preencher o Select
    if(selectEspecialidade) {
        // Filtra especialidades únicas tirando repetidos
        const especialidadesUnicas = [...new Set(medicosHospital.map(m => m.especialidade))];
        
        especialidadesUnicas.forEach(esp => {
            let option = document.createElement('option');
            option.value = esp;
            option.textContent = esp;
            selectEspecialidade.appendChild(option);
        });
    }
});

// EVENTO 1: Alteração na Especialidade -> Filtra e liberta os Médicos correspondentes
if(selectEspecialidade) {
    selectEspecialidade.addEventListener('change', function() {
        selectMedico.innerHTML = '<option value="">Selecione o Médico</option>';
        selectMedico.disabled = true;
        inputData.value = "";
        inputData.disabled = true;
        selectHora.innerHTML = '<option value="">Selecione a data</option>';
        selectHora.disabled = true;

        const espSelecionada = this.value;

        if (espSelecionada) {
            // Filtra os médicos da lista que pertencem à especialidade escolhida
            const medicosFiltrados = medicosHospital.filter(m => m.especialidade === espSelecionada);
            
            medicosFiltrados.forEach(m => {
                let option = document.createElement('option');
                option.value = m.nome;
                option.textContent = m.nome;
                selectMedico.appendChild(option);
            });
            selectMedico.disabled = false;
        }
    });
}

// EVENTO 2: Alteração no Médico -> Liberta o campo de Data
if(selectMedico) {
    selectMedico.addEventListener('change', function() {
        if (this.value) {
            inputData.disabled = false;
        } else {
            inputData.value = "";
            inputData.disabled = true;
            selectHora.innerHTML = '<option value="">Selecione a data</option>';
            selectHora.disabled = true;
        }
    });
}

// EVENTO 3: Alteração na Data -> Converte a string de horários do médico em opções
if(inputData) {
    inputData.addEventListener('change', function() {
        selectHora.innerHTML = '<option value="">Selecione o Horário</option>';
        selectHora.disabled = true;

        const nomeMedico = selectMedico.value;
        if (this.value && nomeMedico) {
            // Localiza o objeto do médico selecionado para extrair os seus horários específicos
            const medicoAlvo = medicosHospital.find(m => m.nome === nomeMedico);
            
            if (medicoAlvo && medicoAlvo.horarios) {
                // Divide a string "09:00,10:00..." por vírgulas para criar um Array
                const listaHorarios = medicoAlvo.horarios.split(',');
                
                listaHorarios.forEach(horario => {
                    let option = document.createElement('option');
                    option.value = horario.trim();
                    option.textContent = horario.trim();
                    selectHora.appendChild(option);
                });
                selectHora.disabled = false;
            }
        }
    });
}

// EVENTO 4: Submissão e Registo do Agendamento no LocalStorage
if(formAgendamento) {
    formAgendamento.addEventListener('submit', function(e) {
        e.preventDefault();

        const sintomasMarcados = document.querySelectorAll('input[name="sintoma"]:checked');
        if (sintomasMarcados.length === 0) {
            mostrarFeedback("Selecione pelo menos um sintoma ou marque check-up de rotina.", "erro");
            return;
        }

        const utilizador = JSON.parse(localStorage.getItem('utilizadorLogado')) || { nome: "João Baptista Silva", email: "joao.silva@email.cv" };

        const novaConsulta = {
            id: Date.now(),
            paciente: utilizador.nome,
            pacienteEmail: utilizador.email,
            especialidade: selectEspecialidade.value,
            medico: selectMedico.value,
            data: inputData.value,
            hora: selectHora.value,
            status: "Pendente",
            sintomas: Array.from(sintomasMarcados).map(cb => cb.value),
            observacoes: document.getElementById('observacoes').value
        };

        // Grava no array global do localStorage (consultasHAN) acessado também pela receção
        let consultas = JSON.parse(localStorage.getItem('consultasHAN')) || [];
        consultas.push(novaConsulta);
        localStorage.setItem('consultasHAN', JSON.stringify(consultas));

        mostrarFeedback("Consulta agendada com sucesso! A redirecionar para o histórico...", "sucesso");

        formAgendamento.reset();
        selectMedico.disabled = true;
        inputData.disabled = true;
        selectHora.disabled = true;

        // Redireciona de volta para a lista após 2 segundos
        setTimeout(() => {
            window.location.href = "consultas.html";
        }, 2000);
    });
}

function mostrarFeedback(msg, tipo) {
    if(!mensagemFeedback) return;
    mensagemFeedback.textContent = msg;
    mensagemFeedback.className = tipo === "sucesso" ? "feedback-sucesso" : "feedback-erro";
    mensagemFeedback.style.display = "block";
    mensagemFeedback.scrollIntoView({ behavior: 'smooth' });
}