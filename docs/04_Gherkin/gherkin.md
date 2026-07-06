## Cenário 1: Marcar consulta com sucesso
Dado que o paciente está logado no sistema
Quando escolhe a especialidade "Cardiologia"
Então o sistema deve mostrar "Consulta marcada com sucesso"
E escolhe o médico "Dr. João Silva"
E escolhe a data "10/07/2026" às "14:00"
E confirma a marcação
E enviar uma notificação para o paciente
E atualizar a agenda do médico



---

## Cenário 2: Tentar marcar horário ocupado
Dado que o paciente está logado no sistema
Quando escolhe a especialidade "Cardiologia"
Então o sistema deve mostrar "Horário indisponível"
E escolhe o médico "Dr. João Silva"
E escolhe a data "10/07/2026" às "14:00"
E o horário já está ocupado
E sugerir outros horários disponíveis



---

## Cenário 3: Reagendar consulta
Dado que o paciente tem uma consulta marcada para "10/07/2026" às "14:00"
Quando solicita o reagendamento
E escolhe novo horário "15/07/2026" às "09:00"
Então o sistema deve confirmar a nova marcação
E confirma o reagendamento
E liberar o horário antigo
E enviar nova notificação de confirmação



---

## Cenário 4: Cancelar consulta com antecedência
Dado que o paciente tem uma consulta marcada para "15/07/2026"
Quando solicita o cancelamento
Então o sistema deve confirmar o cancelamento
E está com mais de 24h de antecedência
E liberar o horário
E enviar notificação de cancelamento



---

## Cenário 5: Tentar cancelar em cima da hora
Dado que o paciente tem uma consulta marcada para "10/07/2026" às "14:00"
Quando solicita o cancelamento às "13:00" do mesmo dia
Então o sistema deve informar "Não é possível cancelar com menos de 24h"
E está com menos de 24h de antecedência
E sugerir entrar em contato com a recepção



---

## Cenário 6: Triagem automática - Prioridade Urgente
Dado que o paciente está realizando a triagem
Quando informa os sintomas
Então o sistema deve definir prioridade como "Urgente"
E relata "dor no peito intensa" e "falta de ar"
E sugerir atendimento imediato



---

## Cenário 7: Triagem automática - Prioridade Baixa
Dado que o paciente está realizando a triagem
Quando informa os sintomas
Então o sistema deve definir prioridade como "Baixa"
E relata "tosse leve" e "sem febre"
E sugerir agendamento normal



---

## Cenário 8: Médico indisponível
Dado que o administrador tenta marcar uma consulta
Quando escolhe o médico "Dr. João Silva"
Então o sistema deve mostrar "Médico indisponível"
E ele está de férias
E sugerir outros médicos disponíveis



---

## Cenário 9: Verificar disponibilidade em tempo real
Dado que dois pacientes tentam marcar o mesmo horário
Quando o primeiro paciente confirma a marcação
Então o sistema deve bloquear o horário para o primeiro
E o segundo paciente tenta confirmar o mesmo horário
E mostrar indisponível para o segundo



---

## Cenário 10: Notificação de confirmação
Dado que o paciente marcou uma consulta
Quando a marcação é confirmada
Então o sistema deve enviar mensagem com nome do médico
E enviar data e hora da consulta
E enviar a especialidade e o local



---

## RESUMO DOS CENÁRIOS

| Cenário | Descrição | Funcionalidade |
|---------|-----------|----------------|
| C01 | Marcar consulta com sucesso | Marcação |
| C02 | Tentar marcar horário ocupado | Marcação |
| C03 | Reagendar consulta | Reagendamento |
| C04 | Cancelar com antecedência | Cancelamento |
| C05 | Cancelar em cima da hora | Cancelamento |
| C06 | Triagem - Prioridade Urgente | Triagem |
| C07 | Triagem - Prioridade Baixa | Triagem |
| C08 | Médico indisponível | Gestão Médicos |
| C09 | Concorrência de horário | Marcação |
| C10 | Notificação de confirmação | Notificações |