from decimal import Decimal

from django.db.models import Avg, Count, Q, QuerySet, Sum

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


def _pagamentos(consulta: QuerySet[OrdemServico], periodo: Periodo) -> QuerySet[Pagamento]:
    return Pagamento.objects.filter(ordem__in=consulta).filter(periodo.filtro("recebido_em"))


def _entregas_cobradas(
    consulta: QuerySet[OrdemServico], periodo: Periodo
) -> QuerySet[OrdemServico]:
    return consulta.filter(periodo.filtro("entregue_em"), valor_cobrado__isnull=False)


def recebido(consulta: QuerySet[OrdemServico], periodo: Periodo) -> Decimal:
    total = _pagamentos(consulta, periodo).aggregate(total=Sum("valor"))["total"]
    return total or ZERO


def recebido_por_forma(consulta: QuerySet[OrdemServico], periodo: Periodo) -> list[dict[str, str]]:
    totais = {
        linha["forma"]: linha["total"]
        for linha in _pagamentos(consulta, periodo).values("forma").annotate(total=Sum("valor"))
    }
    return [
        {"forma": forma.value, "rotulo": forma.label, "valor": str(totais.get(forma.value, ZERO))}
        for forma in FormaDePagamento
    ]


def descontos(consulta: QuerySet[OrdemServico], periodo: Periodo) -> Decimal:
    entregas = _entregas_cobradas(consulta, periodo)
    aprovado = ItemOrcamento.objects.filter(ordem__in=entregas, aprovado=True).aggregate(
        total=Sum("valor")
    )["total"]
    cobrado = entregas.aggregate(total=Sum("valor_cobrado"))["total"]
    return (aprovado or ZERO) - (cobrado or ZERO)


def ticket_medio(consulta: QuerySet[OrdemServico], periodo: Periodo) -> Decimal | None:
    media = (
        _entregas_cobradas(consulta, periodo)
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
