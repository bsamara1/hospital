FROM python:3.11-slim

WORKDIR /app

RUN pip install flask flask-cors flask-mail python-dotenv

COPY app/ app/
COPY *.txt ./
COPY backend/ backend/

EXPOSE 5000

CMD ["python", "backend/servidor.py"]
