from typing import Any

import pytest
from rest_framework.test import APIClient

from bancada.auditoria.models import Acao, RegistroDeAuditoria
from bancada.tenants.models import Usuario
from bancada.tenants.tentativas import FALHAS_ATE_BLOQUEAR


def entrar(email: str, senha: str, encaminhado: str | None = None) -> Any:
    extras: dict[str, Any] = {"HTTP_X_FORWARDED_FOR": encaminhado} if encaminhado else {}
    return APIClient().post(
        "/api/auth/login/", {"email": email, "password": senha}, format="json", **extras
    )


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


@pytest.mark.django_db
def test_trocar_de_endereco_nao_escapa_do_bloqueio_do_email(tecnico: Usuario) -> None:
    for numero in range(FALHAS_ATE_BLOQUEAR):
        resposta = entrar("joana@central.test", "errada", f"198.51.100.{numero}")
        assert resposta.status_code == 401

    resposta = entrar("joana@central.test", "senha-de-teste", "198.51.100.200")

    assert resposta.status_code == 429
    assert "Esqueci minha senha" in resposta.json()["detail"]


@pytest.mark.django_db
def test_email_sem_conta_e_bloqueado_do_mesmo_jeito(db: None) -> None:
    for numero in range(FALHAS_ATE_BLOQUEAR):
        entrar("ninguem@central.test", "errada", f"198.51.100.{numero}")

    assert entrar("ninguem@central.test", "errada", "198.51.100.200").status_code == 429


@pytest.mark.django_db
def test_login_certo_zera_as_falhas_do_email(tecnico: Usuario) -> None:
    for numero in range(FALHAS_ATE_BLOQUEAR - 1):
        entrar("joana@central.test", "errada", f"198.51.100.{numero}")
    assert entrar("joana@central.test", "senha-de-teste", "198.51.100.100").status_code == 200

    for numero in range(FALHAS_ATE_BLOQUEAR - 1):
        entrar("joana@central.test", "errada", f"203.0.113.{numero}")

    assert entrar("joana@central.test", "senha-de-teste", "203.0.113.100").status_code == 200


@pytest.mark.django_db
def test_senha_errada_fica_na_auditoria_com_o_endereco_do_visitante(tecnico: Usuario) -> None:
    entrar("joana@central.test", "errada", "203.0.113.9, 198.51.100.4")

    registro = RegistroDeAuditoria.objects.get()
    assert registro.acao == Acao.LOGIN_RECUSADO
    assert registro.usuario == tecnico
    assert registro.origem == "198.51.100.4"


@pytest.mark.django_db
def test_email_sem_conta_nao_gera_registro_de_auditoria(db: None) -> None:
    entrar("ninguem@central.test", "errada")

    assert RegistroDeAuditoria.objects.count() == 0


@pytest.mark.django_db
def test_limite_por_endereco_ignora_o_que_o_visitante_inventa(db: None) -> None:
    respostas = [
        entrar(f"pessoa{numero}@central.test", "errada", f"10.0.0.{numero}, 198.51.100.7")
        for numero in range(25)
    ]

    assert 429 in [resposta.status_code for resposta in respostas]
