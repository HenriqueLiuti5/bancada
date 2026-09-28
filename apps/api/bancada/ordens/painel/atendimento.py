from typing import Any

from django.db.models import Count, Min, QuerySet
from django.db.models.functions import Lower, Trim

from bancada.ordens.models import OrdemServico
from bancada.ordens.painel import defeitos
from bancada.ordens.painel.periodo import Periodo

LIMITE = 5


def aparelhos(consulta: QuerySet[OrdemServico], periodo: Periodo) -> list[dict[str, Any]]:
    linhas = (
        consulta.filter(periodo.filtro("criado_em"))
        .annotate(
            marca_normalizada=Lower(Trim("aparelho__marca")),
            modelo_normalizado=Lower(Trim("aparelho__modelo")),
        )
        .values("marca_normalizada", "modelo_normalizado")
        .annotate(
            total=Count("id"),
            marca=Min("aparelho__marca"),
            modelo=Min("aparelho__modelo"),
        )
        .order_by("-total", "marca_normalizada", "modelo_normalizado")[:LIMITE]
    )
    return [
        {"marca": linha["marca"], "modelo": linha["modelo"], "total": linha["total"]}
        for linha in linhas
    ]


def defeitos_mais_comuns(
    consulta: QuerySet[OrdemServico], periodo: Periodo
) -> list[dict[str, Any]]:
    relatos = consulta.filter(periodo.filtro("criado_em")).values_list(
        "problema_relatado", flat=True
    )
    return defeitos.mais_comuns(relatos, LIMITE)


def clientes(consulta: QuerySet[OrdemServico], periodo: Periodo) -> dict[str, Any]:
    do_periodo = consulta.filter(periodo.filtro("criado_em")).order_by().values("cliente")
    que_voltaram = (
        consulta.filter(cliente__in=do_periodo)
        .values("cliente", "cliente__nome", "cliente__telefone")
        .annotate(ordens=Count("id"))
        .filter(ordens__gte=2)
        .order_by("-ordens", "cliente__nome")
    )
    return {
        "atendidos": do_periodo.distinct().count(),
        "que_voltaram": que_voltaram.count(),
        "mais_frequentes": [
            {
                "nome": linha["cliente__nome"],
                "telefone": linha["cliente__telefone"],
                "ordens": linha["ordens"],
            }
            for linha in que_voltaram[:LIMITE]
        ],
    }
