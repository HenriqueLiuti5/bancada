import pytest
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from bancada.tenants.models import Papel, Tenant, Usuario


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
    cliente_api = APIClient()
    token, _ = Token.objects.get_or_create(user=dono)
    cliente_api.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    return cliente_api
