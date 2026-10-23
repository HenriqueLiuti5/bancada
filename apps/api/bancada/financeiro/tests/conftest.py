from datetime import date, timedelta
from typing import Any

import pytest
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from bancada.tenants.models import Loja, Papel, Tenant, Usuario


def api_de(usuario: Usuario) -> APIClient:
    cliente_api = APIClient()
    token, _ = Token.objects.get_or_create(user=usuario)
    cliente_api.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    return cliente_api


def daqui_a(dias: int) -> date:
    return timezone.localdate() + timedelta(days=dias)


def lancar(api: APIClient, **dados: Any) -> Any:
    conta = {
        "descricao": "Conta de luz",
        "categoria": "contas_da_loja",
        "valor": "250.00",
        "vencimento": daqui_a(5).isoformat(),
        **dados,
    }
    return api.post("/api/contas-a-pagar/", conta, format="json")


@pytest.fixture
def dono(tenant: Tenant) -> Usuario:
    return Usuario.objects.create_user(
        username="marcos@central.test",
        email="marcos@central.test",
        password="senha-de-teste",
        tenant=tenant,
        papel=Papel.DONO,
        first_name="Marcos",
    )


@pytest.fixture
def api_dono(dono: Usuario) -> APIClient:
    return api_de(dono)


@pytest.fixture
def dono_de_fora(outro_tenant: Tenant) -> Usuario:
    return Usuario.objects.create_user(
        username="rita@express.test",
        email="rita@express.test",
        password="senha-de-teste",
        tenant=outro_tenant,
        papel=Papel.DONO,
    )


@pytest.fixture
def shopping(tenant: Tenant) -> Loja:
    return Loja.objects.create(tenant=tenant, nome="Shopping")
