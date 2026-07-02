from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_mail import Mail, Message
import os
import random
import time
from datetime import datetime

app = Flask(__name__)
CORS(app)

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

LOG_FILE = "logs_login.txt"
ARQUIVO = "utilizadores.txt"

# =========================
# CRIAR FICHEIROS
# =========================
if not os.path.exists(ARQUIVO):
    open(ARQUIVO, "w", encoding="utf-8").close()

if not os.path.exists(LOG_FILE):
    open(LOG_FILE, "w", encoding="utf-8").close()

# =========================
# LOGS
# =========================
def registrar_log(email, status):
    data = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(f"{email};{status};{data}\n")


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
# LOGIN + 2FA
# =========================
@app.route("/login", methods=["POST"])
def login():

    dados = request.get_json()

    email = dados["email"].strip().lower()
    senha = dados["senha"]

    # ADMIN FIXO
    if email == "admin@hospital.cv" and senha == "1234":

        registrar_log(email, "LOGIN_SUCESSO")

        return jsonify({
            "sucesso": True,
            "tipo": "admin"
        })

    # UTILIZADOR NORMAL
    with open(ARQUIVO, "r", encoding="utf-8") as f:

        for linha in f:

            campos = linha.strip().split(";")

            if len(campos) < 7:
                continue

            email_bd = campos[5].strip().lower()
            senha_bd = campos[6]

            if email_bd == email and senha_bd == senha:

                registrar_log(email, "LOGIN_SUCESSO")

                return jsonify({
                    "sucesso": True,
                    "tipo": "utilizador"
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

            campos = linha.strip().split(";")

            if len(campos) < 7:
                continue

            if campos[1].strip().lower() == email:

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