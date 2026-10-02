import calendar
from dataclasses import dataclass
from datetime import date, timedelta

from django.db.models import Q

from bancada.assinaturas.models import Assinatura, SituacaoDaAssinatura, SituacaoDaFatura
from bancada.tenants.models import Tenant

DIAS_DE_TESTE = 30
DIAS_DE_TOLERANCIA = 7
DIAS_DOS_AVISOS_DE_FIM_DO_TESTE = (7, 1)


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


def acesso_depois_do_cancelamento(assinatura: Assinatura, hoje: date) -> date:
    datas = [hoje, assinatura.teste_termina_em]
    ultima_paga = (
        assinatura.faturas.filter(situacao=SituacaoDaFatura.PAGA)
        .order_by("-vencimento")
        .values_list("vencimento", flat=True)
        .first()
    )
    if ultima_paga:
        datas.append(um_mes_depois(ultima_paga) - timedelta(days=1))
    return max(datas)


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
