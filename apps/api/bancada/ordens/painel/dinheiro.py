from collections.abc import Iterable, Mapping
from decimal import Decimal
from typing import Any

from django.db.models import Avg, Count, Q, QuerySet, Sum

from bancada.estoque.models import PagamentoDaVenda, Venda
from bancada.ordens.estados import StatusOS
from bancada.ordens.models import (
    EventoOS,
    FormaDePagamento,
    ItemOrcamento,
    OrdemServico,
    Pagamento,
)
from bancada.ordens.painel.periodo import Periodo

CENTAVO = Decimal("0.01")
ZERO = Decimal("0.00")


def pagamentos(consulta: QuerySet[OrdemServico], periodo: Periodo) -> QuerySet[Pagamento]:
    return Pagamento.objects.filter(ordem__in=consulta).filter(periodo.filtro("recebido_em"))


def entregas_cobradas(consulta: QuerySet[OrdemServico], periodo: Periodo) -> QuerySet[OrdemServico]:
    return consulta.filter(periodo.filtro("entregue_em"), valor_cobrado__isnull=False)


def vendas_feitas(vendas: QuerySet[Venda], periodo: Periodo) -> QuerySet[Venda]:
    return vendas.filter(periodo.filtro("criado_em"), desfeita_em__isnull=True)


def pagamentos_do_balcao(vendas: QuerySet[Venda], periodo: Periodo) -> QuerySet[PagamentoDaVenda]:
    return PagamentoDaVenda.objects.filter(venda__in=vendas_feitas(vendas, periodo))


def recebido(consulta: QuerySet[OrdemServico], periodo: Periodo) -> Decimal:
    total = pagamentos(consulta, periodo).aggregate(total=Sum("valor"))["total"]
    return total or ZERO


def recebido_no_balcao(vendas: QuerySet[Venda], periodo: Periodo) -> Decimal:
    total = pagamentos_do_balcao(vendas, periodo).aggregate(total=Sum("valor"))["total"]
    return total or ZERO


def vendas_no_balcao(vendas: QuerySet[Venda], periodo: Periodo) -> int:
    return vendas_feitas(vendas, periodo).count()


def _somar_por_forma(linhas: Iterable[Mapping[str, Any]], totais: dict[str, Decimal]) -> None:
    for linha in linhas:
        totais[linha["forma"]] = totais.get(linha["forma"], ZERO) + linha["total"]


def recebido_por_forma(
    consulta: QuerySet[OrdemServico], vendas: QuerySet[Venda], periodo: Periodo
) -> list[dict[str, str]]:
    totais: dict[str, Decimal] = {}
    das_ordens = pagamentos(consulta, periodo).order_by().values("forma")
    _somar_por_forma(das_ordens.annotate(total=Sum("valor")), totais)
    do_balcao = pagamentos_do_balcao(vendas, periodo).order_by().values("forma")
    _somar_por_forma(do_balcao.annotate(total=Sum("valor")), totais)
    return [
        {"forma": forma.value, "rotulo": forma.label, "valor": str(totais.get(forma.value, ZERO))}
        for forma in FormaDePagamento
    ]


def descontos(consulta: QuerySet[OrdemServico], periodo: Periodo) -> Decimal:
    entregas = entregas_cobradas(consulta, periodo)
    aprovado = ItemOrcamento.objects.filter(ordem__in=entregas, aprovado=True).aggregate(
        total=Sum("valor")
    )["total"]
    cobrado = entregas.aggregate(total=Sum("valor_cobrado"))["total"]
    return (aprovado or ZERO) - (cobrado or ZERO)


def ticket_medio(consulta: QuerySet[OrdemServico], periodo: Periodo) -> Decimal | None:
    media = (
        entregas_cobradas(consulta, periodo)
        .filter(valor_cobrado__gt=0)
        .aggregate(media=Avg("valor_cobrado"))["media"]
    )
    return None if media is None else Decimal(media).quantize(CENTAVO)


def taxa_de_aprovacao(consulta: QuerySet[OrdemServico], periodo: Periodo) -> float | None:
    respostas = (
        EventoOS.objects.filter(
            ordem__in=consulta,
            para_status__in=[StatusOS.APROVADO, StatusOS.REPROVADO],
        )
        .filter(periodo.filtro("criado_em"))
        .aggregate(
            aprovados=Count("id", filter=Q(para_status=StatusOS.APROVADO)),
            total=Count("id"),
        )
    )
    if respostas["total"] == 0:
        return None
    return round(100 * respostas["aprovados"] / respostas["total"], 1)
