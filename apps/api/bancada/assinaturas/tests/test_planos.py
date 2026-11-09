from datetime import timedelta
from decimal import Decimal

import pytest
from django.utils import timezone

from bancada.assinaturas.fundadores import DESCONTO_DE_FUNDADOR
from bancada.assinaturas.models import Plano
from bancada.assinaturas.planos import (
    PLANOS,
    Tamanho,
    plano_que_cabe,
    tamanho_da,
    tamanho_das_assistencias,
)
from bancada.tenants.models import Convite, Loja, Papel, Tenant, Usuario


def test_o_anual_custa_dez_mensalidades() -> None:
    assert [(condicoes.mensal, condicoes.anual) for condicoes in PLANOS.values()] == [
        (Decimal("49.90"), Decimal("499.00")),
        (Decimal("89.90"), Decimal("899.00")),
        (Decimal("179.90"), Decimal("1799.00")),
    ]


def test_o_preco_de_fundador_tem_o_desconto_prometido_e_o_anual_sao_dez_mensalidades() -> None:
    assert [
        (condicoes.fundador_mensal, condicoes.fundador_anual) for condicoes in PLANOS.values()
    ] == [
        (Decimal("34.90"), Decimal("349.00")),
        (Decimal("62.90"), Decimal("629.00")),
        (Decimal("125.90"), Decimal("1259.00")),
    ]
    for condicoes in PLANOS.values():
        assert round((1 - condicoes.fundador_mensal / condicoes.mensal) * 100) == (
            DESCONTO_DE_FUNDADOR
        )


@pytest.mark.parametrize(
    ("tamanho", "plano"),
    [
        (Tamanho(lojas=1, pessoas=2), Plano.SOLO),
        (Tamanho(lojas=1, pessoas=3), Plano.EQUIPE),
        (Tamanho(lojas=2, pessoas=1), Plano.REDE),
        (Tamanho(lojas=3, pessoas=40), Plano.REDE),
        (Tamanho(lojas=4, pessoas=1), None),
    ],
)
def test_o_plano_sugerido_e_o_mais_barato_que_cabe(tamanho: Tamanho, plano: Plano | None) -> None:
    assert plano_que_cabe(tamanho) == plano


@pytest.mark.django_db
def test_contam_a_equipe_ativa_os_convites_que_valem_e_as_lojas_abertas(tenant: Tenant) -> None:
    for nome, ativo in (("ana", True), ("bia", True), ("caio", False)):
        Usuario.objects.create_user(
            username=nome,
            email=f"{nome}@central.test",
            tenant=tenant,
            papel=Papel.TECNICO,
            is_active=ativo,
        )
    agora = timezone.now()
    Convite.objects.create(tenant=tenant, nome="Valendo", papel=Papel.ATENDENTE)
    Convite.objects.create(
        tenant=tenant, nome="Vencido", papel=Papel.ATENDENTE, expira_em=agora - timedelta(minutes=1)
    )
    Convite.objects.create(tenant=tenant, nome="Aceito", papel=Papel.ATENDENTE, aceito_em=agora)
    Loja.objects.create(tenant=tenant, nome="Matriz")
    Loja.objects.create(tenant=tenant, nome="Fechada", ativa=False)

    assert tamanho_da(tenant) == Tamanho(lojas=1, pessoas=3)


@pytest.mark.django_db
def test_o_tamanho_de_todas_as_assistencias_conta_como_o_de_cada_uma(
    tenant: Tenant, outro_tenant: Tenant
) -> None:
    Usuario.objects.create_user(username="ana", tenant=tenant, papel=Papel.DONO)
    Usuario.objects.create_user(
        username="caio", tenant=tenant, papel=Papel.TECNICO, is_active=False
    )
    Convite.objects.create(tenant=tenant, nome="Valendo", papel=Papel.ATENDENTE)
    Loja.objects.create(tenant=outro_tenant, nome="Matriz")
    Loja.objects.create(tenant=outro_tenant, nome="Filial")

    tamanhos = tamanho_das_assistencias()

    assert tamanhos[tenant.pk] == tamanho_da(tenant) == Tamanho(lojas=0, pessoas=2)
    assert tamanhos[outro_tenant.pk] == tamanho_da(outro_tenant) == Tamanho(lojas=2, pessoas=0)
