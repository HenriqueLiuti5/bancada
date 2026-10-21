from decimal import Decimal

import pytest
from django.db import ProgrammingError, transaction

from bancada.core.rls import aplicar_tenant
from bancada.estoque.models import (
    ItemDaVenda,
    LinhaDaVenda,
    MovimentoDeEstoque,
    PagamentoDaVenda,
    Produto,
    Venda,
)
from bancada.ordens.models import Recebimento
from bancada.tenants.models import Loja, Tenant


@pytest.mark.django_db(transaction=False)
def test_a_trava_do_banco_vale_para_o_estoque_e_as_vendas(
    tenant: Tenant, loja: Loja, capa: Produto
) -> None:
    Venda.registrar(
        tenant=tenant,
        loja=loja,
        linhas=[LinhaDaVenda(capa, 1)],
        valor_cobrado=Decimal("39.90"),
        pagamentos=[Recebimento("pix", Decimal("39.90"))],
    )

    aplicar_tenant(-1)

    for modelo in [Produto, MovimentoDeEstoque, Venda, ItemDaVenda, PagamentoDaVenda]:
        assert modelo.objects.count() == 0, modelo.__name__


@pytest.mark.django_db(transaction=False)
def test_nao_grava_produto_para_outra_assistencia(tenant: Tenant, outro_tenant: Tenant) -> None:
    aplicar_tenant(tenant.pk)

    with pytest.raises(ProgrammingError), transaction.atomic():
        Produto.objects.create(tenant=outro_tenant, nome="Intruso")
