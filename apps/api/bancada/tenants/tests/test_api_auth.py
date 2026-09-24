from typing import Any

import pytest
from rest_framework.test import APIClient

from bancada.tenants.models import Usuario


def entrar(email: str, senha: str) -> Any:
    return APIClient().post("/api/auth/login/", {"email": email, "password": senha}, format="json")


@pytest.mark.django_db
def test_login_por_email_devolve_token_e_usuario(tecnico: Usuario) -> None:
    resposta = entrar("joana@central.test", "senha-de-teste")

    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["token"]
    assert corpo["usuario"]["papel"] == "tecnico"
    assert corpo["usuario"]["tenant"]["nome"] == "Assistência Central"


@pytest.mark.django_db
def test_login_ignora_maiusculas_e_espacos_no_email(tecnico: Usuario) -> None:
    assert entrar("  Joana@Central.TEST ", "senha-de-teste").status_code == 200


@pytest.mark.django_db
def test_login_pelo_nome_de_usuario_nao_funciona_mais(tecnico: Usuario) -> None:
    resposta = APIClient().post(
        "/api/auth/login/",
        {"username": "joana", "password": "senha-de-teste"},
        format="json",
    )

    assert resposta.status_code == 400


@pytest.mark.django_db
def test_login_com_senha_errada_da_401(tecnico: Usuario) -> None:
    assert entrar("joana@central.test", "errada").status_code == 401


@pytest.mark.django_db
def test_email_desconhecido_da_a_mesma_resposta_que_senha_errada(tecnico: Usuario) -> None:
    desconhecido = entrar("ninguem@central.test", "senha-de-teste")
    errada = entrar("joana@central.test", "errada")

    assert desconhecido.status_code == errada.status_code == 401
    assert desconhecido.json() == errada.json()


@pytest.mark.django_db
def test_usuario_desativado_nao_entra(tecnico: Usuario) -> None:
    tecnico.is_active = False
    tecnico.save(update_fields=["is_active"])

    assert entrar("joana@central.test", "senha-de-teste").status_code == 401


@pytest.mark.django_db
def test_usuario_sem_assistencia_nao_entra(db: None) -> None:
    Usuario.objects.create_user(
        username="solto", email="solto@central.test", password="senha-de-teste"
    )

    assert entrar("solto@central.test", "senha-de-teste").status_code == 403


@pytest.mark.django_db
def test_logout_invalida_o_token(api_tecnico: APIClient) -> None:
    assert api_tecnico.post("/api/auth/logout/").status_code == 204
    assert api_tecnico.get("/api/auth/eu/").status_code == 401


@pytest.mark.django_db
def test_muitas_tentativas_de_login_sao_barradas(tecnico: Usuario) -> None:
    respostas = [entrar("joana@central.test", "errada").status_code for _ in range(25)]

    assert 429 in respostas
