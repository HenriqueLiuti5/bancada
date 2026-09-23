import pytest

from bancada.clientes.models import Aparelho, Cliente
from bancada.ordens.models import OrdemServico
from bancada.tenants.models import Loja, Tenant


@pytest.fixture
def cliente_com_email(tenant: Tenant) -> Cliente:
    return Cliente.objects.create(
        tenant=tenant,
        nome="Maria Souza",
        telefone="11999990000",
        email="maria@exemplo.com",
    )


@pytest.fixture
def ordem_de_quem_tem_email(
    tenant: Tenant, loja: Loja, cliente_com_email: Cliente, aparelho: Aparelho
) -> OrdemServico:
    aparelho.cliente = cliente_com_email
    aparelho.save(update_fields=["cliente"])
    return OrdemServico.abrir(
        tenant=tenant,
        loja=loja,
        cliente=cliente_com_email,
        aparelho=aparelho,
        problema_relatado="Não carrega",
    )
