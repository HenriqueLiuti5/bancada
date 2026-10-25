from datetime import date
from decimal import Decimal

import pytest
from django.db import ProgrammingError, transaction

from bancada.core.rls import aplicar_tenant
from bancada.financeiro.models import (
    ConferenciaDoCaixa,
    ContaAPagar,
    ContaFixa,
    MovimentoDoCaixa,
)
from bancada.tenants.models import Loja, Tenant


@pytest.mark.django_db(transaction=False)
def test_a_trava_do_banco_vale_para_as_contas(tenant: Tenant) -> None:
    ContaAPagar.lancar(
        tenant=tenant,
        descricao="Aluguel",
        categoria="aluguel",
        valor=Decimal("1500.00"),
        vencimento=date(2026, 10, 20),
        hoje=date(2026, 10, 22),
        repetir=True,
    )

    aplicar_tenant(-1)

    for modelo in [ContaAPagar, ContaFixa]:
        assert modelo.objects.count() == 0, modelo.__name__


@pytest.mark.django_db(transaction=False)
def test_a_trava_do_banco_vale_para_o_caixa(tenant: Tenant, loja: Loja) -> None:
    MovimentoDoCaixa.objects.create(tenant=tenant, loja=loja, tipo="reforco", valor=Decimal("5"))
    ConferenciaDoCaixa.objects.create(
        tenant=tenant,
        loja=loja,
        dia=date(2026, 10, 25),
        contado=Decimal("100"),
        na_gaveta=Decimal("100"),
        movimento_do_dia=Decimal("0"),
    )

    aplicar_tenant(-1)

    for modelo in [MovimentoDoCaixa, ConferenciaDoCaixa]:
        assert modelo.objects.count() == 0, modelo.__name__


@pytest.mark.django_db(transaction=False)
def test_nao_grava_no_caixa_de_outra_assistencia(
    tenant: Tenant, outro_tenant: Tenant, loja: Loja
) -> None:
    aplicar_tenant(outro_tenant.pk)

    with pytest.raises(ProgrammingError), transaction.atomic():
        MovimentoDoCaixa.objects.create(
            tenant=tenant, loja=loja, tipo="retirada", valor=Decimal("5")
        )


@pytest.mark.django_db(transaction=False)
def test_nao_grava_conta_para_outra_assistencia(tenant: Tenant, outro_tenant: Tenant) -> None:
    aplicar_tenant(tenant.pk)

    with pytest.raises(ProgrammingError), transaction.atomic():
        ContaAPagar.objects.create(
            tenant=outro_tenant,
            descricao="Intrusa",
            categoria="outras",
            valor=Decimal("1.00"),
            vencimento=date(2026, 10, 22),
        )
