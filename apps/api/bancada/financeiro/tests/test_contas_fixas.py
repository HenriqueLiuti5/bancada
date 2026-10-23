from datetime import date
from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from bancada.financeiro.models import (
    ContaAPagar,
    ContaFixa,
    PagamentoDaConta,
    no_dia,
    no_mes_seguinte,
)
from bancada.financeiro.tasks import criar_contas_fixas
from bancada.financeiro.tests.conftest import daqui_a, lancar
from bancada.tenants.models import Loja, Tenant, Usuario

HOJE = date(2026, 10, 22)


def aluguel(tenant: Tenant, vencimento: date, **campos: object) -> ContaAPagar:
    return ContaAPagar.lancar(
        tenant=tenant,
        descricao="Aluguel",
        categoria="aluguel",
        valor=Decimal("1500.00"),
        vencimento=vencimento,
        hoje=HOJE,
        repetir=True,
        **campos,  # type: ignore[arg-type]
    )


def vencimentos(conta_fixa: ContaFixa) -> list[date]:
    return list(conta_fixa.contas.order_by("vencimento").values_list("vencimento", flat=True))


def test_o_dia_31_cai_no_ultimo_dia_dos_meses_mais_curtos() -> None:
    assert no_dia(2027, 2, 31) == date(2027, 2, 28)
    assert no_dia(2028, 2, 30) == date(2028, 2, 29)
    assert no_mes_seguinte(date(2027, 1, 31), 31) == date(2027, 2, 28)
    assert no_mes_seguinte(date(2027, 2, 28), 31) == date(2027, 3, 31)
    assert no_mes_seguinte(date(2026, 12, 10), 10) == date(2027, 1, 10)


@pytest.mark.django_db
def test_a_conta_do_mes_seguinte_aparece_um_mes_antes_de_vencer(
    tenant: Tenant, dono: Usuario
) -> None:
    conta = aluguel(tenant, date(2026, 11, 10), usuario=dono, fornecedor="Imobiliária Centro")

    conta_fixa = ContaFixa.objects.get()
    assert conta.conta_fixa == conta_fixa
    assert (conta_fixa.dia, conta_fixa.criada_por, conta_fixa.ativa) == (10, dono, True)
    assert vencimentos(conta_fixa) == [date(2026, 11, 10)]

    conta_fixa.criar_as_proximas(date(2026, 11, 8))
    assert vencimentos(conta_fixa) == [date(2026, 11, 10)]

    conta_fixa.criar_as_proximas(date(2026, 11, 9))
    assert vencimentos(conta_fixa) == [date(2026, 11, 10), date(2026, 12, 10)]

    proxima = conta_fixa.contas.get(vencimento=date(2026, 12, 10))
    assert (proxima.descricao, proxima.valor, proxima.fornecedor) == (
        "Aluguel",
        Decimal("1500.00"),
        "Imobiliária Centro",
    )
    assert (proxima.lancada_por, proxima.paga) == (None, False)


@pytest.mark.django_db
def test_lancada_com_vencimento_no_passado_nao_cria_meses_atrasados(tenant: Tenant) -> None:
    aluguel(tenant, date(2026, 6, 10))

    conta_fixa = ContaFixa.objects.get()
    assert vencimentos(conta_fixa) == [date(2026, 6, 10), date(2026, 11, 10)]
    assert conta_fixa.ultimo_vencimento == date(2026, 11, 10)


@pytest.mark.django_db
def test_rodar_de_novo_nao_duplica_e_a_conta_removida_nao_volta(tenant: Tenant) -> None:
    aluguel(tenant, date(2026, 10, 20))
    conta_fixa = ContaFixa.objects.get()
    assert vencimentos(conta_fixa) == [date(2026, 10, 20), date(2026, 11, 20)]

    assert conta_fixa.criar_as_proximas(HOJE) == []
    conta_fixa.contas.get(vencimento=date(2026, 11, 20)).delete()
    assert conta_fixa.criar_as_proximas(HOJE) == []

    assert vencimentos(conta_fixa) == [date(2026, 10, 20)]


@pytest.mark.django_db
def test_mudar_tambem_as_proximas_leva_a_mudanca_para_a_repeticao(
    api_dono: APIClient, tenant: Tenant, shopping: Loja
) -> None:
    resposta = lancar(
        api_dono, descricao="Aluguel", vencimento=daqui_a(-2).isoformat(), repetir=True
    )
    assert resposta.status_code == 201
    assert resposta.json()["repete"] is True
    assert resposta.json()["dia_da_repeticao"] == daqui_a(-2).day

    primeira, segunda = ContaAPagar.objects.order_by("vencimento")
    primeira.pagar(PagamentoDaConta(daqui_a(0), "pix"))

    mudada = api_dono.patch(
        f"/api/contas-a-pagar/{segunda.pk}/",
        {
            "valor": "1650.00",
            "loja": shopping.pk,
            "vencimento": no_dia(segunda.vencimento.year, segunda.vencimento.month, 5).isoformat(),
            "tambem_nas_proximas": True,
        },
        format="json",
    )
    assert mudada.status_code == 200

    conta_fixa = ContaFixa.objects.get()
    assert (conta_fixa.valor, conta_fixa.loja, conta_fixa.dia) == (
        Decimal("1650.00"),
        shopping,
        5,
    )
    primeira.refresh_from_db()
    assert primeira.valor == Decimal("250.00")

    conta_fixa.criar_as_proximas(segunda.vencimento)
    terceira = conta_fixa.contas.order_by("vencimento").last()
    assert terceira is not None
    assert (terceira.valor, terceira.loja, terceira.vencimento.day) == (
        Decimal("1650.00"),
        shopping,
        5,
    )


@pytest.mark.django_db
def test_mudar_so_esta_conta_nao_mexe_na_repeticao(tenant: Tenant) -> None:
    conta = aluguel(tenant, date(2026, 10, 20))
    proxima = ContaAPagar.objects.get(vencimento=date(2026, 11, 20))

    conta.valor = Decimal("1580.00")
    conta.save()

    proxima.refresh_from_db()
    assert proxima.valor == Decimal("1500.00")
    assert ContaFixa.objects.get().valor == Decimal("1500.00")


@pytest.mark.django_db
def test_mudar_as_proximas_atualiza_as_ja_criadas_que_nao_foram_pagas(tenant: Tenant) -> None:
    conta = aluguel(tenant, date(2026, 10, 20))
    proxima = ContaAPagar.objects.get(vencimento=date(2026, 11, 20))

    conta.valor = Decimal("1580.00")
    conta.vencimento = date(2026, 10, 18)
    conta.save()
    conta.mudar_tambem_as_proximas()

    proxima.refresh_from_db()
    assert (proxima.valor, proxima.vencimento) == (Decimal("1580.00"), date(2026, 11, 18))


@pytest.mark.django_db
def test_parar_de_repetir_tira_as_proximas_sem_pagamento(
    api_dono: APIClient, tenant: Tenant
) -> None:
    conta = aluguel(tenant, date(2026, 10, 20))
    conta_fixa = ContaFixa.objects.get()

    resposta = api_dono.post(f"/api/contas-a-pagar/{conta.pk}/parar-de-repetir/")

    assert resposta.status_code == 200
    assert (resposta.json()["repete"], resposta.json()["dia_da_repeticao"]) == (False, None)
    conta_fixa.refresh_from_db()
    assert conta_fixa.ativa is False
    assert vencimentos(conta_fixa) == [date(2026, 10, 20)]
    assert conta_fixa.criar_as_proximas(date(2027, 3, 1)) == []


@pytest.mark.django_db
def test_parar_de_repetir_guarda_as_proximas_que_ja_foram_pagas(tenant: Tenant) -> None:
    conta = aluguel(tenant, date(2026, 10, 20))
    adiantada = ContaAPagar.objects.get(vencimento=date(2026, 11, 20))
    adiantada.pagar(PagamentoDaConta(HOJE, "pix"))

    conta.parar_de_repetir()

    assert ContaAPagar.objects.count() == 2


@pytest.mark.django_db
def test_tarefa_diaria_cria_as_contas_de_todas_as_assistencias(
    tenant: Tenant, outro_tenant: Tenant, monkeypatch: pytest.MonkeyPatch
) -> None:
    aluguel(tenant, date(2026, 10, 10))
    aluguel(outro_tenant, date(2026, 10, 15))
    parada = aluguel(outro_tenant, date(2026, 10, 20))
    parada.parar_de_repetir()
    monkeypatch.setattr("bancada.financeiro.tasks.hoje_no_bancada", lambda: date(2026, 11, 15))

    assert criar_contas_fixas() == 2
    assert criar_contas_fixas() == 0

    assert sorted(
        ContaAPagar.objects.filter(vencimento__gt=date(2026, 11, 20)).values_list(
            "tenant", "vencimento"
        )
    ) == [(tenant.pk, date(2026, 12, 10)), (outro_tenant.pk, date(2026, 12, 15))]
