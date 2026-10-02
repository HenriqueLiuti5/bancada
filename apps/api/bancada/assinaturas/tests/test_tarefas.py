from datetime import timedelta
from decimal import Decimal

import pytest
from django.core import mail
from django.utils import timezone

from bancada.assinaturas.models import (
    Assinatura,
    Fatura,
    FormaDeCobranca,
    SituacaoDaAssinatura,
    SituacaoDaFatura,
)
from bancada.assinaturas.provedor import Cobranca
from bancada.assinaturas.tasks import revisar_assinaturas, sincronizar_cobrancas
from bancada.assinaturas.tests.conftest import ProvedorFalso
from bancada.tenants.models import Tenant, Usuario


def faltando(tenant: Tenant, dias: int) -> None:
    Assinatura.objects.filter(tenant=tenant).update(
        teste_termina_em=timezone.localdate() + timedelta(days=dias)
    )


def contratar(tenant: Tenant) -> Assinatura:
    assinatura = Assinatura.objects.get(tenant=tenant)
    assinatura.assinatura_no_provedor = "sub_1"
    assinatura.situacao = SituacaoDaAssinatura.ATIVA
    assinatura.teste_termina_em = timezone.localdate() - timedelta(days=60)
    assinatura.save()
    return assinatura


@pytest.mark.django_db
def test_revisao_suspende_quem_terminou_o_teste_sem_assinar(tenant: Tenant) -> None:
    faltando(tenant, -1)

    assert revisar_assinaturas() == 1
    assert Assinatura.objects.get(tenant=tenant).situacao == SituacaoDaAssinatura.SUSPENSA


@pytest.mark.django_db
def test_dono_e_avisado_sete_dias_antes_e_na_vespera_uma_vez_cada(
    tenant: Tenant, dono: Usuario
) -> None:
    faltando(tenant, 7)
    revisar_assinaturas()
    revisar_assinaturas()

    assert [mensagem.subject for mensagem in mail.outbox] == [
        "Seu teste grátis do Bancada termina em 7 dias"
    ]
    assert mail.outbox[0].to == [dono.email]
    assert "http://localhost:3000/assinatura" in mail.outbox[0].body
    assert "R$ 59,90" in mail.outbox[0].body

    faltando(tenant, 1)
    revisar_assinaturas()

    assert len(mail.outbox) == 2
    assert mail.outbox[1].subject == "Seu teste grátis do Bancada termina amanhã"


@pytest.mark.django_db
def test_aviso_de_fim_do_teste_vai_so_para_quem_e_dono(
    tenant: Tenant, dono: Usuario, tecnico: Usuario
) -> None:
    faltando(tenant, 7)

    revisar_assinaturas()

    assert [mensagem.to for mensagem in mail.outbox] == [[dono.email]]


@pytest.mark.django_db
def test_quem_assinou_nao_recebe_aviso_de_fim_do_teste(tenant: Tenant, dono: Usuario) -> None:
    contratar(tenant)
    faltando(tenant, 1)

    revisar_assinaturas()

    assert mail.outbox == []


@pytest.mark.django_db
def test_sincronizacao_traz_o_pagamento_que_o_webhook_perdeu(
    tenant: Tenant, provedor: ProvedorFalso
) -> None:
    assinatura = contratar(tenant)
    vencimento = timezone.localdate() - timedelta(days=10)
    Fatura.objects.create(
        tenant=tenant,
        assinatura=assinatura,
        id_no_provedor="pay_1",
        valor=Decimal("59.90"),
        vencimento=vencimento,
        situacao=SituacaoDaFatura.VENCIDA,
    )
    provedor.cobrancas["sub_1"] = [
        Cobranca(
            id="pay_1",
            assinatura="sub_1",
            valor=Decimal("59.90"),
            vencimento=vencimento,
            situacao=SituacaoDaFatura.PAGA,
            forma=FormaDeCobranca.PIX,
            paga_em=timezone.localdate(),
            link="https://sandbox.asaas.test/i/1",
        )
    ]

    assert sincronizar_cobrancas() == 1

    assinatura.refresh_from_db()
    assert assinatura.situacao == SituacaoDaAssinatura.ATIVA
    assert Fatura.objects.get(id_no_provedor="pay_1").situacao == SituacaoDaFatura.PAGA


@pytest.mark.django_db
def test_falha_no_asaas_nao_derruba_a_sincronizacao(
    tenant: Tenant, provedor: ProvedorFalso
) -> None:
    contratar(tenant)
    provedor.falhar_em = "cobrancas_da_assinatura"

    assert sincronizar_cobrancas() == 0
