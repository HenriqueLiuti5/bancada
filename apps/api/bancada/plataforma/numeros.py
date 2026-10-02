from collections import Counter
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Any

from django.db.models import Count, F, Max, Q, QuerySet, Sum
from django.db.models.functions import TruncMonth
from django.utils import timezone

from bancada.assinaturas.models import (
    Assinatura,
    Fatura,
    SituacaoDaAssinatura,
    SituacaoDaFatura,
)
from bancada.ordens.models import OrdemServico
from bancada.ordens.painel.periodo import inicio_do_dia
from bancada.plataforma.meses import Mes
from bancada.plataforma.models import Custo
from bancada.tenants.models import Papel, Tenant, Usuario

ZERO = Decimal("0.00")
SEMANAS_NO_GRAFICO = 12
MESES_NO_GRAFICO = 12
DIAS_PARA_A_PRIMEIRA_ORDEM = 3
DIAS_SEM_ORDEM_PARA_PARAR = 14
SITUACOES_QUE_PAGAM = [SituacaoDaAssinatura.ATIVA, SituacaoDaAssinatura.INADIMPLENTE]

SEM_ORDENS = "sem_ordens"
PAROU = "parou"
ORDEM_DOS_ALERTAS = {SEM_ORDENS: 0, PAROU: 1, None: 2}


def _faturas_pagas_entre(inicio: date, fim: date) -> QuerySet[Fatura]:
    return Fatura.objects.filter(
        situacao=SituacaoDaFatura.PAGA, paga_em__gte=inicio, paga_em__lte=fim
    )


def dinheiro(mes: Mes) -> dict[str, Any]:
    pagas = _faturas_pagas_entre(mes.inicio, mes.fim).aggregate(
        recebido=Sum("valor"),
        taxas=Sum(F("valor") - F("valor_liquido"), filter=Q(valor_liquido__isnull=False)),
        faturas=Count("id"),
    )
    custos = list(Custo.objects.filter(mes=mes.inicio).order_by("criado_em"))
    recebido = pagas["recebido"] or ZERO
    taxas = pagas["taxas"] or ZERO
    total_dos_custos = sum((custo.valor for custo in custos), ZERO)

    return {
        "recebido": str(recebido),
        "faturas_pagas": pagas["faturas"],
        "taxas": str(taxas),
        "custos": str(total_dos_custos),
        "lucro": str(recebido - taxas - total_dos_custos),
        "lista_de_custos": [
            {"id": custo.pk, "descricao": custo.descricao, "valor": str(custo.valor)}
            for custo in custos
        ],
    }


def receita_recorrente() -> dict[str, Any]:
    pagantes = Assinatura.objects.filter(situacao__in=SITUACOES_QUE_PAGAM).aggregate(
        valor=Sum("valor_mensal"), assinaturas=Count("id")
    )
    return {"valor": str(pagantes["valor"] or ZERO), "assinaturas": pagantes["assinaturas"]}


def _conversao(hoje: date) -> dict[str, Any]:
    assinaram = Assinatura.objects.filter(assinada_em__isnull=False).count()
    nao_assinaram = Assinatura.objects.filter(
        assinada_em__isnull=True, teste_termina_em__lt=hoje
    ).count()
    decidiram = assinaram + nao_assinaram
    return {
        "assinaram": assinaram,
        "decidiram": decidiram,
        "taxa": round(assinaram * 100 / decidiram, 1) if decidiram else None,
    }


def assinaturas(mes: Mes, hoje: date) -> dict[str, Any]:
    totais = dict(Assinatura.objects.order_by().values_list("situacao").annotate(total=Count("id")))
    return {
        "por_situacao": [
            {
                "situacao": situacao.value,
                "rotulo": situacao.label,
                "total": totais.get(situacao.value, 0),
            }
            for situacao in SituacaoDaAssinatura
        ],
        "receita_recorrente": receita_recorrente(),
        "conversao": _conversao(hoje),
        "novas_no_mes": Assinatura.objects.filter(mes.periodo.filtro("assinada_em")).count(),
        "canceladas_no_mes": Assinatura.objects.filter(mes.periodo.filtro("cancelada_em")).count(),
    }


def _inicio_da_semana(dia: date) -> date:
    return dia - timedelta(days=dia.weekday())


def cadastros_por_semana(hoje: date) -> list[dict[str, Any]]:
    esta_semana = _inicio_da_semana(hoje)
    semanas = [esta_semana - timedelta(weeks=atras) for atras in range(SEMANAS_NO_GRAFICO)][::-1]
    criacoes = Tenant.objects.filter(criado_em__gte=inicio_do_dia(semanas[0])).values_list(
        "criado_em", flat=True
    )
    contagem = Counter(_inicio_da_semana(timezone.localdate(criado)) for criado in criacoes)
    return [{"inicio": semana.isoformat(), "total": contagem[semana]} for semana in semanas]


def recebido_por_mes(hoje: date) -> list[dict[str, Any]]:
    atual = Mes.de(hoje)
    meses = [atual.antes(atras) for atras in range(MESES_NO_GRAFICO)][::-1]
    totais = {
        linha["mes"]: linha["total"]
        for linha in _faturas_pagas_entre(meses[0].inicio, atual.fim)
        .annotate(mes=TruncMonth("paga_em"))
        .order_by()
        .values("mes")
        .annotate(total=Sum("valor"))
    }
    return [{"mes": mes.em_texto(), "recebido": str(totais.get(mes.inicio, ZERO))} for mes in meses]


def _dias_desde(momento: datetime | None, hoje: date) -> int | None:
    if momento is None:
        return None
    return (hoje - timezone.localdate(momento)).days


def alerta(*, dias_desde_o_cadastro: int, ordens: int, dias_sem_ordem: int | None) -> str | None:
    if ordens == 0:
        return SEM_ORDENS if dias_desde_o_cadastro >= DIAS_PARA_A_PRIMEIRA_ORDEM else None
    if dias_sem_ordem is not None and dias_sem_ordem >= DIAS_SEM_ORDEM_PARA_PARAR:
        return PAROU
    return None


def _donos() -> dict[int, Usuario]:
    donos: dict[int, Usuario] = {}
    for dono in Usuario.objects.filter(papel=Papel.DONO, tenant__isnull=False).order_by(
        "date_joined"
    ):
        if dono.tenant_id is not None:
            donos.setdefault(dono.tenant_id, dono)
    return donos


@dataclass(frozen=True)
class Movimento:
    total: int = 0
    no_mes: int = 0
    ultima: datetime | None = None


def _movimento_das_assistencias(mes: Mes) -> dict[int, Movimento]:
    return {
        linha["tenant"]: Movimento(linha["total"], linha["no_mes"], linha["ultima"])
        for linha in OrdemServico.objects.order_by()
        .values("tenant")
        .annotate(
            total=Count("id"),
            no_mes=Count("id", filter=mes.periodo.filtro("criado_em")),
            ultima=Max("criado_em"),
        )
    }


def assistencias(mes: Mes, hoje: date) -> list[dict[str, Any]]:
    movimentos = _movimento_das_assistencias(mes)
    acessos = dict(
        Usuario.objects.filter(tenant__isnull=False)
        .order_by()
        .values_list("tenant")
        .annotate(ultimo=Max("ultimo_acesso"))
    )
    donos = _donos()

    linhas = []
    for tenant in Tenant.objects.select_related("assinatura").order_by("-criado_em"):
        dono = donos.get(tenant.pk)
        assinatura = getattr(tenant, "assinatura", None)
        movimento = movimentos.get(tenant.pk, Movimento())
        ultimo_acesso = acessos.get(tenant.pk)
        dias_sem_ordem = _dias_desde(movimento.ultima, hoje)

        linhas.append(
            {
                "id": tenant.pk,
                "nome": tenant.nome,
                "dono": dono.nome_de_exibicao if dono else "",
                "email": dono.email if dono else "",
                "whatsapp": tenant.whatsapp,
                "cadastro": timezone.localdate(tenant.criado_em).isoformat(),
                "situacao": assinatura.situacao if assinatura else None,
                "situacao_rotulo": assinatura.get_situacao_display() if assinatura else "",
                "ordens_no_mes": movimento.no_mes,
                "ordens_no_total": movimento.total,
                "dias_sem_ordem": dias_sem_ordem,
                "ultimo_acesso": ultimo_acesso.isoformat() if ultimo_acesso else None,
                "dias_sem_acesso": _dias_desde(ultimo_acesso, hoje),
                "alerta": alerta(
                    dias_desde_o_cadastro=(_dias_desde(tenant.criado_em, hoje) or 0),
                    ordens=movimento.total,
                    dias_sem_ordem=dias_sem_ordem,
                ),
            }
        )

    return sorted(linhas, key=lambda linha: ORDEM_DOS_ALERTAS[linha["alerta"]])


def primeiro_mes(hoje: date) -> Mes:
    primeiro_cadastro = (
        Tenant.objects.order_by("criado_em").values_list("criado_em", flat=True).first()
    )
    if primeiro_cadastro is None:
        return Mes.de(hoje)
    return min(Mes.de(timezone.localdate(primeiro_cadastro)), Mes.de(hoje))


def painel(mes: Mes, hoje: date) -> dict[str, Any]:
    atual = Mes.de(hoje)
    return {
        "mes": {
            "escolhido": mes.em_texto(),
            "anterior": mes.anterior.em_texto() if mes.anterior >= primeiro_mes(hoje) else None,
            "seguinte": mes.seguinte.em_texto() if mes.seguinte <= atual else None,
        },
        "dinheiro": dinheiro(mes),
        "assinaturas": assinaturas(mes, hoje),
        "crescimento": {
            "cadastros_por_semana": cadastros_por_semana(hoje),
            "recebido_por_mes": recebido_por_mes(hoje),
        },
        "assistencias": assistencias(mes, hoje),
    }
