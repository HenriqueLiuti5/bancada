from decimal import Decimal
from typing import Any

import pytest
from rest_framework.test import APIClient

from bancada.estoque.models import MovimentoDeEstoque, Produto, TipoDeMovimento, custo_medio
from bancada.tenants.models import Loja, Tenant, Usuario


def entrada(api: APIClient, produto: Produto, **dados: Any) -> Any:
    return api.post(f"/api/produtos/{produto.pk}/entrada/", dados, format="json")


def contagem(api: APIClient, produto: Produto, **dados: Any) -> Any:
    return api.post(f"/api/produtos/{produto.pk}/contagem/", dados, format="json")


def transferencia(api: APIClient, produto: Produto, **dados: Any) -> Any:
    return api.post(f"/api/produtos/{produto.pk}/transferencia/", dados, format="json")


def test_custo_medio_pondera_o_que_havia_com_o_que_chegou() -> None:
    assert custo_medio(Decimal("180.00"), 3, 1, Decimal("200.00")) == Decimal("185.00")
    assert custo_medio(Decimal("10.00"), 2, 1, Decimal("11.00")) == Decimal("10.33")


def test_sem_estoque_o_custo_passa_a_ser_o_da_compra() -> None:
    assert custo_medio(Decimal("180.00"), 0, 2, Decimal("210.00")) == Decimal("210.00")
    assert custo_medio(Decimal("180.00"), -1, 1, Decimal("210.00")) == Decimal("210.00")


@pytest.mark.django_db
def test_entrada_soma_ao_estoque_e_atualiza_o_custo(
    api_tecnico: APIClient, tecnico: Usuario, tela: Produto, loja: Loja
) -> None:
    resposta = entrada(
        api_tecnico, tela, quantidade=1, custo_unitario="200.00", fornecedor=" Distribuidora Sul "
    )

    assert resposta.status_code == 200
    assert resposta.json()["quantidade"] == 4
    assert resposta.json()["custo"] == "185.00"

    ultimo = MovimentoDeEstoque.objects.filter(produto=tela).first()
    assert ultimo is not None
    assert ultimo.tipo == TipoDeMovimento.ENTRADA
    assert ultimo.loja == loja
    assert ultimo.custo_unitario == Decimal("200.00")
    assert ultimo.fornecedor == "Distribuidora Sul"
    assert ultimo.usuario == tecnico


@pytest.mark.django_db
def test_entrada_recusa_quantidade_zero_e_custo_negativo(
    api_tecnico: APIClient, tela: Produto
) -> None:
    resposta = entrada(api_tecnico, tela, quantidade=0, custo_unitario="-1")

    assert resposta.status_code == 400
    assert resposta.json()["quantidade"] == ["A quantidade precisa ser maior que zero."]
    assert resposta.json()["custo_unitario"] == ["O valor não pode ser negativo."]


@pytest.mark.django_db
def test_entrada_com_varias_lojas_pede_uma_loja_ativa_da_assistencia(
    api_tecnico: APIClient, tela: Produto, shopping: Loja, outro_tenant: Tenant
) -> None:
    sem_loja = entrada(api_tecnico, tela, quantidade=1, custo_unitario="180")
    assert sem_loja.json()["loja"] == ["Escolha a loja."]

    alheia = Loja.objects.create(tenant=outro_tenant, nome="Alheia")
    de_fora = entrada(api_tecnico, tela, quantidade=1, custo_unitario="180", loja=alheia.pk)
    assert de_fora.json()["loja"] == ["Não pertence à sua assistência."]

    shopping.ativa = False
    shopping.save()
    desativada = entrada(api_tecnico, tela, quantidade=1, custo_unitario="180", loja=shopping.pk)
    assert desativada.json()["loja"] == ["Esta loja foi desativada. Escolha uma loja ativa."]


@pytest.mark.django_db
def test_contagem_corrige_para_o_numero_contado(
    api_atendente: APIClient, tela: Produto, loja: Loja
) -> None:
    resposta = contagem(api_atendente, tela, contada=1, observacao="Uma quebrou na instalação")

    assert resposta.status_code == 200
    assert resposta.json()["quantidade"] == 1
    ajuste = MovimentoDeEstoque.objects.get(produto=tela, tipo=TipoDeMovimento.AJUSTE)
    assert ajuste.quantidade == -2
    assert ajuste.observacao == "Uma quebrou na instalação"


@pytest.mark.django_db
def test_contagem_que_ja_bate_nao_cria_movimento(api_tecnico: APIClient, tela: Produto) -> None:
    resposta = contagem(api_tecnico, tela, contada=3)

    assert resposta.status_code == 200
    assert not MovimentoDeEstoque.objects.filter(tipo=TipoDeMovimento.AJUSTE).exists()


@pytest.mark.django_db
def test_transferencia_leva_de_uma_loja_para_a_outra(
    api_tecnico: APIClient, tela: Produto, loja: Loja, shopping: Loja
) -> None:
    resposta = transferencia(api_tecnico, tela, de=loja.pk, para=shopping.pk, quantidade=2)

    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["quantidade"] == 3
    assert [(linha["nome"], linha["quantidade"]) for linha in corpo["por_loja"]] == [
        ("Matriz", 1),
        ("Shopping", 2),
    ]
    observacoes = set(
        MovimentoDeEstoque.objects.filter(tipo=TipoDeMovimento.TRANSFERENCIA).values_list(
            "observacao", flat=True
        )
    )
    assert observacoes == {"Para Shopping", "De Matriz"}


@pytest.mark.django_db
def test_transferencia_nao_tira_mais_do_que_a_loja_tem(
    api_tecnico: APIClient, tela: Produto, loja: Loja, shopping: Loja
) -> None:
    demais = transferencia(api_tecnico, tela, de=loja.pk, para=shopping.pk, quantidade=4)
    assert demais.status_code == 400
    assert demais.json()["quantidade"] == ["Matriz só tem 3 unidades deste produto."]

    vazia = transferencia(api_tecnico, tela, de=shopping.pk, para=loja.pk, quantidade=1)
    assert vazia.json()["quantidade"] == ["Shopping não tem este produto para transferir."]

    mesma = transferencia(api_tecnico, tela, de=loja.pk, para=loja.pk, quantidade=1)
    assert mesma.json()["para"] == ["Escolha outra loja para receber."]


@pytest.mark.django_db
def test_historico_mostra_cada_movimento_com_quem_fez(
    api_tecnico: APIClient, tecnico: Usuario, tela: Produto, loja: Loja
) -> None:
    tecnico.first_name = "Joana"
    tecnico.save()
    entrada(api_tecnico, tela, quantidade=2, custo_unitario="170.00", fornecedor="Distribuidora")

    resposta = api_tecnico.get(f"/api/produtos/{tela.pk}/movimentos/")

    assert resposta.status_code == 200
    linhas = resposta.json()["results"]
    assert [(linha["tipo_rotulo"], linha["quantidade"]) for linha in linhas] == [
        ("Entrada de compra", 2),
        ("Estoque inicial", 3),
    ]
    assert linhas[0]["usuario"] == "Joana"
    assert linhas[0]["fornecedor"] == "Distribuidora"
    assert linhas[0]["loja_nome"] == "Matriz"


@pytest.mark.django_db
def test_fornecedores_sugeridos_vem_das_entradas_mais_recentes(
    api_tecnico: APIClient, tela: Produto, capa: Produto
) -> None:
    entrada(api_tecnico, tela, quantidade=1, custo_unitario="180", fornecedor="Peças Norte")
    entrada(api_tecnico, capa, quantidade=5, custo_unitario="12", fornecedor="Capas & Cia")
    entrada(api_tecnico, tela, quantidade=1, custo_unitario="180", fornecedor="Peças Norte")

    resposta = api_tecnico.get("/api/produtos/fornecedores/")

    assert resposta.json() == ["Peças Norte", "Capas & Cia"]


@pytest.mark.django_db
def test_escolha_lista_os_ativos_com_a_quantidade_de_cada_loja(
    api_tecnico: APIClient, tela: Produto, capa: Produto, loja: Loja, shopping: Loja
) -> None:
    tela.transferir(de=loja, para=shopping, quantidade=1)
    capa.ativo = False
    capa.save()

    resposta = api_tecnico.get("/api/produtos/escolha/")

    corpo = resposta.json()
    assert corpo["varias_lojas"] is True
    assert [produto["nome"] for produto in corpo["produtos"]] == ["Tela Moto G54"]
    assert corpo["produtos"][0]["quantidade"] == 3
    assert corpo["produtos"][0]["por_loja"] == {str(loja.pk): 2, str(shopping.pk): 1}
