from datetime import timedelta
from decimal import Decimal
from typing import Any

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from bancada.assinaturas.models import Assinatura, SituacaoDaAssinatura, SituacaoDaFatura
from bancada.plataforma.meses import Mes
from bancada.plataforma.models import Custo
from bancada.plataforma.numeros import PAROU, SEM_ORDENS, alerta
from bancada.plataforma.tests.conftest import (
    abrir_ordem,
    contratar,
    dono_da,
    fatura,
    nova_assistencia,
)
from bancada.tenants.models import Usuario


def painel(api: APIClient, mes: str = "") -> Any:
    resposta = api.get(f"/api/plataforma/painel/?mes={mes}" if mes else "/api/plataforma/painel/")
    assert resposta.status_code == 200
    return resposta.json()


@pytest.mark.django_db
def test_lucro_do_mes_desconta_taxas_do_asaas_e_custos(api_plataforma: APIClient) -> None:
    hoje = timezone.localdate()
    mes = Mes.de(hoje)
    pix = contratar(nova_assistencia("Cell Point"))
    cartao = contratar(nova_assistencia("Fix Fone"))
    fatura(pix, vencimento=hoje, valor_liquido=Decimal("57.91"))
    fatura(cartao, vencimento=hoje, valor_liquido=Decimal("57.42"))
    fatura(pix, vencimento=mes.anterior.inicio, valor_liquido=Decimal("57.91"))
    fatura(cartao, vencimento=hoje + timedelta(days=40), situacao=SituacaoDaFatura.ABERTA)
    Custo.objects.create(mes=mes.inicio, descricao="Domínio", valor=Decimal("40.00"))
    Custo.objects.create(mes=mes.anterior.inicio, descricao="Servidor", valor=Decimal("30.00"))

    dinheiro = painel(api_plataforma)["dinheiro"]

    assert dinheiro["recebido"] == "119.80"
    assert dinheiro["faturas_pagas"] == 2
    assert dinheiro["taxas"] == "4.47"
    assert dinheiro["custos"] == "40.00"
    assert dinheiro["lucro"] == "75.33"
    assert [custo["descricao"] for custo in dinheiro["lista_de_custos"]] == ["Domínio"]


@pytest.mark.django_db
def test_mes_anterior_mostra_o_dinheiro_daquele_mes(api_plataforma: APIClient) -> None:
    anterior = Mes.de(timezone.localdate()).anterior
    assinatura = contratar(nova_assistencia("Cell Point", dias_desde_o_cadastro=60))
    fatura(assinatura, vencimento=anterior.inicio, valor_liquido=Decimal("57.91"))
    Custo.objects.create(mes=anterior.inicio, descricao="Servidor", valor=Decimal("30.00"))

    dinheiro = painel(api_plataforma, anterior.em_texto())["dinheiro"]

    assert dinheiro["recebido"] == "59.90"
    assert dinheiro["lucro"] == "27.91"


@pytest.mark.django_db
def test_fatura_paga_sem_valor_liquido_nao_inventa_taxa(api_plataforma: APIClient) -> None:
    assinatura = contratar(nova_assistencia("Cell Point"))
    fatura(assinatura, vencimento=timezone.localdate(), valor_liquido=None)

    dinheiro = painel(api_plataforma)["dinheiro"]

    assert dinheiro["recebido"] == "59.90"
    assert dinheiro["taxas"] == "0.00"


@pytest.mark.django_db
def test_receita_recorrente_soma_quem_esta_pagando(api_plataforma: APIClient) -> None:
    contratar(nova_assistencia("Ativa"))
    contratar(nova_assistencia("Atrasada"), situacao=SituacaoDaAssinatura.INADIMPLENTE)
    contratar(nova_assistencia("Mais cara"), valor=Decimal("89.90"))
    contratar(nova_assistencia("Suspensa"), situacao=SituacaoDaAssinatura.SUSPENSA)
    contratar(nova_assistencia("Cancelada"), situacao=SituacaoDaAssinatura.CANCELADA)
    nova_assistencia("Em teste")

    assinaturas = painel(api_plataforma)["assinaturas"]

    assert assinaturas["receita_recorrente"] == {"valor": "209.70", "assinaturas": 3}
    totais = {linha["situacao"]: linha["total"] for linha in assinaturas["por_situacao"]}
    assert totais == {"teste": 1, "ativa": 2, "inadimplente": 1, "suspensa": 1, "cancelada": 1}


@pytest.mark.django_db
def test_conversao_conta_so_quem_ja_decidiu(api_plataforma: APIClient) -> None:
    contratar(nova_assistencia("Assinou"))
    contratar(nova_assistencia("Assinou e cancelou"), situacao=SituacaoDaAssinatura.CANCELADA)
    Assinatura.objects.filter(tenant=nova_assistencia("Deixou o teste vencer")).update(
        teste_termina_em=timezone.localdate() - timedelta(days=1)
    )
    nova_assistencia("Ainda testando")

    conversao = painel(api_plataforma)["assinaturas"]["conversao"]

    assert conversao == {"assinaram": 2, "decidiram": 3, "taxa": 66.7}


@pytest.mark.django_db
def test_sem_ninguem_decidido_a_conversao_fica_vazia(api_plataforma: APIClient) -> None:
    nova_assistencia("Ainda testando")

    conversao = painel(api_plataforma)["assinaturas"]["conversao"]

    assert conversao == {"assinaram": 0, "decidiram": 0, "taxa": None}


@pytest.mark.django_db
def test_assinaturas_novas_e_canceladas_no_mes(api_plataforma: APIClient) -> None:
    contratar(nova_assistencia("Nova"))
    contratar(nova_assistencia("Antiga"), dias_desde_a_assinatura=70)
    cancelada = contratar(nova_assistencia("Cancelou"), dias_desde_a_assinatura=70)
    cancelada.situacao = SituacaoDaAssinatura.CANCELADA
    cancelada.cancelada_em = timezone.now()
    cancelada.save()

    assinaturas = painel(api_plataforma)["assinaturas"]

    assert assinaturas["novas_no_mes"] == 1
    assert assinaturas["canceladas_no_mes"] == 1


@pytest.mark.django_db
def test_cadastros_por_semana_das_ultimas_doze(api_plataforma: APIClient) -> None:
    nova_assistencia("Desta semana")
    nova_assistencia("Da semana passada", dias_desde_o_cadastro=7)
    nova_assistencia("Também da semana passada", dias_desde_o_cadastro=7)
    nova_assistencia("De muito tempo atrás", dias_desde_o_cadastro=200)

    semanas = painel(api_plataforma)["crescimento"]["cadastros_por_semana"]

    hoje = timezone.localdate()
    segunda = hoje - timedelta(days=hoje.weekday())
    assert len(semanas) == 12
    assert semanas[-1] == {"inicio": segunda.isoformat(), "total": 1}
    assert semanas[-2] == {"inicio": (segunda - timedelta(weeks=1)).isoformat(), "total": 2}
    assert semanas[0]["inicio"] == (segunda - timedelta(weeks=11)).isoformat()
    assert sum(semana["total"] for semana in semanas) == 3


@pytest.mark.django_db
def test_recebido_mes_a_mes_dos_ultimos_doze(api_plataforma: APIClient) -> None:
    mes = Mes.de(timezone.localdate())
    assinatura = contratar(nova_assistencia("Cell Point"))
    fatura(assinatura, vencimento=mes.inicio)
    fatura(assinatura, vencimento=mes.anterior.inicio)
    fatura(assinatura, vencimento=mes.anterior.fim)
    fatura(assinatura, vencimento=mes.antes(13).inicio)

    meses = painel(api_plataforma)["crescimento"]["recebido_por_mes"]

    assert len(meses) == 12
    assert meses[-1] == {"mes": mes.em_texto(), "recebido": "59.90"}
    assert meses[-2] == {"mes": mes.anterior.em_texto(), "recebido": "119.80"}
    assert meses[0] == {"mes": mes.antes(11).em_texto(), "recebido": "0.00"}


@pytest.mark.django_db
def test_lista_das_assistencias_poe_quem_precisa_de_contato_em_cima(
    api_plataforma: APIClient,
) -> None:
    nova_assistencia("Recém-chegada", dias_desde_o_cadastro=1)
    usando = nova_assistencia("Usando bem", dias_desde_o_cadastro=40)
    abrir_ordem(usando, dias_atras=2)
    parada = nova_assistencia("Parou", dias_desde_o_cadastro=50)
    abrir_ordem(parada, dias_atras=30)
    abrir_ordem(parada, dias_atras=20)
    nova_assistencia("Nunca abriu ordem", dias_desde_o_cadastro=5)

    linhas = painel(api_plataforma)["assistencias"]

    assert [(linha["nome"], linha["alerta"]) for linha in linhas] == [
        ("Nunca abriu ordem", SEM_ORDENS),
        ("Parou", PAROU),
        ("Recém-chegada", None),
        ("Usando bem", None),
    ]
    assert linhas[1]["dias_sem_ordem"] == 20
    assert linhas[1]["ordens_no_total"] == 2


@pytest.mark.parametrize(
    ("dias_desde_o_cadastro", "ordens", "dias_sem_ordem", "esperado"),
    [
        (2, 0, None, None),
        (3, 0, None, SEM_ORDENS),
        (40, 5, 13, None),
        (40, 5, 14, PAROU),
        (40, 5, 0, None),
    ],
)
def test_limites_dos_alertas(
    dias_desde_o_cadastro: int, ordens: int, dias_sem_ordem: int | None, esperado: str | None
) -> None:
    assert (
        alerta(
            dias_desde_o_cadastro=dias_desde_o_cadastro,
            ordens=ordens,
            dias_sem_ordem=dias_sem_ordem,
        )
        == esperado
    )


@pytest.mark.django_db
def test_linha_da_assistencia_traz_o_contato_do_dono_e_o_ultimo_acesso(
    api_plataforma: APIClient,
) -> None:
    tenant = nova_assistencia("Cell Point", dias_desde_o_cadastro=10)
    dono = dono_da(tenant, "Rafael Lima")
    tecnico = Usuario.objects.create_user(
        username="tecnico@cellpoint.test", tenant=tenant, papel="tecnico"
    )
    Usuario.objects.filter(pk=dono.pk).update(ultimo_acesso=timezone.now() - timedelta(days=4))
    Usuario.objects.filter(pk=tecnico.pk).update(ultimo_acesso=timezone.now() - timedelta(days=1))
    abrir_ordem(tenant)
    abrir_ordem(tenant, dias_atras=45)

    linha = painel(api_plataforma)["assistencias"][0]

    assert linha["dono"] == "Rafael Lima"
    assert linha["email"] == dono.email
    assert linha["whatsapp"] == "11987654321"
    assert linha["situacao"] == "teste"
    assert linha["dias_sem_acesso"] == 1
    assert linha["ordens_no_mes"] == 1
    assert linha["ordens_no_total"] == 2
    assert linha["dias_sem_ordem"] == 0


@pytest.mark.django_db
def test_navegacao_entre_os_meses(api_plataforma: APIClient) -> None:
    atual = Mes.de(timezone.localdate())
    nova_assistencia("Primeira", dias_desde_o_cadastro=40)

    deste_mes = painel(api_plataforma)["mes"]
    do_anterior = painel(api_plataforma, atual.anterior.em_texto())["mes"]

    assert deste_mes["escolhido"] == atual.em_texto()
    assert deste_mes["seguinte"] is None
    assert deste_mes["anterior"] == atual.anterior.em_texto()
    assert do_anterior["seguinte"] == atual.em_texto()


@pytest.mark.django_db
@pytest.mark.parametrize("mes", ["2026-13", "outubro", "2026-1"])
def test_mes_invalido_e_recusado(api_plataforma: APIClient, mes: str) -> None:
    assert api_plataforma.get(f"/api/plataforma/painel/?mes={mes}").status_code == 400


@pytest.mark.django_db
def test_mes_que_ainda_nao_chegou_e_recusado(api_plataforma: APIClient) -> None:
    seguinte = Mes.de(timezone.localdate()).seguinte.em_texto()

    resposta = api_plataforma.get(f"/api/plataforma/painel/?mes={seguinte}")

    assert resposta.status_code == 400
    assert resposta.json()["mes"] == ["Esse mês ainda não chegou."]
