from datetime import timedelta
from decimal import Decimal
from typing import Any

from django.db.models import (
    Avg,
    Count,
    DurationField,
    ExpressionWrapper,
    F,
    Q,
    QuerySet,
    Sum,
)
from django.utils import timezone

from bancada.ordens.consultas import abertas, atrasadas
from bancada.ordens.estados import StatusOS
from bancada.ordens.models import ItemOrcamento, OrdemServico

DIAS_PARA_A_MEDIA_DE_REPARO = 90
SEGUNDOS_POR_DIA = 86400


def contagens(consulta: QuerySet[OrdemServico]) -> dict[str, int]:
    hoje = timezone.localdate()
    inicio_do_mes = hoje.replace(day=1)

    return consulta.aggregate(
        abertas=Count("id", filter=abertas()),
        atrasadas=Count("id", filter=atrasadas()),
        aguardando_cliente=Count("id", filter=Q(status=StatusOS.ORCAMENTO_ENVIADO)),
        aguardando_peca=Count("id", filter=Q(status=StatusOS.AGUARDANDO_PECA)),
        prontas=Count("id", filter=Q(status=StatusOS.PRONTO)),
        abertas_hoje=Count("id", filter=Q(criado_em__date=hoje)),
        entregues_no_mes=Count("id", filter=Q(entregue_em__date__gte=inicio_do_mes)),
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


def dias_medios_de_reparo(consulta: QuerySet[OrdemServico]) -> float | None:
    limite = timezone.now() - timedelta(days=DIAS_PARA_A_MEDIA_DE_REPARO)
    duracao = ExpressionWrapper(F("entregue_em") - F("criado_em"), output_field=DurationField())

    media = consulta.filter(entregue_em__gte=limite).aggregate(media=Avg(duracao))["media"]
    if media is None:
        return None

    return round(media.total_seconds() / SEGUNDOS_POR_DIA, 1)


def valor_aprovado_em_aberto(consulta: QuerySet[OrdemServico]) -> Decimal:
    total = ItemOrcamento.objects.filter(
        ordem__in=consulta.filter(abertas()),
        aprovado=True,
    ).aggregate(total=Sum("valor"))["total"]

    return total or Decimal("0.00")


def numeros(consulta: QuerySet[OrdemServico]) -> dict[str, Any]:
    return {
        **contagens(consulta),
        "por_status": por_status(consulta),
        "dias_medios_de_reparo": dias_medios_de_reparo(consulta),
        "valor_aprovado_em_aberto": str(valor_aprovado_em_aberto(consulta)),
        "dias_da_media": DIAS_PARA_A_MEDIA_DE_REPARO,
    }
