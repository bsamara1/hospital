# Hospital Agostinho Neto — Sprint 3 (Grupo III)

Sistema de gestão hospitalar: marcação de consultas, gestão de utilizadores, médicos e receção. Backend em Flask, frontend em HTML/CSS/JS puro.

## Stack

- **Backend**: Python 3 + Flask + Flask-CORS + Flask-Mail + python-dotenv
- **Frontend**: HTML/CSS/JS puro (sem framework), um `.html` por página
- **"Base de dados"**: ficheiros de texto na raiz do projeto (`utilizadores.txt`, `medicos.txt`, `consultas.txt`, `logs_login.txt`) — sem SQL, sem ORM
- **Testes**: Playwright (`playwright/`)

## Como correr o projeto

1. Instalar dependências:
   ```
   pip install flask flask-cors flask-mail python-dotenv
   ```
2. Criar um ficheiro `.env` na raiz (usa `.env.example` como modelo) com:
   ```
   MAIL_USERNAME=<conta gmail usada para enviar códigos 2FA>
   MAIL_PASSWORD=<app password dessa conta>
   ```
3. Arrancar o backend:
   ```
   python backend/servidor.py
   ```
   Fica disponível em `http://127.0.0.1:5000`.
4. Abrir os ficheiros de `app/` no browser (ex.: `app/login.html`), ou servir a pasta `app/` com um servidor estático (Live Server, `python -m http.server`, etc.). O backend tem de estar sempre a correr em paralelo.

## Estrutura de pastas

```
app/
  login.html, criar_conta.html, esqueceu_senha.html, verificar_codigo.html
  js/                    -> scripts partilhados (login, criar conta, storage, etc.)
  Admin/                 -> painel do Administrador (HTML + storage.js próprio)
  Recepcionista/          -> painel da Receção (HTML + js/ próprio)
  medicos/                -> painel do Médico
  pacientes/              -> painel do Paciente
backend/
  servidor.py             -> API Flask (única fonte de dados real)
utilizadores.txt, medicos.txt, consultas.txt, logs_login.txt   -> "base de dados"
```

## Perfis e onde vive cada um

| Perfil | Pasta | Estado |
|---|---|---|
| Admin | `app/Admin/` | Ligado à API real (utilizadores, médicos, consultas). Especialidades e logs de auditoria ficam só no browser (sem endpoint no backend). |
| Receção | `app/Recepcionista/` | Ligado à API real. É o módulo mais maduro do projeto. |
| Paciente | `app/pacientes/` | Ligado à API real (marcar, ver, cancelar, reagendar consultas). |
| Médico | `app/medicos/` | Login e identidade já ligados; o conteúdo das páginas (agenda, ficha do paciente, disponibilidade) continua maioritariamente estático — **por fazer**. |

## Regras do projeto (importante para não repetir bugs já corrigidos)

1. **Uma só fonte de dados**: tudo passa pela API do Flask (`http://127.0.0.1:5000`). Nunca criar uma cópia paralela em `localStorage` que devia vir do backend (já aconteceu no Admin e no Paciente — consultas marcadas ficavam presas no browser e nunca chegavam à Receção).
2. **`utilizadores.txt` tem dois formatos por linha**, ambos válidos:
   - Simples (5 campos): `Nome;Email;Telefone;Senha;Tipo`
   - Completo (7-8 campos): `Nome;BI;DataNascimento;Sexo;Telefone;Email;Senha;Tipo`
   - **Nunca assumir que o email está sempre na posição 1** — usar sempre `ler_utilizadores_com_linhas()` / `utilizador_para_dict()` / `indice_email()` no backend, que já sabem distinguir os dois formatos. Havia bugs (já corrigidos) em `carregar_utilizadores`, `PATCH /utilizador` e `DELETE /utilizador` que assumiam isto errado.
3. **`medicos.txt`** é uma lista JSON com o schema: `{ id, nome, especialidade, horarios, status }`. `horarios` é uma string separada por vírgulas com os horários disponíveis (ex.: `"08:00,09:00,14:00"`), não um intervalo. `status` é `"ativo"` ou `"inativo"`.
4. **`consultas.txt`** é uma lista JSON: `{ id, paciente, medico, especialidade, data, hora, estado, sintomas, prioridade }`. `estado` ∈ `pendente | confirmada | presente | realizada | cancelada`. `prioridade` ∈ `baixa | media | alta` (calculada a partir dos sintomas selecionados na triagem do paciente).
5. **Antes de dar `commit`**: correr `python -m py_compile backend/servidor.py` e, para JS, `node --check ficheiro.js`. Isto teria apanhado o commit anterior com marcadores de merge (`<<<<<<< HEAD`) que ficaram gravados dentro do código — ver secção seguinte.
6. **Nunca fazer commit com conflitos de merge por resolver.** Se aparecer `<<<<<<<` / `=======` / `>>>>>>>` num ficheiro depois de resolver um conflito, o conflito não foi resolvido — falta apagar os marcadores e escolher o conteúdo certo antes de dar `git add`.

## Referência da API (backend/servidor.py)

| Rota | Método | Descrição |
|---|---|---|
| `/login` | POST | Autentica (admin fixo, ou consulta `utilizadores.txt`) |
| `/criar_conta` | POST | Regista paciente (formato completo) |
| `/esqueceu_senha`, `/verificar_codigo`, `/reenviar_codigo`, `/alterar_senha` | POST | Fluxo de recuperação de senha com 2FA por email |
| `/utilizadores` | GET, POST | Listar / criar utilizadores (aceita `tipo`: paciente, medico, recepcionista; aceita `bi`/`dataNascimento`/`sexo` opcionais) |
| `/utilizador` | GET, PATCH, DELETE | Perfil por email; editar; remover |
| `/login_logs` | GET | Histórico de logins |
| `/medicos` | GET, POST | Listar / criar médicos |
| `/medicos/<id>` | PATCH, DELETE | Editar / remover médico |
| `/consultas` | GET, POST | Listar / criar consultas |
| `/consultas/<id>` | PATCH | Atualizar consulta (estado, data, hora, etc.) |

## Registo de alterações recentes (para acompanhamento entre colegas)

**Backend**
- Adicionados `POST/PATCH/DELETE /medicos` (só existia `GET`).
- `POST /utilizadores` passou a aceitar `tipo` (antes gravava sempre "Paciente") e `bi`/`dataNascimento`/`sexo` opcionais.
- `normalizar_tipo()` passou a reconhecer `"medico"` (antes um médico fazia login e caía no portal de Paciente).
- Corrigido bug em `carregar_utilizadores`, `PATCH /utilizador` e `DELETE /utilizador`: assumiam que o email estava sempre no campo 2 da linha, o que quebrava contas no formato completo (ex.: o Admin aparecia com perfil "Paciente" na Gestão de Utilizadores).
- `POST /consultas` passou a aceitar `sintomas` e `prioridade` (a Receção já esperava estes campos, mas nunca eram guardados).

**Paciente**
- `cancelamento.js` e `reagendamento.js` estavam com bugs fatais (conflito de merge por resolver / função em falta) — ambos reescritos e ligados à API real.
- `consultas.js` deixou de depender de ficheiros `.txt` inexistentes e passou a usar a API real — marcações do paciente agora chegam à Receção e ao Admin.
- Cabeçalho (nome/email) e sino de notificações ligados em todas as páginas do paciente.

**Admin**
- Corrigidos caminhos de `<script>` partidos em quase todas as páginas (apontavam para pastas/ficheiros inexistentes).
- `storage.js` reescrito para usar a API real em utilizadores/médicos/consultas (antes era uma base de dados falsa isolada no browser, nunca comunicava com a Receção nem o Paciente).
- Criados `marcacao.js` e `prioridades.js` (não existiam).
- Cabeçalho e sino de notificações ligados em todas as páginas.

**Receção / Médico**
- Cabeçalho com nome/email reais e sino de notificações ligado (Receção: contagem de pendentes/canceladas globais; Médico: contagem calculada a partir das consultas do próprio médico, por correspondência de nome).

**Merge com alterações da colega (gestão de pacientes na Receção)**
- O commit dela tinha marcadores de conflito por resolver gravados em `utilizadores.txt`, `logs_login.txt` e `Recepcionista/pacientes.html` — foram limpos.
- Backend adaptado para o novo formulário dela (BI, Data de Nascimento, Sexo).

## Por fazer / limitações conhecidas

- **Médico**: só o login/identidade estão ligados à API. O conteúdo das páginas (agenda, ficha do paciente, disponibilidade, notificações) continua estático/exemplo.
- **Admin**: especialidades e logs de auditoria continuam só em `localStorage` (o backend não tem endpoints para isso).
- Conta **"Joana De Lourdes..."** em `utilizadores.txt` tem os campos trocados (ficou com senha vazia) — foi criada assim pela colega, convém recriá-la corretamente pela Receção.
- Sem base de dados real nem migrações — tudo em ficheiros de texto, o que é frágil com acessos concorrentes.
