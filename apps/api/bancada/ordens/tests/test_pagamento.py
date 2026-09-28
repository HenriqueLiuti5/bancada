from decimal import Decimal
from typing import Any

import pytest
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from bancada.auditoria.models import Acao, RegistroDeAuditoria
from bancada.ordens.documentos import html_do_recibo
from bancada.ordens.estados import StatusOS
from bancada.ordens.models import (
    FormaDePagamento,
    ItemOrcamento,
    OrdemServico,
    Pagamento,
    PagamentoAcimaDoSaldo,
    Recebimento,
)
from bancada.tenants.models import Usuario

CAMINHO_ATE_PRONTO = [
    StatusOS.EM_DIAGNOSTICO,
    StatusOS.ORCAMENTO_ENVIADO,
    StatusOS.APROVADO,
    StatusOS.EM_REPARO,
    StatusOS.PRONTO,
]


def api_de(usuario: Usuario) -> APIClient:
    cliente_api = APIClient()
    token, _ = Token.objects.get_or_create(user=usuario)
    cliente_api.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    return cliente_api


def entregar(api: APIClient, ordem: OrdemServico, **cobranca: Any) -> Any:
    return api.post(
        f"/api/ordens/{ordem.pk}/transicionar/",
        {"status": StatusOS.ENTREGUE, "cobranca": cobranca},
        format="json",
    )


def receber(api: APIClient, ordem: OrdemServico, forma: str, valor: str) -> Any:
    return api.post(
        f"/api/ordens/{ordem.pk}/pagamentos/", {"forma": forma, "valor": valor}, format="json"
    )


@pytest.fixture
def pronta(ordem: OrdemServico) -> OrdemServico:
    ItemOrcamento.objects.create(ordem=ordem, descricao="Tela", valor="320.00")
    ItemOrcamento.objects.create(ordem=ordem, descricao="Mão de obra", valor="90.00")
    for status in CAMINHO_ATE_PRONTO:
        ordem.transicionar(status)
    return ordem


@pytest.mark.django_db
def test_entrega_registra_o_valor_cobrado_e_cada_forma_de_pagamento(
    api_tecnico: APIClient, tecnico: Usuario, pronta: OrdemServico
) -> None:
    tecnico.first_name = "Joana"
    tecnico.save()

    resposta = entregar(
        api_tecnico,
        pronta,
        valor_cobrado="400.00",
        pagamentos=[{"forma": "pix", "valor": "250.00"}, {"forma": "dinheiro", "valor": "150.00"}],
    )

    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["status"] == StatusOS.ENTREGUE
    assert corpo["valor_cobrado"] == "400.00"
    assert corpo["desconto"] == "10.00"
    assert corpo["total_pago"] == "400.00"
    assert corpo["saldo_a_receber"] == "0.00"
    assert [(p["forma_rotulo"], p["valor"]) for p in corpo["pagamentos"]] == [
        ("PIX", "250.00"),
        ("Dinheiro", "150.00"),
    ]
    assert {p["registrado_por"] for p in corpo["pagamentos"]} == {"Joana"}


@pytest.mark.django_db
def test_pagamento_da_entrega_fica_com_a_data_da_entrega(
    api_tecnico: APIClient, pronta: OrdemServico
) -> None:
    entregar(
        api_tecnico, pronta, valor_cobrado="410.00", pagamentos=[{"forma": "pix", "valor": "410"}]
    )

    pronta.refresh_from_db()
    assert Pagamento.objects.get(ordem=pronta).recebido_em == pronta.entregue_em


@pytest.mark.django_db
def test_entregar_sem_informar_a_cobranca_e_recusado(
    api_tecnico: APIClient, pronta: OrdemServico
) -> None:
    resposta = api_tecnico.post(
        f"/api/ordens/{pronta.pk}/transicionar/", {"status": StatusOS.ENTREGUE}, format="json"
    )

    assert resposta.status_code == 400
    assert resposta.json()["cobranca"] == ["Informe quanto foi cobrado e como o cliente pagou."]
    pronta.refresh_from_db()
    assert pronta.status == StatusOS.PRONTO


@pytest.mark.django_db
def test_cobranca_fora_da_entrega_e_recusada(api_tecnico: APIClient, ordem: OrdemServico) -> None:
    resposta = api_tecnico.post(
        f"/api/ordens/{ordem.pk}/transicionar/",
        {"status": StatusOS.EM_DIAGNOSTICO, "cobranca": {"valor_cobrado": "10.00"}},
        format="json",
    )

    assert resposta.status_code == 400
    assert resposta.json()["cobranca"] == ["O pagamento só é registrado na entrega do aparelho."]


@pytest.mark.django_db
def test_valor_cobrado_nao_passa_do_total_aprovado(
    api_tecnico: APIClient, pronta: OrdemServico
) -> None:
    resposta = entregar(api_tecnico, pronta, valor_cobrado="500.00")

    assert resposta.status_code == 400
    assert resposta.json()["cobranca"] == [
        "O valor cobrado não pode passar do total aprovado, que é R$ 410,00."
    ]


@pytest.mark.django_db
def test_pagamentos_nao_somam_mais_que_o_valor_cobrado(
    api_tecnico: APIClient, pronta: OrdemServico
) -> None:
    resposta = entregar(
        api_tecnico,
        pronta,
        valor_cobrado="400.00",
        pagamentos=[{"forma": "pix", "valor": "300.00"}, {"forma": "credito", "valor": "150.00"}],
    )

    assert resposta.status_code == 400
    assert resposta.json()["cobranca"] == [
        "Os pagamentos somam R$ 450,00, mais que o valor cobrado de R$ 400,00."
    ]
    assert not Pagamento.objects.exists()


@pytest.mark.django_db
def test_pagamento_precisa_de_valor_positivo_e_forma_conhecida(
    api_tecnico: APIClient, pronta: OrdemServico
) -> None:
    resposta = entregar(
        api_tecnico,
        pronta,
        valor_cobrado="400.00",
        pagamentos=[{"forma": "pix", "valor": "0"}, {"forma": "cheque", "valor": "10.00"}],
    )

    assert resposta.status_code == 400
    erros = resposta.json()["cobranca"]["pagamentos"]
    assert erros["0"]["valor"] == ["Cada pagamento precisa ter valor maior que zero."]
    assert erros["1"]["forma"] == ["Escolha PIX, dinheiro, débito ou crédito."]


@pytest.mark.django_db
def test_reparo_sem_custo_e_entregue_sem_pagamento(
    api_tecnico: APIClient, ordem: OrdemServico
) -> None:
    ItemOrcamento.objects.create(ordem=ordem, descricao="Reparo na garantia", valor="0.00")
    for status in CAMINHO_ATE_PRONTO:
        ordem.transicionar(status)

    resposta = entregar(api_tecnico, ordem, valor_cobrado="0.00", pagamentos=[])

    assert resposta.status_code == 200
    assert resposta.json()["saldo_a_receber"] == "0.00"


@pytest.mark.django_db
def test_entrega_sem_pagamento_fica_a_receber_ate_ser_quitada(
    atendente_do_tenant: Usuario, pronta: OrdemServico
) -> None:
    api = api_de(atendente_do_tenant)
    entregar(api, pronta, valor_cobrado="410.00", pagamentos=[{"forma": "pix", "valor": "100"}])

    detalhe = api.get(f"/api/ordens/{pronta.pk}/").json()
    assert detalhe["saldo_a_receber"] == "310.00"

    parcial = receber(api, pronta, "dinheiro", "200.00")
    alem_do_saldo = receber(api, pronta, "debito", "200.00")
    quitacao = receber(api, pronta, "debito", "110.00")
    depois_de_quitada = receber(api, pronta, "pix", "1.00")

    assert parcial.status_code == 201
    assert alem_do_saldo.status_code == 400
    assert alem_do_saldo.json()["valor"] == ["O valor passa do que falta receber, que é R$ 110,00."]
    assert quitacao.status_code == 201
    assert depois_de_quitada.json()["valor"] == ["Esta ordem não tem nada a receber."]
    assert api.get(f"/api/ordens/{pronta.pk}/").json()["saldo_a_receber"] == "0.00"


@pytest.mark.django_db
def test_ordem_ainda_nao_entregue_nao_recebe_pagamento(
    api_tecnico: APIClient, ordem: OrdemServico
) -> None:
    resposta = receber(api_tecnico, ordem, "pix", "50.00")

    assert resposta.status_code == 400
    assert resposta.json()["valor"] == ["Esta ordem não tem nada a receber."]


@pytest.mark.django_db
def test_so_o_dono_remove_um_pagamento_e_a_remocao_fica_registrada(
    api_tecnico: APIClient, dono: Usuario, pronta: OrdemServico
) -> None:
    entregar(
        api_tecnico, pronta, valor_cobrado="410.00", pagamentos=[{"forma": "pix", "valor": "410"}]
    )
    pagamento = Pagamento.objects.get(ordem=pronta)

    pelo_tecnico = api_tecnico.delete(f"/api/pagamentos/{pagamento.pk}/")
    pelo_dono = api_de(dono).delete(f"/api/pagamentos/{pagamento.pk}/")

    assert pelo_tecnico.status_code == 403
    assert pelo_dono.status_code == 204
    assert api_tecnico.get(f"/api/ordens/{pronta.pk}/").json()["saldo_a_receber"] == "410.00"

    registro = RegistroDeAuditoria.objects.get(acao=Acao.PAGAMENTO_REMOVIDO)
    assert registro.usuario == dono
    assert registro.objeto_id == pronta.pk
    assert registro.detalhe == f"OS #{pronta.numero}, PIX R$ 410,00"


@pytest.mark.django_db
def test_outra_assistencia_nao_mexe_nos_pagamentos(
    api_tecnico: APIClient, api_intruso: APIClient, pronta: OrdemServico
) -> None:
    entregar(api_tecnico, pronta, valor_cobrado="410.00", pagamentos=[])
    Pagamento.objects.create(ordem=pronta, forma=FormaDePagamento.PIX, valor="10.00")
    pagamento = Pagamento.objects.get(ordem=pronta)

    assert receber(api_intruso, pronta, "pix", "10.00").status_code == 404
    assert api_intruso.delete(f"/api/pagamentos/{pagamento.pk}/").status_code in {403, 404}
    assert Pagamento.objects.count() == 1


@pytest.mark.django_db
def test_pagamento_herda_a_assistencia_da_ordem(pronta: OrdemServico) -> None:
    pagamento = Pagamento.objects.create(ordem=pronta, forma=FormaDePagamento.PIX, valor="5.00")

    assert pagamento.tenant_id == pronta.tenant_id


@pytest.mark.django_db
def test_entrega_pelo_modelo_sem_cobranca_nao_inventa_valores(pronta: OrdemServico) -> None:
    pronta.transicionar(StatusOS.ENTREGUE)

    assert pronta.valor_cobrado is None
    assert pronta.saldo_a_receber == Decimal("0.00")
    with pytest.raises(PagamentoAcimaDoSaldo):
        pronta.receber(Recebimento(forma=FormaDePagamento.PIX, valor=Decimal("10.00")))


@pytest.mark.django_db
def test_lista_separa_as_ordens_com_valor_a_receber(
    api_tecnico: APIClient, pronta: OrdemServico, ordem: OrdemServico
) -> None:
    entregar(
        api_tecnico, pronta, valor_cobrado="410.00", pagamentos=[{"forma": "pix", "valor": "10"}]
    )

    resultados = api_tecnico.get("/api/ordens/?situacao=a_receber").json()["results"]

    assert [linha["id"] for linha in resultados] == [pronta.pk]


@pytest.mark.django_db
def test_lista_nao_mostra_ordem_quitada_como_a_receber(
    api_tecnico: APIClient, pronta: OrdemServico
) -> None:
    entregar(
        api_tecnico, pronta, valor_cobrado="410.00", pagamentos=[{"forma": "pix", "valor": "410"}]
    )

    assert api_tecnico.get("/api/ordens/?situacao=a_receber").json()["count"] == 0


@pytest.mark.django_db
def test_recibo_mostra_desconto_pagamentos_e_o_que_falta(
    api_tecnico: APIClient, pronta: OrdemServico
) -> None:
    entregar(
        api_tecnico,
        pronta,
        valor_cobrado="400.00",
        pagamentos=[{"forma": "credito", "valor": "300.00"}],
    )

    html = html_do_recibo(OrdemServico.objects.get(pk=pronta.pk))

    assert "-R$ 10,00" in html
    assert "Crédito em" in html
    assert "R$ 300,00" in html
    assert "Falta pagar" in html
    assert "R$ 100,00" in html


@pytest.mark.django_db
def test_recibo_de_entrega_antiga_nao_mostra_pagamento(pronta: OrdemServico) -> None:
    pronta.transicionar(StatusOS.ENTREGUE)

    assert "Total pago" not in html_do_recibo(pronta)
