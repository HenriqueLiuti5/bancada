from decimal import Decimal

import pytest
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from bancada.estoque.models import Produto, TipoDeProduto
from bancada.tenants.models import Loja, Papel, Tenant, Usuario


def api_de(usuario: Usuario) -> APIClient:
    cliente_api = APIClient()
    token, _ = Token.objects.get_or_create(user=usuario)
    cliente_api.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    return cliente_api


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
def tela(tenant: Tenant, loja: Loja) -> Produto:
    produto = Produto.objects.create(
        tenant=tenant,
        nome="Tela Moto G54",
        codigo="7891234567890",
        custo=Decimal("180.00"),
        preco=Decimal("320.00"),
        minimo=2,
    )
    produto.registrar_estoque_inicial(loja=loja, quantidade=3)
    return produto


@pytest.fixture
def capa(tenant: Tenant, loja: Loja) -> Produto:
    produto = Produto.objects.create(
        tenant=tenant,
        nome="Capa Moto G54",
        tipo=TipoDeProduto.ACESSORIO,
        custo=Decimal("12.00"),
        preco=Decimal("39.90"),
    )
    produto.registrar_estoque_inicial(loja=loja, quantidade=10)
    return produto


@pytest.fixture
def shopping(tenant: Tenant) -> Loja:
    return Loja.objects.create(tenant=tenant, nome="Shopping")
