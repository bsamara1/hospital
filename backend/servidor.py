from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_mail import Mail, Message
import os
import json
import random
import time
import unicodedata
from datetime import datetime

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

# =========================
# EMAIL CONFIG
# =========================
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = 'btavares.l23@us.edu.cv'
app.config['MAIL_PASSWORD'] = 'oofkrbnlspzzeioi'

mail = Mail(app)

# =========================
# MEMÓRIA
# =========================
codigos_2fa = {}      # email -> {codigo, tempo}
tentativas = {}       # email -> int

# =========================
# CRIAR FICHEIROS
# =========================
for caminho in (ARQUIVO, LOG_FILE, MEDICOS_FILE, CONSULTAS_FILE):
    if not os.path.exists(caminho):
        open(caminho, "w", encoding="utf-8").close()

# =========================
# LOGS
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
    return "utilizador"


@app.route("/medicos", methods=["GET"])
def api_medicos():
    return jsonify(carregar_json(MEDICOS_FILE))


@app.route("/consultas", methods=["GET"])
def api_consultas():
    return jsonify(carregar_json(CONSULTAS_FILE))


def buscar_utilizador_por_email(email):
    try:
        with open(ARQUIVO, "r", encoding="utf-8") as f:
            for linha in f:
                campos = [c.strip() for c in linha.strip().split(";") if c.strip() != ""]
                if len(campos) >= 2 and campos[1].lower() == email.lower():
                    return campos
    except Exception:
        pass
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


@app.route("/utilizador", methods=["GET"])
def api_utilizador():
    email = request.args.get("email", "").strip().lower()
    if not email:
        return jsonify({"sucesso": False, "mensagem": "Email é obrigatório."}), 400

    campos = buscar_utilizador_por_email(email)
    if not campos:
        return jsonify({"sucesso": False, "mensagem": "Utilizador não encontrado."}), 404

    nome_utilizador = email.split("@")[0] if "@" in email else email
    perfil = {
        "nome": campos[0] if len(campos) > 0 else "",
        "email": campos[1] if len(campos) > 1 else "",
        "telefone": campos[2] if len(campos) > 2 else "",
        "bii": "",
        "dataNascimento": "",
        "sexo": "",
        "morada": "",
        "nomeUtilizador": nome_utilizador,
        "dataRegistro": "Não disponível",
        "ultimoAcesso": obter_ultimo_acesso(email) or "Não disponível",
        "tipo": campos[4] if len(campos) > 4 else ""
    }
    return jsonify(perfil)


def carregar_utilizadores():
    usuarios = []
    try:
        with open(ARQUIVO, "r", encoding="utf-8") as f:
            for linha in f:
                campos = [c.strip() for c in linha.strip().split(";") if c.strip() != ""]
                if len(campos) < 2:
                    continue
                email = campos[1].lower()
                if email in ("admin@hospital.cv", "rececao@hospital.cv"):
                    continue
                usuarios.append({
                    "nome": campos[0],
                    "email": email,
                    "telefone": campos[2] if len(campos) > 2 else "",
                    "tipo": campos[4] if len(campos) > 4 else "Paciente"
                })
    except Exception:
        pass
    return usuarios


@app.route("/utilizadores", methods=["GET"])
def api_utilizadores():
    return jsonify(carregar_utilizadores())


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


@app.route("/utilizadores", methods=["POST"])
def api_criar_utilizador():
    dados = request.get_json() or {}
    nome = dados.get("nome", "").strip()
    email = dados.get("email", "").strip().lower()
    telefone = dados.get("telefone", "").strip()
    senha = dados.get("senha", "").strip()

    if not nome or not email or not senha:
        return jsonify({"sucesso": False, "mensagem": "Nome, e-mail e senha são obrigatórios."}), 400

    if buscar_utilizador_por_email(email) is not None:
        return jsonify({"sucesso": False, "mensagem": "Este e-mail já está registado."}), 409

    with open(ARQUIVO, "a", encoding="utf-8") as f:
        f.write(f"{nome};{email};{telefone};{senha};Paciente\n")

    return jsonify({"sucesso": True, "utilizador": {"nome": nome, "email": email, "telefone": telefone}}), 201


@app.route("/consultas", methods=["POST"])
def api_guardar_consulta():
    dados = request.get_json()

    paciente = dados.get("paciente", "").strip()
    medico = dados.get("medico", "").strip()
    especialidade = dados.get("especialidade", "").strip()
    data_consulta = dados.get("data", "").strip()
    hora = dados.get("hora", "").strip()

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
        "estado": "pendente"
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

    for campo in ["paciente", "medico", "especialidade", "data", "hora", "estado"]:
        if campo in dados:
            consulta[campo] = dados[campo]

    guardar_json(CONSULTAS_FILE, consultas)
    return jsonify({"sucesso": True, "consulta": consulta})


@app.route("/utilizador", methods=["PATCH"])
def api_atualizar_utilizador():
    dados = request.get_json() or {}
    email_original = dados.get("emailOriginal", "").strip().lower()
    if not email_original:
        return jsonify({"sucesso": False, "mensagem": "Email original é obrigatório."}), 400

    nome = dados.get("nome", "").strip()
    email = dados.get("email", "").strip().lower()
    telefone = dados.get("telefone", "").strip()

    if not nome or not email:
        return jsonify({"sucesso": False, "mensagem": "Nome e e-mail são obrigatórios."}), 400

    linhas = []
    modificado = False
    with open(ARQUIVO, "r", encoding="utf-8") as f:
        for linha in f:
            campos = [c.strip() for c in linha.rstrip("\n").split(";")]
            if len(campos) >= 2 and campos[1].lower() == email_original:
                while len(campos) < 4:
                    campos.append("")
                campos[0] = nome
                campos[1] = email
                campos[2] = telefone
                modificado = True
            linhas.append(";".join(campos))

    if not modificado:
        return jsonify({"sucesso": False, "mensagem": "Utilizador não encontrado."}), 404

    with open(ARQUIVO, "w", encoding="utf-8") as f:
        f.write("\n".join(linhas).strip() + "\n")

    return jsonify({"sucesso": True, "mensagem": "Perfil atualizado."})


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
            campos = [c.strip() for c in linha.rstrip("\n").split(";")]
            if len(campos) >= 2 and campos[1].lower() == email:
                removido = True
                continue
            linhas.append(";".join(campos))

    if not removido:
        return jsonify({"sucesso": False, "mensagem": "Utilizador não encontrado."}), 404

    with open(ARQUIVO, "w", encoding="utf-8") as f:
        f.write("\n".join(linhas).strip() + "\n")

    return jsonify({"sucesso": True, "mensagem": "Utilizador removido."})


# =========================
# CRIAR CONTA
# =========================
@app.route("/criar_conta", methods=["POST"])
def criar_conta():

    dados = request.get_json()

    nome = dados["nome"].strip()
    bi = dados["bi"].strip().upper()
    data_nascimento = dados["dataNascimento"]
    sexo = dados["sexo"]
    telefone = dados["telefone"].strip()
    email = dados["email"].strip().lower()
    senha = dados["senha"]

    with open(ARQUIVO, "r", encoding="utf-8") as f:

        for linha in f:

            campos = linha.strip().split(";")

            if len(campos) < 7:
                continue

            # BI já existe
            if campos[1].upper() == bi:
                return jsonify({
                    "sucesso": False,
                    "mensagem": "Já existe uma conta com este BI."
                })

            # Email já existe
            if campos[5].lower() == email:
                return jsonify({
                    "sucesso": False,
                    "mensagem": "Este e-mail já está registado."
                })

    with open(ARQUIVO, "a", encoding="utf-8") as f:
        f.write(
            f"{nome};{bi};{data_nascimento};{sexo};{telefone};{email};{senha}\n"
        )

    return jsonify({
        "sucesso": True,
        "mensagem": "Conta criada com sucesso."
    })

# =========================
# LOGIN + 2FA (CORRIGIDO)
# =========================
@app.route("/login", methods=["POST"])
def login():
    dados = request.get_json()
    if not dados:
        return jsonify({"sucesso": False, "mensagem": "Dados em falta."}), 400

    email = dados.get("email", "").strip().lower()
    senha = dados.get("senha", "")

    # 1. ADMIN FIXO
    if email == "admin@hospital.cv" and senha == "1234":
        registrar_log(email, "LOGIN_SUCESSO")
        return jsonify({
            "sucesso": True,
            "tipo": "admin",
            "nome": "Administrador"
        })

    # 2. UTILIZADOR NORMAL
    if not os.path.exists(ARQUIVO):
        return jsonify({"sucesso": False, "mensagem": "Base de dados não encontrada."}), 500

    with open(ARQUIVO, "r", encoding="utf-8") as f:
        for linha in f:
            # Limpa espaços e divide garantindo que não guarda elementos vazios falsos
            campos = [c.strip() for c in linha.strip().split(";") if c.strip() != ""]
            
            if not campos:
                continue

            email_bd = None
            senha_bd = None
            tipo_bd = "utilizador"
            nome_bd = campos[0]

            # CASO A: Padrão Novo / Criar Conta (7 ou 8 campos)
            # Nome;BI;DataNasc;Sexo;Telefone;Email;Senha;[Tipo]
            if len(campos) >= 7 and "@" in campos[5]:
                email_bd = campos[5].lower()
                senha_bd = campos[6]
                if len(campos) >= 8:
                    tipo_bd = normalizar_tipo(campos[7])
                else:
                    tipo_bd = "utilizador"

            # CASO B: Padrão Antigo / Simplificado (4 ou 5 campos)
            # Nome;Email;Telefone;Senha;[Tipo]
            elif len(campos) >= 4 and "@" in campos[1]:
                email_bd = campos[1].lower()
                senha_bd = campos[3]
                if len(campos) >= 5:
                    tipo_bd = normalizar_tipo(campos[4])

            # Se não encaixar em nenhum padrão estruturado, ignora a linha
            if not email_bd:
                continue

            # Validação das credenciais
            if email_bd == email and senha_bd == senha:
                registrar_log(email, "LOGIN_SUCESSO")
                return jsonify({
                    "sucesso": True,
                    "tipo": tipo_bd,
                    "nome": nome_bd
                })

    registrar_log(email, "LOGIN_FALHOU")
    return jsonify({
        "sucesso": False,
        "mensagem": "Utilizador ou palavra-passe incorretos."
    })
# =========================
# GERAR CÓDIGO 2FA
# =========================
def gerar_codigo_2fa(email):

    codigo = str(random.randint(100000, 999999))

    codigos_2fa[email] = {
        "codigo": codigo,
        "tempo": time.time()
    }

    tentativas[email] = 0

    msg = Message(
    subject="Código de Verificação - Hospital Agostinho Neto",
    sender=app.config["MAIL_USERNAME"],
    recipients=[email]
)

    msg.body = f"""
    Olá,

    O seu código de verificação é:

    {codigo}

    Este código é válido durante 5 minutos.

    Se não solicitou este login, ignore este email.

    Hospital Agostinho Neto
    """

    try:
        mail.send(msg)

        return jsonify({
            "sucesso": True,
            "dois_fatores": True,
            "email": email
        })

    except Exception as e:
        print(e)

        return jsonify({
            "sucesso": False,
            "mensagem": "Erro ao enviar o código."
        })


# =========================
# VERIFICAR CÓDIGO
# =========================
@app.route("/verificar_codigo", methods=["POST"])
def verificar_codigo():

    dados = request.get_json()

    email = dados["email"].strip().lower()
    codigo = dados["codigo"]

    if email not in codigos_2fa:
        return jsonify({"sucesso": False, "mensagem": "Sem código ativo."})

    dados_codigo = codigos_2fa[email]

    # EXPIRAÇÃO 5 MIN
    if time.time() - dados_codigo["tempo"] > 300:
        del codigos_2fa[email]
        registrar_log(email, "2FA_EXPIRADO")

        return jsonify({
            "sucesso": False,
            "mensagem": "Código expirado."
        })

    # VERIFICAR
    if dados_codigo["codigo"] == codigo:

        del codigos_2fa[email]
        tentativas[email] = 0

        return jsonify({
            "sucesso": True,
            "alterar_senha": True,
            "email": email
        })

    # ERRO
    tentativas[email] = tentativas.get(email, 0) + 1

    if tentativas[email] >= 3:
        del codigos_2fa[email]
        registrar_log(email, "BLOQUEADO_2FA")

        return jsonify({
            "sucesso": False,
            "mensagem": "Bloqueado após 3 tentativas."
        })

    return jsonify({
        "sucesso": False,
        "mensagem": f"Código inválido ({tentativas[email]}/3)"
    })

@app.route("/alterar_senha", methods=["POST"])
def alterar_senha():

    dados = request.get_json()

    email = dados["email"].strip().lower()
    nova_senha = dados["nova_senha"]

    linhas = []

    with open(ARQUIVO, "r", encoding="utf-8") as f:

        for linha in f:

            campos = linha.strip().split(";")

            if len(campos) < 7:
                continue

            if campos[5].strip().lower() == email:
                campos[6] = nova_senha

            linhas.append(";".join(campos))

    with open(ARQUIVO, "w", encoding="utf-8") as f:

        for linha in linhas:
            f.write(linha + "\n")

    return jsonify({
        "sucesso": True,
        "mensagem": "Palavra-passe alterada com sucesso."
    })
# =========================
# REENVIAR CÓDIGO
# =========================
@app.route("/reenviar_codigo", methods=["POST"])
def reenviar_codigo():

    dados = request.get_json()
    email = dados["email"].strip().lower()

    if email not in codigos_2fa:
        return jsonify({
            "sucesso": False,
            "mensagem": "Nenhum login ativo."
        })

    # anti spam simples
    if tentativas.get(email, 0) >= 5:
        return jsonify({
            "sucesso": False,
            "mensagem": "Muitas tentativas."
        })

    return gerar_codigo_2fa(email)


# =========================
# RECUPERAR SENHA
# =========================
@app.route("/esqueceu_senha", methods=["POST"])
def esqueceu_senha():

    dados = request.get_json()
    email = dados["email"].strip().lower()

    with open(ARQUIVO, "r", encoding="utf-8") as f:

        for linha in f:

            campos = [c.strip() for c in linha.strip().split(";") if c.strip() != ""]
            if len(campos) >= 7:
                email_bd = campos[1].lower()
            elif len(campos) == 4:
                email_bd = campos[1].lower()
            elif len(campos) == 5:
                email_bd = campos[1].lower()
            else:
                continue

            if email_bd == email:
                return gerar_codigo_2fa(email)

    return jsonify({
        "sucesso": False,
        "mensagem": "Email não encontrado."
    })


# =========================
# RUN
# =========================
if __name__ == "__main__":
    app.run(debug=True)
