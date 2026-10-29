import calendar
from dataclasses import dataclass
from datetime import date, timedelta

from django.db.models import Q

from bancada.assinaturas.models import (
    Assinatura,
    Ciclo,
    Fatura,
    SituacaoDaAssinatura,
    SituacaoDaFatura,
)
from bancada.core.calendario import somar_meses
from bancada.tenants.models import Tenant

DIAS_DE_TESTE = 30
DIAS_DE_TOLERANCIA = 7
DIAS_DOS_AVISOS_DE_FIM_DO_TESTE = (7, 1)
MESES_SO_PARA_CONSULTA_ATE_APAGAR = 6
DIAS_DO_AVISO_ANTES_DE_APAGAR = 30
DIAS_PARA_DEVOLVER_O_ANUAL = 7
MESES_DO_CICLO: dict[str, int] = {Ciclo.MENSAL: 1, Ciclo.ANUAL: 12}


@dataclass(frozen=True)
class Retrato:
    situacao: str
    em_atraso_desde: date | None
    pode_editar: bool


def fim_do_teste(inicio: date) -> date:
    return inicio + timedelta(days=DIAS_DE_TESTE)


def ultimo_dia_para_pagar(vencimento: date) -> date:
    return vencimento + timedelta(days=DIAS_DE_TOLERANCIA)


def um_mes_depois(dia: date) -> date:
    ano, mes = (dia.year + 1, 1) if dia.month == 12 else (dia.year, dia.month + 1)
    ultimo_dia_do_mes = calendar.monthrange(ano, mes)[1]
    return dia.replace(year=ano, month=mes, day=min(dia.day, ultimo_dia_do_mes))


def um_ciclo_depois(dia: date, ciclo: str) -> date:
    return somar_meses(dia, MESES_DO_CICLO.get(ciclo, 1))


def primeiro_vencimento(assinatura: Assinatura, hoje: date) -> date:
    datas = [hoje, assinatura.teste_termina_em]
    if assinatura.acesso_ate:
        datas.append(assinatura.acesso_ate)
    return max(datas)


def vencimento_em_atraso(assinatura: Assinatura, hoje: date) -> date | None:
    return (
        assinatura.faturas.filter(
            Q(situacao=SituacaoDaFatura.VENCIDA)
            | Q(situacao=SituacaoDaFatura.ABERTA, vencimento__lt=hoje)
        )
        .order_by("vencimento")
        .values_list("vencimento", flat=True)
        .first()
    )


def retrato(assinatura: Assinatura, hoje: date) -> Retrato:
    if assinatura.situacao == SituacaoDaAssinatura.CANCELADA:
        com_acesso = assinatura.acesso_ate is not None and hoje <= assinatura.acesso_ate
        return Retrato(SituacaoDaAssinatura.CANCELADA, None, com_acesso)

    if not assinatura.assinatura_no_provedor:
        em_teste = hoje <= assinatura.teste_termina_em
        situacao = SituacaoDaAssinatura.TESTE if em_teste else SituacaoDaAssinatura.SUSPENSA
        return Retrato(situacao, None, em_teste)

    atraso = vencimento_em_atraso(assinatura, hoje)
    if atraso is None:
        return Retrato(SituacaoDaAssinatura.ATIVA, None, True)

    tolerado = hoje <= ultimo_dia_para_pagar(atraso)
    situacao = SituacaoDaAssinatura.INADIMPLENTE if tolerado else SituacaoDaAssinatura.SUSPENSA
    return Retrato(situacao, atraso, tolerado)


def assistencia_pode_editar(tenant: Tenant, hoje: date) -> bool:
    assinatura = Assinatura.objects.filter(tenant=tenant).first()
    return assinatura is None or retrato(assinatura, hoje).pode_editar


def acesso_depois_do_cancelamento(
    assinatura: Assinatura, hoje: date, *, sem: Fatura | None = None
) -> date:
    datas = [hoje, assinatura.teste_termina_em]
    pagas = assinatura.faturas.filter(situacao=SituacaoDaFatura.PAGA)
    if sem is not None:
        pagas = pagas.exclude(pk=sem.pk)
    ultima_paga = pagas.order_by("-vencimento").values_list("vencimento", flat=True).first()
    if ultima_paga:
        datas.append(um_ciclo_depois(ultima_paga, assinatura.ciclo) - timedelta(days=1))
    return max(datas)


def fatura_a_devolver(assinatura: Assinatura, hoje: date) -> Fatura | None:
    if assinatura.ciclo != Ciclo.ANUAL:
        return None
    return (
        assinatura.faturas.filter(
            situacao=SituacaoDaFatura.PAGA,
            paga_em__gte=hoje - timedelta(days=DIAS_PARA_DEVOLVER_O_ANUAL),
        )
        .order_by("-paga_em")
        .first()
    )


def so_para_consulta_desde(assinatura: Assinatura, hoje: date) -> date | None:
    atual = retrato(assinatura, hoje)
    if atual.pode_editar:
        return None
    if atual.situacao == SituacaoDaAssinatura.CANCELADA:
        ultimo_dia = assinatura.acesso_ate or assinatura.teste_termina_em
    elif atual.em_atraso_desde:
        ultimo_dia = ultimo_dia_para_pagar(atual.em_atraso_desde)
    else:
        ultimo_dia = assinatura.teste_termina_em
    return ultimo_dia + timedelta(days=1)


def _avisada_desde(assinatura: Assinatura, desde: date) -> bool:
    aviso = assinatura.aviso_de_exclusao_em
    return aviso is not None and aviso >= desde


def avisada_da_exclusao(assinatura: Assinatura, hoje: date) -> bool:
    desde = so_para_consulta_desde(assinatura, hoje)
    return desde is not None and _avisada_desde(assinatura, desde)


def dia_de_apagar(assinatura: Assinatura, hoje: date) -> date | None:
    desde = so_para_consulta_desde(assinatura, hoje)
    if desde is None:
        return None

    prazo = somar_meses(desde, MESES_SO_PARA_CONSULTA_ATE_APAGAR)
    # O dono é avisado pelo menos 30 dias antes, mesmo quando o aviso sai depois do previsto.
    aviso = assinatura.aviso_de_exclusao_em if _avisada_desde(assinatura, desde) else None
    return max(prazo, (aviso or hoje) + timedelta(days=DIAS_DO_AVISO_ANTES_DE_APAGAR))


def avisos_de_fim_do_teste_pendentes(assinatura: Assinatura, hoje: date) -> list[int]:
    if assinatura.assinatura_no_provedor or assinatura.situacao == SituacaoDaAssinatura.CANCELADA:
        return []

    restantes = (assinatura.teste_termina_em - hoje).days
    if restantes < 0:
        return []

    return [
        dias
        for dias in DIAS_DOS_AVISOS_DE_FIM_DO_TESTE
        if restantes <= dias and dias not in assinatura.avisos_de_fim_do_teste
    ]
