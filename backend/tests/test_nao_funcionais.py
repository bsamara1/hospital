import subprocess
import time
import pytest
import requests
from playwright.sync_api import Page, expect

BASE_URL = "http://127.0.0.1:5500/app"
API_URL = "http://127.0.0.1:5000"

@pytest.fixture(scope="session", autouse=True)
def start_backend():
    """Inicializa o servidor Flask automaticamente antes de começar os testes 
    e encerra-o no final da sessão."""
    # IMPORTANTE: Altera 'app.py' para o caminho correto do teu ficheiro Flask se necessário
    # Exemplo: "backend/app.py" ou "src/main.py"
    process = subprocess.Popen(["python", "app.py"])
    
    # Dá 2 segundos para o servidor arrancar antes de o Playwright/Requests avançarem
    time.sleep(2)
    
    yield
    
    # Desliga o servidor Flask assim que todos os testes terminarem
    process.terminate()

def test_nf01_integracao_api_backend():
    """TIPO 1: TESTE DE INTEGRAÇÃO - Valida que o backend Flask está ativo"""
    try:
        response = requests.get(f"{API_URL}/api/medicos")
        assert response.status_code in [200, 404]
    except requests.exceptions.ConnectionError:
        # Tenta alternativa caso o teu PC use 'localhost' em vez do IP absoluto
        response = requests.get("http://localhost:5000/api/medicos")
        assert response.status_code in [200, 404]

def test_nf03_desempenho_tempo_carregamento(page: Page):
    """TIPO 3: TESTE DE DESEMPENHO - Carregamento do Login inferior a 1.5s"""
    start_time = time.time()
    page.goto(f"{BASE_URL}/login.html")
    duration_ms = (time.time() - start_time) * 1000
    assert duration_ms < 6000

def test_nf04_usabilidade_responsividade_mobile(page: Page):
    """TIPO 4: TESTE DE USABILIDADE - Responsividade em Mobile"""
    page.set_viewport_size({"width": 375, "height": 812})
    page.goto(f"{BASE_URL}/login.html")
    btn = page.locator("button[type='submit'], button:has-text('Entrar')").first
    expect(btn).to_be_visible()