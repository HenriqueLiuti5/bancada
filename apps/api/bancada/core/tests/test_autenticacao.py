from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from bancada.core.autenticacao import INTERVALO_ENTRE_REGISTROS_DE_ACESSO, VALIDADE_DO_TOKEN
from bancada.tenants.models import Usuario


def vencer(token: Token) -> None:
    passado = timezone.now() - VALIDADE_DO_TOKEN - timedelta(minutes=1)
    Token.objects.filter(pk=token.pk).update(created=passado)


@pytest.mark.django_db
def test_pedido_autenticado_registra_o_ultimo_acesso(
    api_tecnico: APIClient, tecnico: Usuario
) -> None:
    antes = timezone.now()

    api_tecnico.get("/api/auth/eu/")

    tecnico.refresh_from_db()
    assert tecnico.ultimo_acesso is not None
    assert tecnico.ultimo_acesso >= antes


@pytest.mark.django_db
def test_acesso_recente_nao_e_gravado_de_novo(api_tecnico: APIClient, tecnico: Usuario) -> None:
    recente = timezone.now() - INTERVALO_ENTRE_REGISTROS_DE_ACESSO / 2
    Usuario.objects.filter(pk=tecnico.pk).update(ultimo_acesso=recente)

    api_tecnico.get("/api/auth/eu/")

    tecnico.refresh_from_db()
    assert tecnico.ultimo_acesso == recente


@pytest.mark.django_db
def test_acesso_antigo_e_atualizado(api_tecnico: APIClient, tecnico: Usuario) -> None:
    antigo = timezone.now() - INTERVALO_ENTRE_REGISTROS_DE_ACESSO - timedelta(minutes=1)
    Usuario.objects.filter(pk=tecnico.pk).update(ultimo_acesso=antigo)

    api_tecnico.get("/api/auth/eu/")

    tecnico.refresh_from_db()
    assert tecnico.ultimo_acesso is not None
    assert tecnico.ultimo_acesso > antigo


@pytest.mark.django_db
def test_token_invalido_nao_registra_nada(tecnico: Usuario) -> None:
    cliente_api = APIClient()
    cliente_api.credentials(HTTP_AUTHORIZATION="Token inexistente")

    assert cliente_api.get("/api/auth/eu/").status_code == 401

    tecnico.refresh_from_db()
    assert tecnico.ultimo_acesso is None


@pytest.mark.django_db
def test_token_vencido_e_recusado(api_tecnico: APIClient, tecnico: Usuario) -> None:
    vencer(Token.objects.get(user=tecnico))

    assert api_tecnico.get("/api/auth/eu/").status_code == 401


@pytest.mark.django_db
def test_token_dentro_da_validade_continua_valendo(
    api_tecnico: APIClient, tecnico: Usuario
) -> None:
    quase_vencido = timezone.now() - VALIDADE_DO_TOKEN + timedelta(minutes=1)
    Token.objects.filter(user=tecnico).update(created=quase_vencido)

    assert api_tecnico.get("/api/auth/eu/").status_code == 200


@pytest.mark.django_db
def test_login_troca_o_token_vencido_por_um_novo(tecnico: Usuario) -> None:
    antigo = Token.objects.create(user=tecnico)
    vencer(antigo)

    resposta = APIClient().post(
        "/api/auth/login/",
        {"email": "joana@central.test", "password": "senha-de-teste"},
        format="json",
    )

    novo = resposta.json()["token"]
    assert novo != antigo.key
    cliente_api = APIClient()
    cliente_api.credentials(HTTP_AUTHORIZATION=f"Token {novo}")
    assert cliente_api.get("/api/auth/eu/").status_code == 200
