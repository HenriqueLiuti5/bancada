import io
import json
import urllib.error
import urllib.request
from datetime import date
from decimal import Decimal
from email.message import Message
from typing import Any, cast

import pytest

from reparium.assinaturas.models import FormaDeCobranca, SituacaoDaFatura
from reparium.assinaturas.provedor import (
    Asaas,
    ErroNoProvedor,
    cobranca_do_asaas,
    evento_do_asaas,
)

CHAVE = "$aact_hmlg_000chave"


@pytest.fixture
def pedidos(monkeypatch: pytest.MonkeyPatch) -> list[urllib.request.Request]:
    enviados: list[urllib.request.Request] = []

    def urlopen_falso(pedido: urllib.request.Request, timeout: int) -> io.BytesIO:
        enviados.append(pedido)
        return io.BytesIO(json.dumps({"id": "sub_123", "data": []}).encode())

    monkeypatch.setattr(urllib.request, "urlopen", urlopen_falso)
    return enviados


def asaas() -> Asaas:
    return Asaas(url="https://api-sandbox.asaas.com/v3/", chave=CHAVE)


def test_criar_assinatura_manda_o_pedido_que_o_asaas_espera(
    pedidos: list[urllib.request.Request],
) -> None:
    identificador = asaas().criar_assinatura(
        cliente="cus_1",
        valor=Decimal("89.90"),
        ciclo="mensal",
        primeiro_vencimento=date(2026, 11, 1),
        descricao="Assinatura mensal do Reparium, plano Equipe",
        referencia="assistencia-1",
    )

    pedido = pedidos[0]
    assert identificador == "sub_123"
    assert pedido.full_url == "https://api-sandbox.asaas.com/v3/subscriptions"
    assert pedido.get_method() == "POST"
    assert pedido.get_header("Access_token") == CHAVE
    assert pedido.get_header("User-agent") == "Reparium"
    assert json.loads(cast(bytes, pedido.data)) == {
        "customer": "cus_1",
        "billingType": "UNDEFINED",
        "value": 89.9,
        "nextDueDate": "2026-11-01",
        "cycle": "MONTHLY",
        "description": "Assinatura mensal do Reparium, plano Equipe",
        "externalReference": "assistencia-1",
    }


def test_assinatura_anual_vai_ao_asaas_com_o_ciclo_de_um_ano(
    pedidos: list[urllib.request.Request],
) -> None:
    asaas().criar_assinatura(
        cliente="cus_1",
        valor=Decimal("499.00"),
        ciclo="anual",
        primeiro_vencimento=date(2026, 11, 1),
        descricao="Assinatura anual do Reparium, plano Solo",
        referencia="assistencia-1",
    )

    corpo = json.loads(cast(bytes, pedidos[0].data))
    assert (corpo["cycle"], corpo["value"]) == ("YEARLY", 499.0)


def test_trocar_o_plano_muda_no_asaas_so_as_proximas_faturas(
    pedidos: list[urllib.request.Request],
) -> None:
    asaas().atualizar_assinatura(
        "sub_1", valor=Decimal("179.90"), descricao="Assinatura mensal do Reparium, plano Rede"
    )

    assert pedidos[0].full_url == "https://api-sandbox.asaas.com/v3/subscriptions/sub_1"
    assert pedidos[0].get_method() == "POST"
    assert json.loads(cast(bytes, pedidos[0].data)) == {
        "value": 179.9,
        "description": "Assinatura mensal do Reparium, plano Rede",
        "updatePendingPayments": False,
    }


def test_devolucao_do_pix_e_do_cartao_e_feita_na_hora(
    pedidos: list[urllib.request.Request],
) -> None:
    assert asaas().devolver_cobranca("pay_1", boleto=False) == ""

    assert pedidos[0].full_url == "https://api-sandbox.asaas.com/v3/payments/pay_1/refund"
    assert pedidos[0].get_method() == "POST"
    assert json.loads(cast(bytes, pedidos[0].data)) == {}


def test_devolucao_do_boleto_traz_o_link_para_informar_a_conta(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    enviados: list[urllib.request.Request] = []

    def urlopen_falso(pedido: urllib.request.Request, timeout: int) -> io.BytesIO:
        enviados.append(pedido)
        link = "https://sandbox.asaas.com/solicitar-estorno/37ij5mdxwo1234"
        return io.BytesIO(json.dumps({"requestUrl": link}).encode())

    monkeypatch.setattr(urllib.request, "urlopen", urlopen_falso)

    link = asaas().devolver_cobranca("pay_1", boleto=True)

    assert link == "https://sandbox.asaas.com/solicitar-estorno/37ij5mdxwo1234"
    assert enviados[0].full_url == (
        "https://api-sandbox.asaas.com/v3/payments/pay_1/bankSlip/refund"
    )


def test_sem_chave_configurada_nada_e_enviado(pedidos: list[urllib.request.Request]) -> None:
    with pytest.raises(ErroNoProvedor, match="não está configurada"):
        Asaas(url="https://api-sandbox.asaas.com/v3", chave="").cancelar_assinatura("sub_1")

    assert pedidos == []


def test_erro_do_asaas_chega_com_a_explicacao_dele(monkeypatch: pytest.MonkeyPatch) -> None:
    corpo = {"errors": [{"code": "invalid_cpfCnpj", "description": "O CPF/CNPJ é inválido."}]}

    def urlopen_falso(pedido: urllib.request.Request, timeout: int) -> Any:
        raise urllib.error.HTTPError(
            pedido.full_url, 400, "Bad Request", Message(), io.BytesIO(json.dumps(corpo).encode())
        )

    monkeypatch.setattr(urllib.request, "urlopen", urlopen_falso)

    with pytest.raises(ErroNoProvedor, match="O CPF/CNPJ é inválido."):
        asaas().criar_cliente(nome="X", documento="1", email="x@x.test", referencia="r")


def test_asaas_fora_do_ar_vira_mensagem_para_tentar_de_novo(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def urlopen_falso(pedido: urllib.request.Request, timeout: int) -> Any:
        raise urllib.error.URLError("connection refused")

    monkeypatch.setattr(urllib.request, "urlopen", urlopen_falso)

    with pytest.raises(ErroNoProvedor, match="Tente de novo"):
        asaas().cobrancas_da_assinatura("sub_1")


def test_cobranca_paga_por_pix_vem_com_a_data_do_pagamento() -> None:
    cobranca = cobranca_do_asaas(
        {
            "id": "pay_1",
            "subscription": "sub_1",
            "value": 89.9,
            "billingType": "PIX",
            "status": "RECEIVED",
            "dueDate": "2026-11-01",
            "paymentDate": "2026-10-30",
            "invoiceUrl": "https://sandbox.asaas.com/i/1",
        }
    )

    assert cobranca.valor == Decimal("89.9")
    assert cobranca.situacao == SituacaoDaFatura.PAGA
    assert cobranca.forma == FormaDeCobranca.PIX
    assert cobranca.paga_em == date(2026, 10, 30)


def test_cobranca_traz_o_valor_liquido_depois_da_taxa_do_asaas() -> None:
    dados = {"id": "pay_1", "value": 89.9, "dueDate": "2026-11-01", "status": "RECEIVED"}

    assert cobranca_do_asaas({**dados, "netValue": 57.91}).valor_liquido == Decimal("57.91")
    assert cobranca_do_asaas(dados).valor_liquido is None


@pytest.mark.parametrize(
    ("dados", "situacao"),
    [
        ({"status": "PENDING"}, SituacaoDaFatura.ABERTA),
        ({"status": "OVERDUE"}, SituacaoDaFatura.VENCIDA),
        ({"status": "CONFIRMED"}, SituacaoDaFatura.PAGA),
        ({"status": "REFUNDED"}, SituacaoDaFatura.ESTORNADA),
        ({"status": "PENDING", "deleted": True}, SituacaoDaFatura.CANCELADA),
    ],
)
def test_situacoes_do_asaas_viram_situacoes_da_fatura(dados: dict[str, Any], situacao: str) -> None:
    cobranca = cobranca_do_asaas({"id": "pay_1", "value": 89.9, "dueDate": "2026-11-01", **dados})

    assert cobranca.situacao == situacao
    assert cobranca.paga_em is None or situacao == SituacaoDaFatura.PAGA


def test_evento_sem_id_ganha_um_identificador_estavel() -> None:
    corpo = {
        "event": "PAYMENT_CREATED",
        "dateCreated": "2026-10-02 10:00:00",
        "payment": {"id": "pay_1", "value": 89.9, "dueDate": "2026-11-01"},
    }

    primeiro = evento_do_asaas(corpo).id
    assert primeiro == evento_do_asaas(corpo).id
    assert primeiro == "PAYMENT_CREATED:pay_1:2026-10-02 10:00:00"
