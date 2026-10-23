from collections.abc import Mapping
from datetime import date, timedelta
from decimal import Decimal
from typing import Any

from django.db.models import Count, Q, QuerySet, Sum

from bancada.financeiro.models import CategoriaDaConta, ContaAPagar

A_PAGAR = "a_pagar"
VENCIDAS = "vencidas"
PAGAS = "pagas"
SITUACOES = {A_PAGAR, VENCIDAS, PAGAS}

DIAS_DO_AVISO = 7


def vencidas(hoje: date) -> Q:
    return Q(paga_em__isnull=True, vencimento__lt=hoje)


def vencem_nos_proximos_dias(hoje: date) -> Q:
    return Q(
        paga_em__isnull=True,
        vencimento__gte=hoje,
        vencimento__lt=hoje + timedelta(days=DIAS_DO_AVISO),
    )


def pagas_no_mes(hoje: date) -> Q:
    return Q(paga_em__gte=hoje.replace(day=1), paga_em__lte=hoje)


def filtrar(
    consulta: QuerySet[ContaAPagar], parametros: Mapping[str, str], hoje: date
) -> QuerySet[ContaAPagar]:
    busca = (parametros.get("busca") or "").strip()
    if busca:
        consulta = consulta.filter(Q(descricao__icontains=busca) | Q(fornecedor__icontains=busca))

    categoria = parametros.get("categoria")
    if categoria in CategoriaDaConta.values:
        consulta = consulta.filter(categoria=categoria)

    situacao = parametros.get("situacao")
    if situacao == PAGAS:
        return consulta.filter(paga_em__isnull=False).order_by("-paga_em", "-pk")
    if situacao == VENCIDAS:
        return consulta.filter(vencidas(hoje)).order_by("vencimento", "pk")
    return consulta.filter(paga_em__isnull=True).order_by("vencimento", "pk")


def _total(valor: Decimal | None, contas: int) -> dict[str, Any]:
    return {"valor": str(valor or Decimal("0.00")), "contas": contas}


# Os três números do topo da tela e do aviso no painel, numa consulta só.
def resumo(consulta: QuerySet[ContaAPagar], hoje: date) -> dict[str, Any]:
    totais = consulta.aggregate(
        vencidas_valor=Sum("valor", filter=vencidas(hoje)),
        vencidas_contas=Count("id", filter=vencidas(hoje)),
        proximas_valor=Sum("valor", filter=vencem_nos_proximos_dias(hoje)),
        proximas_contas=Count("id", filter=vencem_nos_proximos_dias(hoje)),
        pagas_valor=Sum("valor", filter=pagas_no_mes(hoje)),
        pagas_contas=Count("id", filter=pagas_no_mes(hoje)),
    )
    return {
        "vencidas": _total(totais["vencidas_valor"], totais["vencidas_contas"]),
        "proximos_dias": _total(totais["proximas_valor"], totais["proximas_contas"]),
        "pagas_no_mes": _total(totais["pagas_valor"], totais["pagas_contas"]),
    }
