from datetime import date
from decimal import Decimal

import pytest
from django.db import ProgrammingError, transaction

from bancada.core.rls import aplicar_tenant
from bancada.financeiro.models import ContaAPagar, ContaFixa
from bancada.tenants.models import Tenant


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
