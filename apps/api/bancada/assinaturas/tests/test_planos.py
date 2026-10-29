from datetime import timedelta
from decimal import Decimal

import pytest
from django.utils import timezone

from bancada.assinaturas.models import Plano
from bancada.assinaturas.planos import PLANOS, Tamanho, plano_que_cabe, tamanho_da
from bancada.tenants.models import Convite, Loja, Papel, Tenant, Usuario


def test_o_anual_custa_dez_mensalidades() -> None:
    assert [(condicoes.mensal, condicoes.anual) for condicoes in PLANOS.values()] == [
        (Decimal("39.90"), Decimal("399.00")),
        (Decimal("59.90"), Decimal("599.00")),
        (Decimal("119.90"), Decimal("1199.00")),
    ]


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
