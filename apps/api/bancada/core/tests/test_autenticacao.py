from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from bancada.core.autenticacao import INTERVALO_ENTRE_REGISTROS_DE_ACESSO
from bancada.tenants.models import Usuario


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
