from decimal import Decimal
from typing import Any

import pytest
from rest_framework.test import APIClient

from bancada.estoque.models import MovimentoDeEstoque, Produto, TipoDeMovimento
from bancada.tenants.models import Loja, Tenant, Usuario


def cadastrar(api: APIClient, **dados: Any) -> Any:
    return api.post("/api/produtos/", dados, format="json")


@pytest.mark.django_db
def test_cadastro_com_quantidade_inicial_entra_na_unica_loja(
    api_atendente: APIClient, atendente_do_tenant: Usuario, loja: Loja
) -> None:
    resposta = cadastrar(
        api_atendente,
        nome="  Bateria iPhone 11 ",
        codigo="BAT-11",
        custo="95.00",
        preco="220.00",
        minimo=2,
        quantidade=4,
    )

    assert resposta.status_code == 201
    corpo = resposta.json()
    assert corpo["nome"] == "Bateria iPhone 11"
    assert corpo["tipo"] == "peca"
    assert corpo["quantidade"] == 4
    assert corpo["para_repor"] is False
    assert corpo["por_loja"] == []

    movimento = MovimentoDeEstoque.objects.get(produto_id=corpo["id"])
    assert movimento.tipo == TipoDeMovimento.INICIAL
    assert movimento.loja == loja
    assert movimento.quantidade == 4
    assert movimento.custo_unitario == Decimal("95.00")
    assert movimento.usuario == atendente_do_tenant


@pytest.mark.django_db
def test_cadastro_sem_quantidade_nao_cria_movimento(api_tecnico: APIClient, loja: Loja) -> None:
    resposta = cadastrar(api_tecnico, nome="Conector de carga tipo C", preco="80.00")

    assert resposta.status_code == 201
    assert resposta.json()["quantidade"] == 0
    assert not MovimentoDeEstoque.objects.exists()


@pytest.mark.django_db
def test_cadastro_com_quantidade_pede_a_loja_quando_ha_mais_de_uma(
    api_tecnico: APIClient, loja: Loja, shopping: Loja
) -> None:
    sem_loja = cadastrar(api_tecnico, nome="Película 3D", quantidade=5)
    assert sem_loja.status_code == 400
    assert sem_loja.json()["loja"] == ["Escolha a loja."]

    com_loja = cadastrar(api_tecnico, nome="Película 3D", quantidade=5, loja=shopping.pk)
    assert com_loja.status_code == 201
    assert com_loja.json()["por_loja"] == [
        {"loja": loja.pk, "nome": "Matriz", "ativa": True, "quantidade": 0},
        {"loja": shopping.pk, "nome": "Shopping", "ativa": True, "quantidade": 5},
    ]


@pytest.mark.django_db
def test_nome_e_obrigatorio(api_tecnico: APIClient) -> None:
    resposta = cadastrar(api_tecnico, nome="")

    assert resposta.status_code == 400
    assert resposta.json()["nome"] == ["Escreva o nome do produto."]


@pytest.mark.django_db
def test_codigo_repetido_na_mesma_assistencia_e_recusado(
    api_tecnico: APIClient, tela: Produto, outro_tenant: Tenant
) -> None:
    Produto.objects.create(tenant=outro_tenant, nome="Outra", codigo="BAT-11")

    repetido = cadastrar(api_tecnico, nome="Outra tela", codigo=" 7891234567890 ")
    assert repetido.status_code == 400
    assert repetido.json()["codigo"] == ["Já existe um produto com esse código."]

    de_outra_assistencia = cadastrar(api_tecnico, nome="Bateria", codigo="BAT-11")
    assert de_outra_assistencia.status_code == 201


@pytest.mark.django_db
def test_valores_negativos_sao_recusados(api_tecnico: APIClient) -> None:
    resposta = cadastrar(api_tecnico, nome="Tela", custo="-1", preco="-5", minimo=-1)

    assert resposta.status_code == 400
    corpo = resposta.json()
    assert corpo["custo"] == ["O valor não pode ser negativo."]
    assert corpo["preco"] == ["O valor não pode ser negativo."]
    assert corpo["minimo"] == ["A quantidade não pode ser negativa."]


@pytest.mark.django_db
def test_edicao_muda_preco_minimo_e_desativa(api_atendente: APIClient, tela: Produto) -> None:
    resposta = api_atendente.patch(
        f"/api/produtos/{tela.pk}/",
        {"preco": "340.00", "minimo": 5, "ativo": False},
        format="json",
    )

    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["preco"] == "340.00"
    assert corpo["minimo"] == 5
    assert corpo["ativo"] is False
    assert corpo["quantidade"] == 3
    assert corpo["para_repor"] is False


@pytest.mark.django_db
def test_edicao_pode_manter_o_proprio_codigo(api_tecnico: APIClient, tela: Produto) -> None:
    resposta = api_tecnico.patch(
        f"/api/produtos/{tela.pk}/", {"codigo": "7891234567890"}, format="json"
    )

    assert resposta.status_code == 200


@pytest.mark.django_db
def test_lista_busca_por_nome_e_por_codigo(
    api_tecnico: APIClient, tela: Produto, capa: Produto
) -> None:
    def nomes(**parametros: str) -> list[str]:
        resposta = api_tecnico.get("/api/produtos/", parametros)
        assert resposta.status_code == 200
        return [produto["nome"] for produto in resposta.json()["results"]]

    assert nomes() == ["Capa Moto G54", "Tela Moto G54"]
    assert nomes(busca="tela") == ["Tela Moto G54"]
    assert nomes(busca="78912345") == ["Tela Moto G54"]
    assert nomes(tipo="acessorio") == ["Capa Moto G54"]


@pytest.mark.django_db
def test_lista_separa_o_que_precisa_repor_e_os_desativados(
    api_tecnico: APIClient, tela: Produto, capa: Produto, tenant: Tenant, loja: Loja
) -> None:
    tela.corrigir_contagem(loja=loja, contada=1)
    parado = Produto.objects.create(tenant=tenant, nome="Flex antigo", ativo=False, minimo=3)

    repor = api_tecnico.get("/api/produtos/", {"situacao": "repor"}).json()["results"]
    assert [
        (produto["nome"], produto["quantidade"], produto["para_repor"]) for produto in repor
    ] == [("Tela Moto G54", 1, True)]

    desativados = api_tecnico.get("/api/produtos/", {"situacao": "desativados"}).json()
    assert [produto["id"] for produto in desativados["results"]] == [parado.pk]


@pytest.mark.django_db
def test_minimo_zero_so_pede_reposicao_quando_falta(
    api_tecnico: APIClient, capa: Produto, loja: Loja
) -> None:
    capa.corrigir_contagem(loja=loja, contada=0)
    assert api_tecnico.get("/api/produtos/", {"situacao": "repor"}).json()["count"] == 0

    MovimentoDeEstoque.objects.create(
        tenant=capa.tenant, produto=capa, loja=loja, tipo=TipoDeMovimento.AJUSTE, quantidade=-1
    )
    assert api_tecnico.get("/api/produtos/", {"situacao": "repor"}).json()["count"] == 1


@pytest.mark.django_db
def test_produto_de_outra_assistencia_nao_aparece(
    api_intruso: APIClient, api_tecnico_intruso: APIClient, tela: Produto
) -> None:
    assert api_intruso.get("/api/produtos/").json()["count"] == 0
    assert api_intruso.get(f"/api/produtos/{tela.pk}/").status_code == 404
    alteracao = api_tecnico_intruso.patch(
        f"/api/produtos/{tela.pk}/", {"preco": "1.00"}, format="json"
    )
    assert alteracao.status_code == 404


@pytest.mark.django_db
def test_estoque_exige_autenticacao(tela: Produto) -> None:
    assert APIClient().get("/api/produtos/").status_code == 401
