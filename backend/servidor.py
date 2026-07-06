from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_mail import Mail, Message
from dotenv import load_dotenv
import os
import json
import random
import time
import unicodedata
from datetime import datetime

load_dotenv()

app = Flask(__name__)
CORS(app)

# =========================
# PATHS DE FICHEIRO
# =========================
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))
ARQUIVO = os.path.join(BASE_DIR, "utilizadores.txt")
LOG_FILE = os.path.join(BASE_DIR, "logs_login.txt")
MEDICOS_FILE = os.path.join(BASE_DIR, "medicos.txt")
CONSULTAS_FILE = os.path.join(BASE_DIR, "consultas.txt")
ESPECIALIDADES_FILE = os.path.join(BASE_DIR, "especialidades.json")

# =========================
# EMAIL CONFIG
# =========================
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = os.environ.get('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.environ.get('MAIL_PASSWORD')

mail = Mail(app)

# =========================
# MEMÓRIA
# =========================
codigos_2fa = {}      # email -> {codigo, tempo}
tentativas = {}       # email -> int

# =========================
# CRIAR FICHEIROS SE NÃO EXISTIREM
# =========================
for caminho in (ARQUIVO, LOG_FILE, MEDICOS_FILE, CONSULTAS_FILE, ESPECIALIDADES_FILE):
    if not os.path.exists(caminho):
        if caminho == ESPECIALIDADES_FILE:
            with open(caminho, "w", encoding="utf-8") as f:
                f.write("[]")
        else:
            open(caminho, "w", encoding="utf-8").close()

# =========================
# FUNÇÕES AUXILIARES / LOGS
# =========================
def registrar_log(email, status):
    data = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(f"{email};{status};{data}\n")


def carregar_json(caminho):
    try:
        with open(caminho, "r", encoding="utf-8") as f:
            texto = f.read().strip()
            if not texto:
                return []
            return json.loads(texto)
    except Exception:
        return []


def guardar_json(caminho, dados):
    with open(caminho, "w", encoding="utf-8") as f:
        json.dump(dados, f, ensure_ascii=False, indent=2)


def normalizar_tipo(tipo):
    texto = unicodedata.normalize("NFD", tipo or "")
    texto = texto.encode("ascii", "ignore").decode("ascii").lower().replace(" ", "")

    if texto in ("admin", "administrador"):
        return "admin"
    if texto in ("rececao", "recepcao", "recepcionista"):
        return "rececao"
    if texto in ("medico", "medica"):
        return "medico"
    return "utilizador"


def normalizar_prioridade(prioridade):
    texto = unicodedata.normalize("NFD", prioridade or "")
    texto = texto.encode("ascii", "ignore").decode("ascii").lower().replace(" ", "")

    if texto in ("urgente", "critica", "critico"):
        return "urgente"
    if texto in ("alta", "alto"):
        return "alta"
    if texto in ("media", "medio", "moderada"):
        return "media"
    return "baixa"


def utilizador_para_dict(campos):
    campos = [c.strip() for c in campos]
    if len(campos) >= 7 and "@" in campos[5]:
        return {
            "nome": campos[0],
            "bi": campos[1],
            "dataNascimento": campos[2],
            "sexo": campos[3],
            "telefone": campos[4],
            "email": campos[5].lower(),
            "senha": campos[6],
            "tipo": normalizar_tipo(campos[7] if len(campos) > 7 else "utilizador"),
            "formato": "completo"
        }
    if len(campos) >= 4 and "@" in campos[1]:
        return {
            "nome": campos[0],
            "bi": "",
            "dataNascimento": "",
            "sexo": "",
            "telefone": campos[2],
            "email": campos[1].lower(),
            "senha": campos[3],
            "tipo": normalizar_tipo(campos[4] if len(campos) > 4 else "utilizador"),
            "formato": "simples"
        }
    return None


def ler_utilizadores_com_linhas():
    utilizadores = []
    if not os.path.exists(ARQUIVO):
        return utilizadores
    with open(ARQUIVO, "r", encoding="utf-8") as f:
        for linha in f:
            linha_limpa = linha.rstrip("\n")
            if not linha_limpa.strip():
                continue
            campos = linha_limpa.split(";")
            utilizador = utilizador_para_dict(campos)
            if utilizador:
                utilizador["linha"] = linha_limpa
                utilizador["campos"] = campos
                utilizadores.append(utilizador)
    return utilizadores


def carregar_medicos():
    lista = carregar_json(MEDICOS_FILE)
    modificado = False
    base = int(time.time() * 1000)
    for indice, medico in enumerate(lista):
        if "id" not in medico:
            medico["id"] = base + indice
            modificado = True
    if modificado:
        guardar_json(MEDICOS_FILE, lista)
    return lista


def buscar_utilizador_por_email(email):
    for utilizador in ler_utilizadores_com_linhas():
        if utilizador["email"] == email.lower():
            return utilizador
    return None


def obter_ultimo_acesso(email):
    if not os.path.exists(LOG_FILE):
        return None
    ultimo = None
    with open(LOG_FILE, "r", encoding="utf-8") as f:
        for linha in f:
            partes = [p.strip() for p in linha.strip().split(";") if p.strip() != ""]
            if len(partes) >= 3 and partes[0].lower() == email.lower() and partes[1] == "LOGIN_SUCESSO":
                ultimo = partes[2]
    return ultimo


def indice_email(campos):
    if len(campos) >= 7 and "@" in campos[5]:
        return 5
    if len(campos) >= 4 and "@" in campos[1]:
        return 1
    return None

# =========================
# ROTAS API - ESPECIALIDADES
# =========================
@app.route("/especialidades", methods=["GET"])
def api_listar_especialidades():
    return jsonify(carregar_json(ESPECIALIDADES_FILE))


@app.route("/especialidades", methods=["POST"])
def api_criar_especialidade():
    dados = request.get_json() or {}
    nome_especialidade = dados.get("nome", "").strip()

    if not nome_especialidade:
        return jsonify({"sucesso": False, "mensagem": "O nome da especialidade é obrigatório."}), 400

    especialidades = carregar_json(ESPECIALIDADES_FILE)
    
    if any(e.lower() == nome_especialidade.lower() for e in especialidades):
        return jsonify({"sucesso": False, "mensagem": "Esta especialidade já se encontra registada."}), 409

    especialidades.append(nome_especialidade)
    guardar_json(ESPECIALIDADES_FILE, especialidades)

    return jsonify({"sucesso": True, "mensagem": "Especialidade criada com sucesso!", "especialidades": especialidades}), 201


@app.route("/especialidades", methods=["DELETE"])
def api_remover_especialidade():
    nome_especialidade = request.args.get("nome", "").strip()
    if not nome_especialidade:
        return jsonify({"sucesso": False, "mensagem": "O nome da especialidade é obrigatório."}), 400

    especialidades = carregar_json(ESPECIALIDADES_FILE)
    especialidades_restantes = [e for e in especialidades if e.lower() != nome_especialidade.lower()]

    if len(especialidades_restantes) == len(especialidades):
        return jsonify({"sucesso": False, "mensagem": "Especialidade não encontrada."}), 404

    guardar_json(ESPECIALIDADES_FILE, especialidades_restantes)
    return jsonify({"sucesso": True, "mensagem": "Especialidade removida.", "especialidades": especialidades_restantes})

# =========================
# ROTAS API - MÉDICOS
# =========================
@app.route("/medicos", methods=["GET"])
def api_medicos():
    return jsonify(carregar_medicos())


@app.route("/medicos", methods=["POST"])
def api_criar_medico():
    dados = request.get_json() or {}
    
    nome = dados.get("nome", "").strip()
    especialidade = dados.get("especialidade", "").strip()
    horarios = dados.get("horarios", "").strip()
    status = dados.get("status", "ativo")

    documento = dados.get("documento", "").strip()
    nascimento = dados.get("nascimento", "").strip()
    genero = dados.get("genero", "").strip()
    telefone = dados.get("telefone", "").strip()
    email = dados.get("email", "").strip().lower()
    senha = dados.get("senha", "").strip()
    tipo_perfil = "medico"

    if not nome or not especialidade or not email or not senha:
        return jsonify({"sucesso": False, "mensagem": "Nome, Especialidade, Email e Senha são obrigatórios."}), 400

    if buscar_utilizador_por_email(email):
        return jsonify({"sucesso": False, "mensagem": "Este e-mail de utilizador já se encontra registado."}), 400

    lista_medicos = carregar_medicos()
    novo_id = int(time.time() * 1000)
    
    novo_medico = {
        "id": novo_id,
        "nome": nome,
        "especialidade": especialidade,
        "horarios": horarios,
        "status": status,
        "documento": documento,
        "nascimento": nascimento,
        "genero": genero,
        "telefone": telefone,
        "email": email
    }
    lista_medicos.append(novo_medico)
    guardar_json(MEDICOS_FILE, lista_medicos)

    nova_linha_usuario = f"{nome};{documento};{nascimento};{genero};{telefone};{email};{senha};{tipo_perfil}\n"
    with open(ARQUIVO, "a", encoding="utf-8") as f:
        f.write(nova_linha_usuario)

    return jsonify({"sucesso": True, "medico": novo_medico}), 201


@app.route("/medicos/<int:medico_id>", methods=["PATCH"])
def api_atualizar_medico(medico_id):
    dados = request.get_json() or {}
    lista = carregar_medicos()
    medico = next((m for m in lista if m.get("id") == medico_id), None)

    if not medico:
        return jsonify({"sucesso": False, "mensagem": "Médico não encontrado."}), 404

    for campo in ["nome", "especialidade", "horarios", "status", "documento", "nascimento", "genero", "telefone", "email"]:
        if campo in dados:
            medico[campo] = dados[campo]

    guardar_json(MEDICOS_FILE, lista)
    return jsonify({"sucesso": True, "medico": medico})


@app.route("/medicos/<int:medico_id>", methods=["DELETE"])
def api_remover_medico(medico_id):
    lista = carregar_medicos()
    medico = next((m for m in lista if m.get("id") == medico_id), None)

    if not medico:
        return jsonify({"sucesso": False, "mensagem": "Médico não encontrado."}), 404

    lista = [m for m in lista if m.get("id") != medico_id]
    guardar_json(MEDICOS_FILE, lista)
    return jsonify({"sucesso": True, "mensagem": "Médico removido."})

# =========================
# ROTAS API - UTILIZADORES
# =========================
@app.route("/utilizadores", methods=["GET"])
def api_listar_utilizadores():
    usuarios = []
    for u in ler_utilizadores_com_linhas():
        usuarios.append({
            "nome": u["nome"],
            "email": u["email"],
            "telefone": u["telefone"],
            "tipo": u["tipo"],
            "bi": u["bi"],
            "dataNascimento": u["dataNascimento"],
            "sexo": u["sexo"]
        })
    return jsonify(usuarios)


@app.route("/utilizadores", methods=["POST"])
def api_criar_utilizador():
    dados = request.get_json() or {}
    nome = dados.get("nome", "").strip()
    email = dados.get("email", "").strip().lower()
    telefone = dados.get("telefone", "").strip()
    senha = dados.get("senha", "").strip()
    tipo = dados.get("tipo", "utilizador").strip() or "utilizador"
    bi = dados.get("bi", "").strip()
    data_nascimento = dados.get("dataNascimento", dados.get("data_nascimento", "")).strip()
    sexo = dados.get("sexo", "").strip()

    if not nome or not email or not senha:
        return jsonify({"sucesso": False, "mensagem": "Nome, e-mail e senha são obrigatórios."}), 400

    if buscar_utilizador_por_email(email) is not None:
        return jsonify({"sucesso": False, "mensagem": "Este e-mail já está registado."}), 409

    with open(ARQUIVO, "a", encoding="utf-8") as f:
        f.write(f"{nome};{bi};{data_nascimento};{sexo};{telefone};{email};{senha};{tipo}\n")

    return jsonify({"sucesso": True, "utilizador": {"nome": nome, "email": email, "telefone": telefone}}), 201


@app.route("/utilizador", methods=["GET"])
def api_utilizador():
    email = request.args.get("email", "").strip().lower()
    if not email:
        return jsonify({"sucesso": False, "mensagem": "Email é obrigatório."}), 400

    campos = buscar_utilizador_por_email(email)
    if not campos:
        return jsonify({"sucesso": False, "mensagem": "Utilizador não encontrado."}), 404

    perfil = {
        "nome": campos["nome"],
        "email": campos["email"],
        "telefone": campos["telefone"],
        "bi": campos["bi"],
        "dataNascimento": campos["dataNascimento"],
        "sexo": campos["sexo"],
        "tipo": campos["tipo"],
        "ultimoAcesso": obter_ultimo_acesso(email) or "Não disponível"
    }
    return jsonify(perfil)


@app.route("/utilizador", methods=["PATCH"])
def api_atualizar_utilizador():
    dados = request.get_json() or {}
    email_original = dados.get("emailOriginal", "").strip().lower()
    if not email_original:
        return jsonify({"sucesso": False, "mensagem": "Email original é obrigatório."}), 400

    nome = dados.get("nome", "").strip()
    email = dados.get("email", "").strip().lower()
    telefone = dados.get("telefone", "").strip()

    linhas = []
    modificado = False
    with open(ARQUIVO, "r", encoding="utf-8") as f:
        for linha in f:
            linha_limpa = linha.rstrip("\n")
            if not linha_limpa.strip():
                continue
            campos = [c.strip() for c in linha_limpa.split(";")]
            idx = indice_email(campos)

            if idx is not None and campos[idx].lower() == email_original:
                campos[0] = nome
                campos[idx] = email

                if idx == 5:
                    campos[4] = telefone
                    if "bi" in dados: campos[1] = dados.get("bi", "").strip()
                    if "dataNascimento" in dados: campos[2] = dados.get("dataNascimento", "").strip()
                    if "sexo" in dados: campos[3] = dados.get("sexo", "").strip()
                else:
                    campos[2] = telefone
                modificado = True
            linhas.append(";".join(campos))

    if not modificado:
        return jsonify({"sucesso": False, "mensagem": "Utilizador não encontrado."}), 404

    with open(ARQUIVO, "w", encoding="utf-8") as f:
        f.write("\n".join(linhas).strip() + "\n")

    return jsonify({"sucesso": True, "mensagem": "Perfil updated."})


@app.route("/utilizador", methods=["DELETE"])
def api_deletar_utilizador():
    email = request.args.get("email", "").strip().lower()
    if not email:
        return jsonify({"sucesso": False, "mensagem": "Email é obrigatório."}), 400

    if email in ("admin@hospital.cv", "rececao@hospital.cv"):
        return jsonify({"sucesso": False, "mensagem": "Esta conta não pode ser removida."}), 403

    linhas = []
    removido = False
    with open(ARQUIVO, "r", encoding="utf-8") as f:
        for linha in f:
            linha_limpa = linha.rstrip("\n")
            if not linha_limpa.strip():
                continue
            campos = [c.strip() for c in linha_limpa.split(";")]
            idx = indice_email(campos)
            if idx is not None and campos[idx].lower() == email:
                removido = True
                continue
            linhas.append(";".join(campos))

    if not removido:
        return jsonify({"sucesso": False, "mensagem": "Utilizador não encontrado."}), 404

    with open(ARQUIVO, "w", encoding="utf-8") as f:
        if linhas:
            f.write("\n".join(linhas).strip() + "\n")

    return jsonify({"sucesso": True, "mensagem": "Utilizador removido."})

# =========================
# ROTAS API - CONSULTAS (COM BLINDAGEM CONTRA UNDEFINED)
# =========================
@app.route("/consultas", methods=["GET"])
def api_consultas():
    consultas = carregar_json(CONSULTAS_FILE)
    
    # BLINDAGEM: Garante que nenhuma consulta antiga sem prioridade ou sintomas quebre o frontend
    for consulta in consultas:
        if "prioridade" not in consulta or not consulta["prioridade"]:
            consulta["prioridade"] = "baixa"
        if "sintomas" not in consulta:
            consulta["sintomas"] = []
            
    return jsonify(consultas)


@app.route("/consultas", methods=["POST"])
def api_guardar_consulta():
    dados = request.get_json() or {}

    paciente = dados.get("paciente", "").strip()
    medico = dados.get("medico", "").strip()
    especialidade = dados.get("especialidade", "").strip()
    data_consulta = dados.get("data", "").strip()
    hora = dados.get("hora", "").strip()
    
    prioridade = normalizar_prioridade(dados.get("prioridade", "baixa"))

    if not paciente or not medico or not especialidade or not data_consulta or not hora:
        return jsonify({"sucesso": False, "mensagem": "É necessário preencher todos os campos."}), 400

    consultas = carregar_json(CONSULTAS_FILE)
    nova_consulta = {
        "id": int(time.time() * 1000),
        "paciente": paciente,
        "medico": medico,
        "especialidade": especialidade,
        "data": data_consulta,
        "hora": hora,
        "estado": dados.get("estado", "pendente"),
        "sintomas": dados.get("sintomas", []),
        "prioridade": prioridade
    }
    consultas.append(nova_consulta)
    guardar_json(CONSULTAS_FILE, consultas)

    return jsonify({"sucesso": True, "consulta": nova_consulta})


@app.route("/consultas/<int:consulta_id>", methods=["PATCH"])
def api_atualizar_consulta(consulta_id):
    dados = request.get_json() or {}
    consultas = carregar_json(CONSULTAS_FILE)
    consulta = next((c for c in consultas if c.get("id") == consulta_id), None)

    if not consulta:
        return jsonify({"sucesso": False, "mensagem": "Consulta não encontrada."}), 404

    for campo in ["paciente", "medico", "especialidade", "data", "hora", "estado", "sintomas", "prioridade"]:
        if campo in dados:
            if campo == "prioridade":
                consulta["prioridade"] = normalizar_prioridade(dados["prioridade"])
            else:
                consulta[campo] = dados[campo]

    guardar_json(CONSULTAS_FILE, consultas)
    return jsonify({"sucesso": True, "consulta": consulta})

# =========================
# SEGURANÇA / CONTAS / LOGINS
# =========================
@app.route("/login_logs", methods=["GET"])
def api_login_logs():
    logs = []
    try:
        with open(LOG_FILE, "r", encoding="utf-8") as f:
            for linha in f:
                partes = [p.strip() for p in linha.strip().split(";") if p.strip() != ""]
                if len(partes) >= 3:
                    logs.append({
                        "email": partes[0].lower(),
                        "status": partes[1],
                        "data": partes[2]
                    })
    except Exception:
        pass
    return jsonify(logs)


@app.route("/criar_conta", methods=["POST"])
def criar_conta():
    dados = request.get_json() or {}
    nome = dados.get("nome", "").strip()
    bi = dados.get("bi", "").strip().upper()
    data_nascimento = dados.get("dataNascimento", "")
    sexo = dados.get("sexo", "")
    telefone = dados.get("telefone", "").strip()
    email = dados.get("email", "").strip().lower()
    senha = dados.get("senha", "")
    type_user = "utilizador"

    for u in ler_utilizadores_com_linhas():
        if u["bi"].upper() == bi and bi != "":
            return jsonify({"sucesso": False, "mensagem": "Já existe uma conta com este BI."})
        if u["email"] == email:
            return jsonify({"sucesso": False, "mensagem": "Este e-mail já está registado."})

    with open(ARQUIVO, "a", encoding="utf-8") as f:
        f.write(f"{nome};{bi};{data_nascimento};{sexo};{telefone};{email};{senha};{type_user}\n")

    return jsonify({"sucesso": True, "mensagem": "Conta criada com sucesso."})


@app.route("/login", methods=["POST"])
def login():
    dados = request.get_json() or {}
    email = dados.get("email", "").strip().lower()
    senha = dados.get("senha", "")

    if email == "admin@hospital.cv" and senha == "1234":
        registrar_log(email, "LOGIN_SUCESSO")
        return jsonify({"sucesso": True, "tipo": "admin", "nome": "Administrador"})

    u = buscar_utilizador_por_email(email)
    if u and u["senha"] == senha:
        registrar_log(email, "LOGIN_SUCESSO")
        return jsonify({"sucesso": True, "tipo": u["tipo"], "nome": u["nome"]})

    registrar_log(email, "LOGIN_FALHOU")
    return jsonify({"sucesso": False, "mensagem": "Utilizador ou palavra-passe incorretos."}), 400

# =========================
# MOTOR DO SISTEMA 2FA
# =========================
def gerar_codigo_2fa(email):
    codigo = str(random.randint(100000, 999999))
    codigos_2fa[email] = {"codigo": codigo, "tempo": time.time()}
    tentativas[email] = 0

    msg = Message(
        subject="Código de Verificação - Hospital Agostinho Neto",
        sender=app.config["MAIL_USERNAME"],
        recipients=[email]
    )
    msg.body = f"\nOlá,\n\nO seu código de verificação é:\n\n{codigo}\n\nEste código é válido por 5 minutos.\n"
    
    try:
        mail.send(msg)
        return jsonify({"sucesso": True, "dois_fatores": True, "email": email})
    except Exception as e:
        print(e)
        return jsonify({"sucesso": False, "mensagem": "Erro ao enviar o código."}), 500


@app.route("/verificar_codigo", methods=["POST"])
def verificar_codigo():
    dados = request.get_json() or {}
    email = dados.get("email", "").strip().lower()
    codigo = dados.get("codigo", "")

    if email not in codigos_2fa:
        return jsonify({"sucesso": False, "mensagem": "Sem código ativo."})

    dados_codigo = codigos_2fa[email]

    if time.time() - dados_codigo["tempo"] > 300:
        del codigos_2fa[email]
        registrar_log(email, "2FA_EXPIRADO")
        return jsonify({"sucesso": False, "mensagem": "Código expirado."})

    if dados_codigo["codigo"] == codigo:
        del codigos_2fa[email]
        tentativas[email] = 0
        return jsonify({"sucesso": True, "alterar_senha": True, "email": email})

    tentativas[email] = tentativas.get(email, 0) + 1
    if tentativas[email] >= 3:
        del codigos_2fa[email]
        registrar_log(email, "BLOQUEADO_2FA")
        return jsonify({"sucesso": False, "mensagem": "Bloqueado após 3 tentativas."})

    return jsonify({"sucesso": False, "mensagem": f"Código inválido ({tentativas[email]}/3)"})


@app.route("/alterar_senha", methods=["POST"])
def alterar_senha():
    dados = request.get_json() or {}
    email = dados.get("email", "").strip().lower()
    nova_senha = dados.get("nova_senha", "")

    linhas = []
    modificado = False
    
    with open(ARQUIVO, "r", encoding="utf-8") as f:
        for tuple_line in f:
            linha_limpa = tuple_line.rstrip("\n")
            if not linha_limpa.strip():
                continue
            campos = [c.strip() for c in linha_limpa.split(";")]
            idx = indice_email(campos)
            
            if idx is not None and campos[idx].lower() == email:
                if idx == 5:
                    campos[6] = nova_senha
                else:
                    campos[3] = nova_senha
                modificado = True
            linhas.append(";".join(campos))

    if not modificado:
        return jsonify({"sucesso": False, "mensagem": "Utilizador não encontrado."}), 404

    with open(ARQUIVO, "w", encoding="utf-8") as f:
        f.write("\n".join(linhas).strip() + "\n")

    return jsonify({"sucesso": True, "mensagem": "Palavra-passe alterada com sucesso."})


@app.route("/reenviar_codigo", methods=["POST"])
def reenviar_codigo():
    dados = request.get_json() or {}
    email = dados.get("email", "").strip().lower()

    if email not in codigos_2fa:
        return jsonify({"sucesso": False, "mensagem": "Nenhum login ativo."})

    if tentativas.get(email, 0) >= 5:
        return jsonify({"sucesso": False, "mensagem": "Muitas tentativas."})

    return gerar_codigo_2fa(email)


@app.route("/esqueceu_senha", methods=["POST"])
def esqueceu_senha():
    dados = request.get_json() or {}
    email = dados.get("email", "").strip().lower()

    if buscar_utilizador_por_email(email):
        return gerar_codigo_2fa(email)

    return jsonify({"sucesso": False, "mensagem": "Email não encontrado."}), 404


if __name__ == "__main__":
    app.run(debug=True)