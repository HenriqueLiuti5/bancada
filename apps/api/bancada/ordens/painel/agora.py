from decimal import Decimal
from typing import Any

from django.db.models import Count, F, Q, QuerySet, Sum

from bancada.ordens.consultas import abertas, atrasadas, com_saldo_a_receber
from bancada.ordens.estados import StatusOS
from bancada.ordens.models import ItemOrcamento, OrdemServico


def contagens(consulta: QuerySet[OrdemServico]) -> dict[str, int]:
    return consulta.aggregate(
        abertas=Count("id", filter=abertas()),
        atrasadas=Count("id", filter=atrasadas()),
        aguardando_cliente=Count("id", filter=Q(status=StatusOS.ORCAMENTO_ENVIADO)),
        aguardando_peca=Count("id", filter=Q(status=StatusOS.AGUARDANDO_PECA)),
        prontas=Count("id", filter=Q(status=StatusOS.PRONTO)),
    )


def por_status(consulta: QuerySet[OrdemServico]) -> list[dict[str, Any]]:
    totais = {
        linha["status"]: linha["total"]
        for linha in consulta.values("status").annotate(total=Count("id"))
    }

    return [
        {"status": situacao.value, "rotulo": situacao.label, "total": totais.get(situacao.value, 0)}
        for situacao in StatusOS
    ]


def valor_aprovado_em_aberto(consulta: QuerySet[OrdemServico]) -> Decimal:
    total = ItemOrcamento.objects.filter(
        ordem__in=consulta.filter(abertas()),
        aprovado=True,
    ).aggregate(total=Sum("valor"))["total"]

    return total or Decimal("0.00")


def a_receber(consulta: QuerySet[OrdemServico]) -> dict[str, Any]:
    pendentes = com_saldo_a_receber(consulta).aggregate(
        valor=Sum(F("valor_cobrado") - F("valor_pago")),
        ordens=Count("id"),
    )
    return {"valor": str(pendentes["valor"] or Decimal("0.00")), "ordens": pendentes["ordens"]}


def numeros(consulta: QuerySet[OrdemServico]) -> dict[str, Any]:
    return {**contagens(consulta), "por_status": por_status(consulta)}
