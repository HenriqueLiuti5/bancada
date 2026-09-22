import pytest
from rest_framework.test import APIClient

from bancada.tenants.models import Usuario


@pytest.mark.django_db
def test_login_devolve_token_e_usuario(tecnico: Usuario) -> None:
    resposta = APIClient().post(
        "/api/auth/login/",
        {"username": "joana", "password": "senha-de-teste"},
        format="json",
    )

    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["token"]
    assert corpo["usuario"]["papel"] == "tecnico"
    assert corpo["usuario"]["tenant"]["nome"] == "Assistência Central"


@pytest.mark.django_db
def test_login_com_senha_errada_da_401(tecnico: Usuario) -> None:
    resposta = APIClient().post(
        "/api/auth/login/",
        {"username": "joana", "password": "errada"},
        format="json",
    )

    assert resposta.status_code == 401


@pytest.mark.django_db
def test_usuario_sem_assistencia_nao_entra(db: None) -> None:
    Usuario.objects.create_user(username="solto", password="senha-de-teste")

    resposta = APIClient().post(
        "/api/auth/login/",
        {"username": "solto", "password": "senha-de-teste"},
        format="json",
    )

    assert resposta.status_code == 403


@pytest.mark.django_db
def test_logout_invalida_o_token(api_tecnico: APIClient) -> None:
    assert api_tecnico.post("/api/auth/logout/").status_code == 204
    assert api_tecnico.get("/api/auth/eu/").status_code == 401
