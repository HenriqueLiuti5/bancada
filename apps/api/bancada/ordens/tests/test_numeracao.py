import pytest

from bancada.clientes.models import Aparelho, Cliente
from bancada.ordens.models import OrdemServico
from bancada.tenants.models import Loja, Tenant


def _abrir(tenant: Tenant, loja: Loja, cliente: Cliente, aparelho: Aparelho) -> OrdemServico:
    return OrdemServico.abrir(
        tenant=tenant,
        loja=loja,
        cliente=cliente,
        aparelho=aparelho,
        problema_relatado="Tela trincada",
    )


@pytest.mark.django_db
def test_numeracao_comeca_em_um_e_avanca(
    tenant: Tenant, loja: Loja, cliente: Cliente, aparelho: Aparelho
) -> None:
    primeira = _abrir(tenant, loja, cliente, aparelho)
    segunda = _abrir(tenant, loja, cliente, aparelho)

    assert primeira.numero == 1
    assert segunda.numero == 2


@pytest.mark.django_db
def test_cada_assistencia_tem_a_propria_numeracao(
    tenant: Tenant,
    outro_tenant: Tenant,
    loja: Loja,
    cliente: Cliente,
    aparelho: Aparelho,
) -> None:
    _abrir(tenant, loja, cliente, aparelho)
    _abrir(tenant, loja, cliente, aparelho)

    outra_loja = Loja.objects.create(tenant=outro_tenant, nome="Loja 1")
    outro_cliente = Cliente.objects.create(tenant=outro_tenant, nome="João", telefone="11988887777")
    outro_aparelho = Aparelho.objects.create(
        tenant=outro_tenant, cliente=outro_cliente, marca="Samsung", modelo="A15"
    )

    primeira_do_outro = _abrir(outro_tenant, outra_loja, outro_cliente, outro_aparelho)

    assert primeira_do_outro.numero == 1


@pytest.mark.django_db
def test_token_publico_e_unico_e_nao_sequencial(
    tenant: Tenant, loja: Loja, cliente: Cliente, aparelho: Aparelho
) -> None:
    tokens = {_abrir(tenant, loja, cliente, aparelho).token_publico for _ in range(5)}

    assert len(tokens) == 5
    assert all(len(token) >= 10 for token in tokens)
