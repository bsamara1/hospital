from flask import Flask, request, jsonify
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

ARQUIVO = "utilizadores.txt"

# cria ficheiro se não existir
if not os.path.exists(ARQUIVO):
    open(ARQUIVO, "w", encoding="utf-8").close()


# =========================
# CRIAR CONTA
# =========================
@app.route("/criar_conta", methods=["POST"])
def criar_conta():

    dados = request.get_json()

    utilizador = dados["utilizador"]
    email = dados["email"]
    telefone = dados["telefone"]
    senha = dados["senha"]

    with open(ARQUIVO, "r", encoding="utf-8") as f:

        for linha in f:
            campos = linha.strip().split(";")

            if len(campos) < 4:
                continue

            if campos[0] == utilizador:
                return jsonify({
                    "sucesso": False,
                    "mensagem": "Utilizador já existe."
                })

            if campos[1] == email:
                return jsonify({
                    "sucesso": False,
                    "mensagem": "Email já registado."
                })

    with open(ARQUIVO, "a", encoding="utf-8") as f:
        f.write(f"{utilizador};{email};{telefone};{senha}\n")

    return jsonify({
        "sucesso": True,
        "mensagem": "Conta criada com sucesso."
    })


# =========================
# LOGIN (COM ADMIN FIXO)
# =========================
@app.route("/login", methods=["POST"])
def login():

    dados = request.get_json()

    utilizador = dados["utilizador"]
    senha = dados["senha"]

    # 🔐 LOGIN ADMIN FIXO
    if utilizador == "admin" and senha == "1234":
        return jsonify({
            "sucesso": True,
            "mensagem": "Login admin realizado com sucesso!",
            "tipo": "admin"
        })

    # 👤 LOGIN NORMAL (ficheiro)
    with open(ARQUIVO, "r", encoding="utf-8") as f:

        for linha in f:

            campos = linha.strip().split(";")

            if len(campos) < 4:
                continue

            if campos[0] == utilizador and campos[3] == senha:
                return jsonify({
                    "sucesso": True,
                    "mensagem": "Login realizado com sucesso!",
                    "tipo": "utilizador"
                })

    return jsonify({
        "sucesso": False,
        "mensagem": "Utilizador ou palavra-passe incorretos."
    })


if __name__ == "__main__":
    app.run(debug=True)