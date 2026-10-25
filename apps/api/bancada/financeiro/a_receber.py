from collections.abc import Mapping
from datetime import date, timedelta
from decimal import Decimal
from typing import Any

from django.db.models import Count, F, OuterRef, Q, QuerySet, Subquery, Sum

from bancada.financeiro.consultas import DIAS_DO_AVISO
from bancada.ordens.consultas import (
    com_saldo_a_receber,
    com_valor_pago,
    pagamento_vencido,
    por_texto,
)
from bancada.ordens.models import OrdemServico, Pagamento
from bancada.ordens.painel.periodo import Periodo

A_RECEBER = "a_receber"
VENCIDAS = "vencidas"
RECEBIDAS = "recebidas"
SITUACOES = {A_RECEBER, VENCIDAS, RECEBIDAS}


def vence_nos_proximos_dias(hoje: date) -> Q:
    return Q(
        pagamento_combinado_para__gte=hoje,
        pagamento_combinado_para__lt=hoje + timedelta(days=DIAS_DO_AVISO),
    )


# O pagamento da entrega fica com a hora da entrega (ADR 0021). Os que vêm depois dela são o cliente
# pagando o que ficou devendo.
def depois_da_entrega() -> Q:
    return Q(recebido_em__gt=F("ordem__entregue_em"))


def com_valores(consulta: QuerySet[OrdemServico]) -> QuerySet[OrdemServico]:
    ultimo_pagamento = (
        Pagamento.objects.filter(ordem=OuterRef("pk"), recebido_em__gt=OuterRef("entregue_em"))
        .order_by("-recebido_em")
        .values("recebido_em")[:1]
    )
    return com_valor_pago(consulta).annotate(
        saldo=F("valor_cobrado") - F("valor_pago"),
        quitada_em=Subquery(ultimo_pagamento),
    )


def quitadas(consulta: QuerySet[OrdemServico]) -> QuerySet[OrdemServico]:
    return consulta.filter(Q(quitada_em__isnull=False), valor_cobrado__lte=F("valor_pago"))


# A lista começa pelo que vence primeiro. As ordens entregues antes da data combinada existir não
# têm data e ficam por último.
def filtrar(
    consulta: QuerySet[OrdemServico], parametros: Mapping[str, str], hoje: date
) -> QuerySet[OrdemServico]:
    busca = (parametros.get("busca") or "").strip()
    if busca:
        consulta = por_texto(consulta, busca)

    situacao = parametros.get("situacao")
    if situacao == RECEBIDAS:
        return quitadas(consulta).order_by(F("quitada_em").desc(), "-pk")

    pendentes = consulta.filter(valor_cobrado__gt=F("valor_pago"))
    if situacao == VENCIDAS:
        pendentes = pendentes.filter(pagamento_vencido(hoje))
    return pendentes.order_by(
        F("pagamento_combinado_para").asc(nulls_last=True), "entregue_em", "pk"
    )


def _total(valor: Decimal | None, ordens: int) -> dict[str, Any]:
    return {"valor": str(valor or Decimal("0.00")), "ordens": ordens}


def resumo(ordens: QuerySet[OrdemServico], hoje: date) -> dict[str, Any]:
    saldo = F("valor_cobrado") - F("valor_pago")
    pendentes = com_saldo_a_receber(ordens).aggregate(
        vencidas_valor=Sum(saldo, filter=pagamento_vencido(hoje)),
        vencidas_ordens=Count("id", filter=pagamento_vencido(hoje)),
        proximas_valor=Sum(saldo, filter=vence_nos_proximos_dias(hoje)),
        proximas_ordens=Count("id", filter=vence_nos_proximos_dias(hoje)),
    )
    no_mes = Periodo(hoje.replace(day=1), hoje)
    recebidos = (
        Pagamento.objects.filter(ordem__in=ordens)
        .filter(no_mes.filtro("recebido_em"), depois_da_entrega())
        .aggregate(valor=Sum("valor"), ordens=Count("ordem", distinct=True))
    )
    return {
        "vencidas": _total(pendentes["vencidas_valor"], pendentes["vencidas_ordens"]),
        "proximos_dias": _total(pendentes["proximas_valor"], pendentes["proximas_ordens"]),
        "recebido_no_mes": _total(recebidos["valor"], recebidos["ordens"]),
    }
