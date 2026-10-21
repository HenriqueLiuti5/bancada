from decimal import Decimal
from typing import Any

import pytest
from rest_framework.test import APIClient

from bancada.auditoria.models import Acao, RegistroDeAuditoria
from bancada.estoque.models import MovimentoDeEstoque, Produto, TipoDeMovimento, Venda
from bancada.ordens.models import Cobranca, ItemOrcamento, OrdemServico, Recebimento
from bancada.tenants.models import Loja, Tenant, Usuario


def vender(api: APIClient, **dados: Any) -> Any:
    return api.post("/api/vendas/", dados, format="json")


def painel(api: APIClient, **parametros: Any) -> dict[str, Any]:
    resposta = api.get("/api/ordens/painel/", parametros)
    assert resposta.status_code == 200
    return resposta.json()


@pytest.mark.django_db
def test_venda_tira_do_estoque_e_guarda_preco_custo_e_pagamentos(
    api_atendente: APIClient,
    atendente_do_tenant: Usuario,
    capa: Produto,
    tela: Produto,
    loja: Loja,
) -> None:
    atendente_do_tenant.first_name = "Carla"
    atendente_do_tenant.save()

    resposta = vender(
        api_atendente,
        itens=[{"produto": capa.pk, "quantidade": 2}, {"produto": tela.pk, "quantidade": 1}],
        valor_cobrado="390.00",
        pagamentos=[{"forma": "pix", "valor": "300.00"}, {"forma": "dinheiro", "valor": "90"}],
        observacao="Cliente levou nota escrita à mão",
    )

    assert resposta.status_code == 201
    venda = resposta.json()
    assert venda["numero"] == 1
    assert venda["total"] == "399.80"
    assert venda["valor_cobrado"] == "390.00"
    assert venda["desconto"] == "9.80"
    assert venda["custo"] == "204.00"
    assert venda["lucro"] == "186.00"
    assert venda["vendida_por"] == "Carla"
    assert venda["resumo"] == "Capa Moto G54 ×2, Tela Moto G54"
    assert venda["formas"] == "PIX, Dinheiro"
    assert [
        (item["descricao"], item["quantidade"], item["subtotal"]) for item in venda["itens"]
    ] == [
        ("Capa Moto G54", 2, "79.80"),
        ("Tela Moto G54", 1, "320.00"),
    ]
    assert capa.quantidade_na_loja(loja) == 8
    assert tela.quantidade_na_loja(loja) == 2
    assert MovimentoDeEstoque.objects.filter(tipo=TipoDeMovimento.VENDA).count() == 2


@pytest.mark.django_db
def test_vendas_sao_numeradas_por_assistencia(
    api_tecnico: APIClient, capa: Produto, outro_tenant: Tenant
) -> None:
    alheia = Loja.objects.create(tenant=outro_tenant, nome="Alheia")
    Venda.objects.create(
        tenant=outro_tenant, numero=7, loja=alheia, total="1.00", valor_cobrado="1.00"
    )
    um = {"itens": [{"produto": capa.pk, "quantidade": 1}], "valor_cobrado": "39.90"}
    pagamento = [{"forma": "credito", "valor": "39.90"}]

    primeira = vender(api_tecnico, **um, pagamentos=pagamento).json()
    segunda = vender(api_tecnico, **um, pagamentos=pagamento).json()

    assert (primeira["numero"], segunda["numero"]) == (1, 2)


@pytest.mark.django_db
def test_mesmo_produto_em_duas_linhas_vira_uma(
    api_tecnico: APIClient, capa: Produto, loja: Loja
) -> None:
    resposta = vender(
        api_tecnico,
        itens=[{"produto": capa.pk, "quantidade": 1}, {"produto": capa.pk, "quantidade": 2}],
        valor_cobrado="119.70",
        pagamentos=[{"forma": "pix", "valor": "119.70"}],
    )

    assert [item["quantidade"] for item in resposta.json()["itens"]] == [3]
    assert capa.quantidade_na_loja(loja) == 7


@pytest.mark.django_db
def test_venda_sem_produto_ou_com_valores_que_nao_fecham_e_recusada(
    api_tecnico: APIClient, capa: Produto
) -> None:
    item = [{"produto": capa.pk, "quantidade": 1}]

    vazia = vender(api_tecnico, itens=[], valor_cobrado="0")
    assert vazia.json()["itens"] == {"non_field_errors": ["Escolha ao menos um produto."]}

    acima = vender(api_tecnico, itens=item, valor_cobrado="50.00")
    assert acima.json()["valor_cobrado"] == [
        "O valor cobrado não pode passar do total, que é R$ 39,90."
    ]

    faltando = vender(
        api_tecnico, itens=item, valor_cobrado="39.90", pagamentos=[{"forma": "pix", "valor": "30"}]
    )
    assert faltando.json()["pagamentos"] == [
        "Os pagamentos somam R$ 30,00, e o valor cobrado é R$ 39,90."
    ]

    zero = vender(api_tecnico, itens=[{"produto": capa.pk, "quantidade": 0}], valor_cobrado="0")
    assert zero.status_code == 400
    assert not Venda.objects.exists()


@pytest.mark.django_db
def test_venda_de_graca_dispensa_pagamento(api_tecnico: APIClient, capa: Produto) -> None:
    resposta = vender(api_tecnico, itens=[{"produto": capa.pk, "quantidade": 1}], valor_cobrado="0")

    assert resposta.status_code == 201
    assert resposta.json()["pagamentos"] == []


@pytest.mark.django_db
def test_produto_desativado_ou_de_outra_assistencia_nao_e_vendido(
    api_tecnico: APIClient, capa: Produto, outro_tenant: Tenant
) -> None:
    alheio = Produto.objects.create(tenant=outro_tenant, nome="Capa alheia", preco="10")
    de_fora = vender(
        api_tecnico, itens=[{"produto": alheio.pk, "quantidade": 1}], valor_cobrado="0"
    )
    assert de_fora.status_code == 400
    assert "itens" in de_fora.json()

    capa.ativo = False
    capa.save()
    desativado = vender(
        api_tecnico, itens=[{"produto": capa.pk, "quantidade": 1}], valor_cobrado="0"
    )
    assert desativado.json()["itens"] == ["Capa Moto G54 foi desativado e não pode ser vendido."]
    assert not Venda.objects.exists()


@pytest.mark.django_db
def test_com_varias_lojas_a_venda_sai_da_loja_escolhida(
    api_tecnico: APIClient, capa: Produto, loja: Loja, shopping: Loja
) -> None:
    item = [{"produto": capa.pk, "quantidade": 1}]

    sem_loja = vender(api_tecnico, itens=item, valor_cobrado="0")
    assert sem_loja.json()["loja"] == ["Escolha a loja."]

    resposta = vender(api_tecnico, itens=item, valor_cobrado="0", loja=shopping.pk)
    assert resposta.json()["loja_nome"] == "Shopping"
    assert capa.quantidade_na_loja(shopping) == -1
    assert capa.quantidade_na_loja(loja) == 10


@pytest.mark.django_db
def test_lista_de_vendas_mais_recentes_primeiro(api_tecnico: APIClient, capa: Produto) -> None:
    for valor in ["39.90", "0"]:
        pagamentos = [{"forma": "pix", "valor": valor}] if valor != "0" else []
        vender(
            api_tecnico,
            itens=[{"produto": capa.pk, "quantidade": 1}],
            valor_cobrado=valor,
            pagamentos=pagamentos,
        )

    resposta = api_tecnico.get("/api/vendas/")

    assert resposta.status_code == 200
    assert [venda["numero"] for venda in resposta.json()["results"]] == [2, 1]


@pytest.mark.django_db
def test_so_o_dono_desfaz_a_venda_e_o_estoque_volta(
    api_dono: APIClient, dono: Usuario, api_tecnico: APIClient, capa: Produto, loja: Loja
) -> None:
    venda = vender(
        api_tecnico,
        itens=[{"produto": capa.pk, "quantidade": 3}],
        valor_cobrado="119.70",
        pagamentos=[{"forma": "debito", "valor": "119.70"}],
    ).json()

    pelo_tecnico = api_tecnico.post(f"/api/vendas/{venda['id']}/desfazer/")
    assert pelo_tecnico.status_code == 403

    pelo_dono = api_dono.post(f"/api/vendas/{venda['id']}/desfazer/")
    assert pelo_dono.status_code == 200
    assert pelo_dono.json()["desfeita"] is True
    assert pelo_dono.json()["desfeita_por"] == "Marcos"
    assert capa.quantidade_na_loja(loja) == 10

    registro = RegistroDeAuditoria.objects.get(acao=Acao.VENDA_DESFEITA)
    assert (registro.usuario, registro.objeto_id) == (dono, venda["id"])
    assert registro.detalhe == "Venda #1, R$ 119,70"

    de_novo = api_dono.post(f"/api/vendas/{venda['id']}/desfazer/")
    assert de_novo.status_code == 409
    assert de_novo.json()["detail"] == "Esta venda já foi desfeita."
    assert capa.quantidade_na_loja(loja) == 10


@pytest.mark.django_db
def test_venda_de_outra_assistencia_nao_aparece(
    api_tecnico: APIClient, api_intruso: APIClient, capa: Produto
) -> None:
    venda = vender(
        api_tecnico, itens=[{"produto": capa.pk, "quantidade": 1}], valor_cobrado="0"
    ).json()

    assert api_intruso.get(f"/api/vendas/{venda['id']}/").status_code == 404
    assert api_intruso.get("/api/vendas/").json()["count"] == 0


@pytest.mark.django_db
def test_painel_soma_as_vendas_ao_recebido_e_mostra_o_balcao(
    api_dono: APIClient,
    api_tecnico: APIClient,
    capa: Produto,
    ordem: OrdemServico,
) -> None:
    ItemOrcamento.objects.create(ordem=ordem, descricao="Tela", valor="300.00")
    for status in ["em_diagnostico", "orcamento_enviado", "aprovado", "em_reparo", "pronto"]:
        ordem.transicionar(status)
    ordem.transicionar(
        "entregue",
        cobranca=Cobranca(Decimal("300.00"), (Recebimento("pix", Decimal("300.00")),)),
    )
    vender(
        api_tecnico,
        itens=[{"produto": capa.pk, "quantidade": 2}],
        valor_cobrado="79.80",
        pagamentos=[{"forma": "pix", "valor": "40.00"}, {"forma": "dinheiro", "valor": "39.80"}],
    )
    desfeita = vender(
        api_tecnico,
        itens=[{"produto": capa.pk, "quantidade": 1}],
        valor_cobrado="39.90",
        pagamentos=[{"forma": "credito", "valor": "39.90"}],
    ).json()
    api_dono.post(f"/api/vendas/{desfeita['id']}/desfazer/")

    dinheiro = painel(api_dono)["dinheiro"]

    assert dinheiro["recebido"]["atual"] == "379.80"
    assert dinheiro["balcao"] == {"recebido": {"atual": "79.80", "anterior": "0.00"}, "vendas": 1}
    por_forma = {linha["forma"]: linha["valor"] for linha in dinheiro["por_forma"]}
    assert por_forma == {
        "pix": "340.00",
        "dinheiro": "39.80",
        "debito": "0.00",
        "credito": "0.00",
    }
    assert "dinheiro" not in painel(api_tecnico)


@pytest.mark.django_db
def test_painel_filtrado_por_loja_conta_so_as_vendas_dela(
    api_dono: APIClient, capa: Produto, loja: Loja, shopping: Loja
) -> None:
    vender(
        api_dono,
        itens=[{"produto": capa.pk, "quantidade": 1}],
        valor_cobrado="39.90",
        pagamentos=[{"forma": "pix", "valor": "39.90"}],
        loja=shopping.pk,
    )

    assert painel(api_dono, loja=loja.pk)["dinheiro"]["balcao"]["vendas"] == 0
    assert painel(api_dono, loja=shopping.pk)["dinheiro"]["balcao"]["vendas"] == 1


@pytest.mark.django_db
def test_painel_mostra_a_toda_a_equipe_o_que_precisa_repor(
    api_atendente: APIClient, tela: Produto, capa: Produto, loja: Loja
) -> None:
    assert painel(api_atendente)["estoque"] == {"para_repor": 0}

    tela.corrigir_contagem(loja=loja, contada=1)

    assert painel(api_atendente)["estoque"] == {"para_repor": 1}
