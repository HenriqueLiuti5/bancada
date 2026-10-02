from datetime import date, timedelta
from typing import Any

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from bancada.assinaturas.models import (
    Assinatura,
    EventoDoProvedor,
    Fatura,
    SituacaoDaAssinatura,
    SituacaoDaFatura,
)
from bancada.assinaturas.tests.conftest import TOKEN_DO_WEBHOOK
from bancada.tenants.models import Tenant

URL = "/api/webhooks/asaas/"


@pytest.fixture
def contratada(tenant: Tenant) -> Assinatura:
    assinatura = Assinatura.objects.get(tenant=tenant)
    assinatura.cliente_no_provedor = "cus_abc"
    assinatura.assinatura_no_provedor = "sub_abc"
    assinatura.situacao = SituacaoDaAssinatura.ATIVA
    assinatura.teste_termina_em = timezone.localdate() - timedelta(days=60)
    assinatura.save()
    return assinatura


def evento_de_cobranca(
    tipo: str,
    *,
    id_do_evento: str = "evt_1",
    status: str = "PENDING",
    vencimento: date | None = None,
    assinatura: str = "sub_abc",
    **extras: Any,
) -> dict[str, Any]:
    return {
        "id": id_do_evento,
        "event": tipo,
        "dateCreated": "2026-10-02 10:00:00",
        "payment": {
            "object": "payment",
            "id": "pay_1",
            "customer": "cus_abc",
            "subscription": assinatura,
            "value": 59.9,
            "billingType": "UNDEFINED",
            "status": status,
            "dueDate": (vencimento or timezone.localdate()).isoformat(),
            "invoiceUrl": "https://sandbox.asaas.com/i/1",
            "deleted": False,
            **extras,
        },
    }


def enviar(corpo: dict[str, Any], token: str | None = TOKEN_DO_WEBHOOK) -> Any:
    cliente_api = APIClient()
    if token is not None:
        cliente_api.credentials(HTTP_ASAAS_ACCESS_TOKEN=token)
    return cliente_api.post(URL, corpo, format="json")


@pytest.mark.django_db
@pytest.mark.parametrize("token", [None, "", "token-errado-com-mais-de-32-caracteres-aqui"])
def test_webhook_sem_o_token_certo_e_recusado(contratada: Assinatura, token: str | None) -> None:
    resposta = enviar(evento_de_cobranca("PAYMENT_CREATED"), token=token)

    assert resposta.status_code == 401
    assert not EventoDoProvedor.objects.exists()
    assert not Fatura.objects.exists()


@pytest.mark.django_db
def test_webhook_fica_fechado_se_o_servidor_nao_tem_token(
    contratada: Assinatura, settings: Any
) -> None:
    settings.ASAAS_WEBHOOK_TOKEN = ""

    assert enviar(evento_de_cobranca("PAYMENT_CREATED"), token="").status_code == 401


@pytest.mark.django_db
def test_cobranca_nova_vira_fatura_aberta(contratada: Assinatura) -> None:
    resposta = enviar(evento_de_cobranca("PAYMENT_CREATED"))

    assert resposta.status_code == 200
    assert resposta.json() == {"resultado": "processado"}
    fatura = Fatura.objects.get(id_no_provedor="pay_1")
    assert fatura.assinatura == contratada
    assert fatura.situacao == SituacaoDaFatura.ABERTA
    assert fatura.link_de_pagamento == "https://sandbox.asaas.com/i/1"


@pytest.mark.django_db
def test_cobranca_vencida_deixa_a_assistencia_inadimplente(contratada: Assinatura) -> None:
    vencimento = timezone.localdate() - timedelta(days=2)

    enviar(evento_de_cobranca("PAYMENT_OVERDUE", status="OVERDUE", vencimento=vencimento))

    contratada.refresh_from_db()
    assert contratada.situacao == SituacaoDaAssinatura.INADIMPLENTE
    assert Fatura.objects.get(id_no_provedor="pay_1").situacao == SituacaoDaFatura.VENCIDA


@pytest.mark.django_db
def test_atraso_alem_da_tolerancia_suspende(contratada: Assinatura) -> None:
    vencimento = timezone.localdate() - timedelta(days=10)

    enviar(evento_de_cobranca("PAYMENT_OVERDUE", status="OVERDUE", vencimento=vencimento))

    contratada.refresh_from_db()
    assert contratada.situacao == SituacaoDaAssinatura.SUSPENSA


@pytest.mark.django_db
def test_pagamento_recebido_reativa_e_guarda_a_data(contratada: Assinatura) -> None:
    vencimento = timezone.localdate() - timedelta(days=10)
    enviar(evento_de_cobranca("PAYMENT_OVERDUE", status="OVERDUE", vencimento=vencimento))

    enviar(
        evento_de_cobranca(
            "PAYMENT_RECEIVED",
            id_do_evento="evt_2",
            status="RECEIVED",
            vencimento=vencimento,
            billingType="PIX",
            paymentDate=timezone.localdate().isoformat(),
        )
    )

    contratada.refresh_from_db()
    fatura = Fatura.objects.get(id_no_provedor="pay_1")
    assert contratada.situacao == SituacaoDaAssinatura.ATIVA
    assert fatura.situacao == SituacaoDaFatura.PAGA
    assert fatura.paga_em == timezone.localdate()
    assert fatura.forma_de_pagamento == "pix"


@pytest.mark.django_db
def test_evento_repetido_e_processado_uma_vez_so(contratada: Assinatura) -> None:
    corpo = evento_de_cobranca("PAYMENT_CREATED")

    primeira = enviar(corpo)
    segunda = enviar(corpo)

    assert primeira.json() == {"resultado": "processado"}
    assert segunda.status_code == 200
    assert segunda.json() == {"resultado": "repetido"}
    assert EventoDoProvedor.objects.count() == 1


@pytest.mark.django_db
def test_cobranca_que_nao_e_do_bancada_e_ignorada(contratada: Assinatura) -> None:
    resposta = enviar(evento_de_cobranca("PAYMENT_CREATED", assinatura="sub_de_outra_coisa"))

    assert resposta.status_code == 200
    assert resposta.json() == {"resultado": "ignorado"}
    assert not Fatura.objects.exists()


@pytest.mark.django_db
def test_cobranca_removida_no_asaas_fica_cancelada(contratada: Assinatura) -> None:
    enviar(evento_de_cobranca("PAYMENT_CREATED"))

    enviar(evento_de_cobranca("PAYMENT_DELETED", id_do_evento="evt_2", deleted=True))

    assert Fatura.objects.get(id_no_provedor="pay_1").situacao == SituacaoDaFatura.CANCELADA


@pytest.mark.django_db
def test_assinatura_removida_no_asaas_e_cancelada_no_bancada(contratada: Assinatura) -> None:
    resposta = enviar(
        {
            "id": "evt_9",
            "event": "SUBSCRIPTION_DELETED",
            "subscription": {"id": "sub_abc", "customer": "cus_abc", "deleted": True},
        }
    )

    contratada.refresh_from_db()
    assert resposta.json() == {"resultado": "processado"}
    assert contratada.situacao == SituacaoDaAssinatura.CANCELADA
    assert contratada.acesso_ate == timezone.localdate()
