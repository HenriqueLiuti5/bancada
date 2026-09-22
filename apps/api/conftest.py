import pytest

from bancada.clientes.models import Aparelho, Cliente
from bancada.ordens.models import OrdemServico
from bancada.tenants.models import Loja, Papel, Tenant, Usuario


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
