from decimal import Decimal
from typing import Any

import pytest
from rest_framework.test import APIClient

from bancada.estoque.models import MovimentoDeEstoque, Produto, TipoDeMovimento
from bancada.ordens import publico
from bancada.ordens.estados import StatusOS, TransicaoInvalida
from bancada.ordens.models import ItemOrcamento, OrdemServico
from bancada.tenants.models import Loja, Tenant, Usuario

ATE_O_ORCAMENTO = [StatusOS.EM_DIAGNOSTICO, StatusOS.ORCAMENTO_ENVIADO]
DA_APROVACAO_AO_PRONTO = [StatusOS.APROVADO, StatusOS.EM_REPARO, StatusOS.PRONTO]


def adicionar(api: APIClient, ordem: OrdemServico, **dados: Any) -> Any:
    return api.post(f"/api/ordens/{ordem.pk}/itens/", dados, format="json")


def transicionar(api: APIClient, ordem: OrdemServico, status: str, **dados: Any) -> Any:
    return api.post(
        f"/api/ordens/{ordem.pk}/transicionar/", {"status": status, **dados}, format="json"
    )


def detalhe(api: APIClient, ordem: OrdemServico) -> dict[str, Any]:
    resposta = api.get(f"/api/ordens/{ordem.pk}/")
    assert resposta.status_code == 200
    return resposta.json()


@pytest.fixture
def em_diagnostico(ordem: OrdemServico) -> OrdemServico:
    ordem.transicionar(StatusOS.EM_DIAGNOSTICO)
    return ordem


@pytest.mark.django_db
def test_peca_do_estoque_entra_com_nome_e_preco_do_produto(
    api_tecnico: APIClient, em_diagnostico: OrdemServico, tela: Produto
) -> None:
    resposta = adicionar(api_tecnico, em_diagnostico, produto=tela.pk)

    assert resposta.status_code == 201
    item = resposta.json()
    assert item["tipo"] == "peca"
    assert item["descricao"] == "Tela Moto G54"
    assert item["valor"] == "320.00"
    assert item["produto"] == tela.pk
    assert item["custo"] is None
    assert item["custo_do_item"] == "180.00"


@pytest.mark.django_db
def test_equipe_muda_o_nome_e_o_preco_da_peca_no_orcamento(
    api_atendente: APIClient, em_diagnostico: OrdemServico, tela: Produto
) -> None:
    resposta = adicionar(
        api_atendente,
        em_diagnostico,
        produto=tela.pk,
        tipo="servico",
        descricao="Tela original com moldura",
        valor="350.00",
        custo="1.00",
    )

    item = resposta.json()
    assert item["tipo"] == "peca"
    assert item["descricao"] == "Tela original com moldura"
    assert item["valor"] == "350.00"
    assert item["custo"] is None


@pytest.mark.django_db
def test_produto_desativado_ou_de_outra_assistencia_nao_entra_no_orcamento(
    api_tecnico: APIClient, em_diagnostico: OrdemServico, tela: Produto, outro_tenant: Tenant
) -> None:
    alheio = Produto.objects.create(tenant=outro_tenant, nome="Tela alheia", preco="10")
    de_fora = adicionar(api_tecnico, em_diagnostico, produto=alheio.pk)
    assert de_fora.status_code == 400
    assert "produto" in de_fora.json()

    tela.ativo = False
    tela.save()
    desativado = adicionar(api_tecnico, em_diagnostico, produto=tela.pk)
    assert desativado.json()["produto"] == ["Este produto foi desativado no estoque."]


@pytest.mark.django_db
def test_item_digitado_continua_pedindo_descricao_e_valor(
    api_tecnico: APIClient, em_diagnostico: OrdemServico
) -> None:
    sem_descricao = adicionar(api_tecnico, em_diagnostico, descricao="  ", valor="10")
    assert sem_descricao.json()["descricao"] == ["Descreva a peça ou o serviço."]

    sem_valor = adicionar(api_tecnico, em_diagnostico, descricao="Mão de obra")
    assert sem_valor.json()["valor"] == ["Informe o valor."]

    com_custo = adicionar(
        api_tecnico, em_diagnostico, descricao="Tela comprada na hora", valor="300", custo="190"
    )
    assert com_custo.status_code == 201
    assert com_custo.json()["custo_do_item"] == "190.00"


@pytest.mark.django_db
def test_aprovacao_tira_do_estoque_so_as_pecas_aprovadas_na_loja_da_ordem(
    api_tecnico: APIClient,
    tecnico: Usuario,
    em_diagnostico: OrdemServico,
    tela: Produto,
    capa: Produto,
    loja: Loja,
) -> None:
    adicionar(api_tecnico, em_diagnostico, produto=tela.pk)
    recusada = adicionar(api_tecnico, em_diagnostico, produto=capa.pk).json()
    mao_de_obra = adicionar(
        api_tecnico, em_diagnostico, tipo="servico", descricao="Mão de obra", valor="90"
    ).json()
    transicionar(api_tecnico, em_diagnostico, StatusOS.ORCAMENTO_ENVIADO)

    aprovados = [item.pk for item in em_diagnostico.itens.all() if item.pk != recusada["id"]]
    resposta = transicionar(
        api_tecnico, em_diagnostico, StatusOS.APROVADO, itens_aprovados=aprovados
    )

    assert resposta.status_code == 200
    assert mao_de_obra["id"] in aprovados
    assert tela.quantidade_na_loja(loja) == 2
    assert capa.quantidade_na_loja(loja) == 10
    baixa = MovimentoDeEstoque.objects.get(tipo=TipoDeMovimento.ORDEM)
    assert (baixa.produto, baixa.quantidade, baixa.ordem, baixa.usuario) == (
        tela,
        -1,
        em_diagnostico,
        tecnico,
    )


@pytest.mark.django_db
def test_peca_sem_estoque_deixa_o_estoque_negativo_e_pede_reposicao(
    api_tecnico: APIClient, em_diagnostico: OrdemServico, tela: Produto, loja: Loja
) -> None:
    tela.corrigir_contagem(loja=loja, contada=0)
    adicionar(api_tecnico, em_diagnostico, produto=tela.pk)
    for status in [StatusOS.ORCAMENTO_ENVIADO, StatusOS.APROVADO]:
        transicionar(api_tecnico, em_diagnostico, status)

    produto = api_tecnico.get(f"/api/produtos/{tela.pk}/").json()
    assert produto["quantidade"] == -1
    assert produto["para_repor"] is True


@pytest.mark.django_db
def test_segunda_aprovacao_e_recusada_e_nao_tira_a_peca_de_novo(
    api_tecnico: APIClient, em_diagnostico: OrdemServico, tela: Produto, loja: Loja
) -> None:
    adicionar(api_tecnico, em_diagnostico, produto=tela.pk)
    transicionar(api_tecnico, em_diagnostico, StatusOS.ORCAMENTO_ENVIADO)
    transicionar(api_tecnico, em_diagnostico, StatusOS.APROVADO)

    de_novo = transicionar(api_tecnico, em_diagnostico, StatusOS.APROVADO)

    assert de_novo.status_code == 409
    assert tela.quantidade_na_loja(loja) == 2


@pytest.mark.django_db
def test_mudanca_de_etapa_le_a_etapa_gravada_e_nao_a_da_memoria(
    em_diagnostico: OrdemServico, tela: Produto, loja: Loja
) -> None:
    ItemOrcamento.objects.create(
        ordem=em_diagnostico, produto=tela, descricao="Tela", valor="320.00"
    )
    em_diagnostico.transicionar(StatusOS.ORCAMENTO_ENVIADO)
    atrasada = OrdemServico.objects.get(pk=em_diagnostico.pk)
    em_diagnostico.transicionar(StatusOS.APROVADO)

    with pytest.raises(TransicaoInvalida):
        atrasada.transicionar(StatusOS.APROVADO)
    assert tela.quantidade_na_loja(loja) == 2


@pytest.mark.django_db
def test_lucro_previsto_usa_o_custo_atual_e_a_entrega_guarda_o_custo(
    api_dono: APIClient, em_diagnostico: OrdemServico, tela: Produto, loja: Loja
) -> None:
    adicionar(api_dono, em_diagnostico, produto=tela.pk)
    adicionar(api_dono, em_diagnostico, tipo="servico", descricao="Mão de obra", valor="90")

    antes = detalhe(api_dono, em_diagnostico)
    assert (antes["custo_dos_itens"], antes["lucro"], antes["pecas_sem_custo"]) == (
        "180.00",
        "230.00",
        0,
    )

    for status in [StatusOS.ORCAMENTO_ENVIADO, *DA_APROVACAO_AO_PRONTO]:
        transicionar(api_dono, em_diagnostico, status)
    tela.registrar_entrada(loja=loja, quantidade=1, custo_unitario=Decimal("240.00"))
    tela.refresh_from_db()
    assert tela.custo == Decimal("200.00")

    transicionar(
        api_dono,
        em_diagnostico,
        StatusOS.ENTREGUE,
        cobranca={"valor_cobrado": "400.00", "pagamentos": [{"forma": "pix", "valor": "400"}]},
    )
    tela.registrar_entrada(loja=loja, quantidade=1, custo_unitario=Decimal("400.00"))

    depois = detalhe(api_dono, em_diagnostico)
    assert (depois["custo_dos_itens"], depois["lucro"]) == ("200.00", "200.00")
    item = next(item for item in depois["itens"] if item["produto"] == tela.pk)
    assert item["custo"] == "200.00"


@pytest.mark.django_db
def test_peca_digitada_sem_custo_e_contada_a_parte(
    api_tecnico: APIClient, em_diagnostico: OrdemServico
) -> None:
    adicionar(api_tecnico, em_diagnostico, descricao="Tela comprada na hora", valor="300")
    adicionar(api_tecnico, em_diagnostico, tipo="servico", descricao="Mão de obra", valor="90")

    corpo = detalhe(api_tecnico, em_diagnostico)

    assert (corpo["custo_dos_itens"], corpo["lucro"], corpo["pecas_sem_custo"]) == (
        "0.00",
        "390.00",
        1,
    )


@pytest.mark.django_db
def test_custo_e_lucro_nao_aparecem_para_o_cliente(
    api_tecnico: APIClient, em_diagnostico: OrdemServico, tela: Produto
) -> None:
    adicionar(api_tecnico, em_diagnostico, produto=tela.pk)
    transicionar(api_tecnico, em_diagnostico, StatusOS.ORCAMENTO_ENVIADO)

    pagina = APIClient().get(f"/api/publico/os/{em_diagnostico.token_publico}/")

    assert pagina.status_code == 200
    texto = pagina.content.decode()
    assert "custo" not in texto
    assert "lucro" not in texto
    assert "180.00" not in texto
    assert publico.orcamento_para_o_cliente(em_diagnostico)["itens"] == [
        {"descricao": "Tela Moto G54", "valor": "320.00"}
    ]
