from typing import TYPE_CHECKING, Any

import pytest

from bancada.clientes.models import Aparelho, Cliente
from bancada.ordens.models import OrdemServico
from bancada.tenants.models import Loja, Papel, Tenant, Usuario

if TYPE_CHECKING:
    from rest_framework.test import APIClient


@pytest.fixture
def tenant(db: None) -> Tenant:
    return Tenant.objects.create(nome="Assistência Central")


@pytest.fixture
def outro_tenant(db: None) -> Tenant:
    return Tenant.objects.create(nome="Celular Express")


@pytest.fixture
def loja(tenant: Tenant) -> Loja:
    return Loja.objects.create(tenant=tenant, nome="Matriz")


@pytest.fixture
def tecnico(tenant: Tenant) -> Usuario:
    return Usuario.objects.create_user(
        username="joana",
        password="senha-de-teste",
        tenant=tenant,
        papel=Papel.TECNICO,
    )


@pytest.fixture
def cliente(tenant: Tenant) -> Cliente:
    return Cliente.objects.create(tenant=tenant, nome="Maria Souza", telefone="11999990000")


@pytest.fixture
def aparelho(tenant: Tenant, cliente: Cliente) -> Aparelho:
    return Aparelho.objects.create(
        tenant=tenant,
        cliente=cliente,
        marca="Motorola",
        modelo="Moto G54",
        imei="358240051111110",
        senha_desbloqueio="1234",
    )


@pytest.fixture
def ordem(tenant: Tenant, loja: Loja, cliente: Cliente, aparelho: Aparelho) -> OrdemServico:
    return OrdemServico.abrir(
        tenant=tenant,
        loja=loja,
        cliente=cliente,
        aparelho=aparelho,
        problema_relatado="Não carrega",
    )


@pytest.fixture
def api_tecnico(tecnico: Usuario) -> "APIClient":
    from rest_framework.authtoken.models import Token
    from rest_framework.test import APIClient

    cliente_api = APIClient()
    token, _ = Token.objects.get_or_create(user=tecnico)
    cliente_api.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    return cliente_api


@pytest.fixture
def intruso(outro_tenant: Tenant) -> Usuario:
    return Usuario.objects.create_user(
        username="intruso",
        password="senha-de-teste",
        tenant=outro_tenant,
        papel=Papel.ATENDENTE,
    )


@pytest.fixture
def api_intruso(intruso: Usuario) -> "APIClient":
    from rest_framework.authtoken.models import Token
    from rest_framework.test import APIClient

    cliente_api = APIClient()
    token, _ = Token.objects.get_or_create(user=intruso)
    cliente_api.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    return cliente_api


@pytest.fixture(autouse=True)
def hash_rapido_de_senha(settings: Any) -> None:
    settings.PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]


@pytest.fixture(autouse=True)
def celery_no_mesmo_processo(settings: Any) -> None:
    settings.CELERY_TASK_ALWAYS_EAGER = True
    settings.CELERY_TASK_EAGER_PROPAGATES = True
