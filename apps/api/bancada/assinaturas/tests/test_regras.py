from datetime import date, timedelta
from decimal import Decimal

import pytest
from django.utils import timezone

from bancada.assinaturas import regras
from bancada.assinaturas.models import (
    Assinatura,
    Fatura,
    SituacaoDaAssinatura,
    SituacaoDaFatura,
)
from bancada.tenants.models import Tenant

HOJE = date(2026, 10, 2)


def assinatura_de(tenant: Tenant, **campos: object) -> Assinatura:
    Assinatura.objects.filter(tenant=tenant).update(**campos)
    return Assinatura.objects.get(tenant=tenant)


def fatura(assinatura: Assinatura, vencimento: date, situacao: str) -> Fatura:
    return Fatura.objects.create(
        tenant=assinatura.tenant,
        assinatura=assinatura,
        id_no_provedor=f"pay_{vencimento}_{situacao}",
        valor=Decimal("59.90"),
        vencimento=vencimento,
        situacao=situacao,
    )


def test_teste_gratis_dura_trinta_dias() -> None:
    assert regras.fim_do_teste(HOJE) == date(2026, 11, 1)


@pytest.mark.parametrize(
    ("dia", "esperado"),
    [
        (date(2026, 1, 31), date(2026, 2, 28)),
        (date(2026, 11, 1), date(2026, 12, 1)),
        (date(2026, 12, 15), date(2027, 1, 15)),
    ],
)
def test_um_mes_depois_respeita_o_tamanho_do_mes(dia: date, esperado: date) -> None:
    assert regras.um_mes_depois(dia) == esperado


@pytest.mark.django_db
def test_assistencia_nova_nasce_em_teste_de_trinta_dias(tenant: Tenant) -> None:
    assinatura = Assinatura.objects.get(tenant=tenant)

    assert assinatura.situacao == SituacaoDaAssinatura.TESTE
    assert assinatura.teste_termina_em == regras.fim_do_teste(timezone.localdate())


@pytest.mark.django_db
def test_teste_permite_editar_ate_o_ultimo_dia_inclusive(tenant: Tenant) -> None:
    assinatura = assinatura_de(tenant, teste_termina_em=HOJE)

    no_ultimo_dia = regras.retrato(assinatura, HOJE)
    no_dia_seguinte = regras.retrato(assinatura, HOJE + timedelta(days=1))

    assert no_ultimo_dia.situacao == SituacaoDaAssinatura.TESTE
    assert no_ultimo_dia.pode_editar
    assert no_dia_seguinte.situacao == SituacaoDaAssinatura.SUSPENSA
    assert not no_dia_seguinte.pode_editar


@pytest.mark.django_db
def test_assinatura_sem_fatura_em_atraso_fica_ativa(tenant: Tenant) -> None:
    assinatura = assinatura_de(tenant, assinatura_no_provedor="sub_1")
    fatura(assinatura, HOJE, SituacaoDaFatura.ABERTA)

    assert regras.retrato(assinatura, HOJE) == regras.Retrato(
        SituacaoDaAssinatura.ATIVA, None, True
    )


@pytest.mark.django_db
def test_atraso_tem_sete_dias_de_tolerancia_contados_do_vencimento(tenant: Tenant) -> None:
    assinatura = assinatura_de(tenant, assinatura_no_provedor="sub_1")
    vencimento = HOJE - timedelta(days=1)
    fatura(assinatura, vencimento, SituacaoDaFatura.VENCIDA)

    no_setimo_dia = regras.retrato(assinatura, vencimento + timedelta(days=7))
    no_oitavo_dia = regras.retrato(assinatura, vencimento + timedelta(days=8))

    assert no_setimo_dia == regras.Retrato(SituacaoDaAssinatura.INADIMPLENTE, vencimento, True)
    assert no_oitavo_dia == regras.Retrato(SituacaoDaAssinatura.SUSPENSA, vencimento, False)


@pytest.mark.django_db
def test_fatura_aberta_depois_do_vencimento_conta_como_atraso(tenant: Tenant) -> None:
    assinatura = assinatura_de(tenant, assinatura_no_provedor="sub_1")
    fatura(assinatura, HOJE - timedelta(days=2), SituacaoDaFatura.ABERTA)

    assert regras.retrato(assinatura, HOJE).situacao == SituacaoDaAssinatura.INADIMPLENTE


@pytest.mark.django_db
def test_fatura_paga_tira_a_assistencia_do_atraso(tenant: Tenant) -> None:
    assinatura = assinatura_de(tenant, assinatura_no_provedor="sub_1")
    fatura(assinatura, HOJE - timedelta(days=20), SituacaoDaFatura.PAGA)

    assert regras.retrato(assinatura, HOJE).situacao == SituacaoDaAssinatura.ATIVA


@pytest.mark.django_db
def test_cancelada_edita_so_ate_o_fim_do_periodo_ja_pago(tenant: Tenant) -> None:
    assinatura = assinatura_de(
        tenant,
        assinatura_no_provedor="sub_1",
        situacao=SituacaoDaAssinatura.CANCELADA,
        acesso_ate=HOJE,
    )

    assert regras.retrato(assinatura, HOJE).pode_editar
    assert not regras.retrato(assinatura, HOJE + timedelta(days=1)).pode_editar


@pytest.mark.django_db
def test_primeira_mensalidade_vence_no_fim_do_teste_ou_hoje(tenant: Tenant) -> None:
    em_teste = assinatura_de(tenant, teste_termina_em=HOJE + timedelta(days=10))
    assert regras.primeiro_vencimento(em_teste, HOJE) == HOJE + timedelta(days=10)

    teste_vencido = assinatura_de(tenant, teste_termina_em=HOJE - timedelta(days=3))
    assert regras.primeiro_vencimento(teste_vencido, HOJE) == HOJE

    com_periodo_pago = assinatura_de(tenant, acesso_ate=HOJE + timedelta(days=5))
    assert regras.primeiro_vencimento(com_periodo_pago, HOJE) == HOJE + timedelta(days=5)


@pytest.mark.django_db
def test_cancelar_mantem_o_acesso_ate_o_fim_do_mes_pago(tenant: Tenant) -> None:
    assinatura = assinatura_de(
        tenant, assinatura_no_provedor="sub_1", teste_termina_em=date(2026, 9, 1)
    )
    fatura(assinatura, date(2026, 9, 20), SituacaoDaFatura.PAGA)

    assert regras.acesso_depois_do_cancelamento(assinatura, HOJE) == date(2026, 10, 19)


@pytest.mark.django_db
def test_cancelar_durante_o_teste_mantem_os_dias_gratis(tenant: Tenant) -> None:
    assinatura = assinatura_de(tenant, teste_termina_em=HOJE + timedelta(days=12))

    assert regras.acesso_depois_do_cancelamento(assinatura, HOJE) == HOJE + timedelta(days=12)


@pytest.mark.django_db
def test_cancelar_sem_nada_pago_encerra_hoje(tenant: Tenant) -> None:
    assinatura = assinatura_de(tenant, teste_termina_em=HOJE - timedelta(days=40))
    fatura(assinatura, HOJE - timedelta(days=10), SituacaoDaFatura.VENCIDA)

    assert regras.acesso_depois_do_cancelamento(assinatura, HOJE) == HOJE


@pytest.mark.django_db
@pytest.mark.parametrize(
    ("dias_restantes", "ja_avisados", "esperado"),
    [
        (8, [], []),
        (7, [], [7]),
        (3, [7], []),
        (1, [7], [1]),
        (1, [], [7, 1]),
        (0, [7, 1], []),
        (-1, [], []),
    ],
)
def test_avisos_de_fim_do_teste_saem_aos_sete_dias_e_na_vespera(
    tenant: Tenant, dias_restantes: int, ja_avisados: list[int], esperado: list[int]
) -> None:
    assinatura = assinatura_de(
        tenant,
        teste_termina_em=HOJE + timedelta(days=dias_restantes),
        avisos_de_fim_do_teste=ja_avisados,
    )

    assert regras.avisos_de_fim_do_teste_pendentes(assinatura, HOJE) == esperado


@pytest.mark.django_db
def test_quem_ja_assinou_nao_recebe_aviso_de_fim_do_teste(tenant: Tenant) -> None:
    assinatura = assinatura_de(
        tenant, teste_termina_em=HOJE + timedelta(days=1), assinatura_no_provedor="sub_1"
    )

    assert regras.avisos_de_fim_do_teste_pendentes(assinatura, HOJE) == []
