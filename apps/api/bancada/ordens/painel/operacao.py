from collections import defaultdict
from datetime import timedelta
from typing import Any

from django.db.models import Avg, Count, DurationField, ExpressionWrapper, F, QuerySet, Window
from django.db.models.functions import Lead

from bancada.ordens.estados import StatusOS
from bancada.ordens.models import EventoOS, OrdemServico
from bancada.ordens.painel.periodo import Periodo

SEGUNDOS_POR_DIA = 86400
SEGUNDOS_POR_HORA = 3600


def movimento(consulta: QuerySet[OrdemServico], periodo: Periodo) -> dict[str, int]:
    return consulta.aggregate(
        abertas=Count("id", filter=periodo.filtro("criado_em")),
        entregues=Count("id", filter=periodo.filtro("entregue_em")),
    )


def dias_medios_de_reparo(consulta: QuerySet[OrdemServico], periodo: Periodo) -> float | None:
    duracao = ExpressionWrapper(F("entregue_em") - F("criado_em"), output_field=DurationField())
    media = consulta.filter(periodo.filtro("entregue_em")).aggregate(media=Avg(duracao))["media"]
    if media is None:
        return None
    return round(media.total_seconds() / SEGUNDOS_POR_DIA, 1)


def _etapas_encerradas_no_periodo(
    consulta: QuerySet[OrdemServico], periodo: Periodo
) -> dict[str, list[timedelta]]:
    saida = Window(
        Lead("criado_em"),
        partition_by=[F("ordem_id")],
        order_by=[F("criado_em").asc(), F("id").asc()],
    )
    etapas = (
        EventoOS.objects.filter(ordem__in=consulta)
        .annotate(saida=saida)
        .filter(periodo.filtro("saida"))
        .values_list("para_status", "criado_em", "saida")
    )

    duracoes: dict[str, list[timedelta]] = defaultdict(list)
    for status, entrada, fim in etapas:
        duracoes[status].append(fim - entrada)
    return duracoes


def tempo_por_etapa(consulta: QuerySet[OrdemServico], periodo: Periodo) -> list[dict[str, Any]]:
    duracoes = _etapas_encerradas_no_periodo(consulta, periodo)

    linhas = []
    for situacao in StatusOS:
        medidas = duracoes.get(situacao.value)
        if not medidas:
            continue
        media = sum(medidas, timedelta()) / len(medidas)
        linhas.append(
            {
                "status": situacao.value,
                "rotulo": situacao.label,
                "horas": round(media.total_seconds() / SEGUNDOS_POR_HORA, 1),
                "vezes": len(medidas),
            }
        )
    return linhas
