from decimal import Decimal
from typing import Any

import pytest
from django.core.cache import cache
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from bancada.ordens.estados import StatusOS
from bancada.ordens.models import ItemOrcamento, OrdemServico
from bancada.tenants.models import Usuario


def api_de(usuario: Usuario) -> APIClient:
    cliente_api = APIClient()
    token, _ = Token.objects.get_or_create(user=usuario)
    cliente_api.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    return cliente_api


def adicionar(api: APIClient, ordem: OrdemServico, **item: Any) -> Any:
    return api.post(f"/api/ordens/{ordem.pk}/itens/", item, format="json")


def transicionar(api: APIClient, ordem: OrdemServico, status: str, **extras: Any) -> Any:
    return api.post(
        f"/api/ordens/{ordem.pk}/transicionar/", {"status": status, **extras}, format="json"
    )


def item(ordem: OrdemServico, descricao: str, valor: str) -> ItemOrcamento:
    return ItemOrcamento.objects.create(ordem=ordem, descricao=descricao, valor=valor)


def enviar(ordem: OrdemServico) -> None:
    ordem.transicionar(StatusOS.EM_DIAGNOSTICO)
    ordem.transicionar(StatusOS.ORCAMENTO_ENVIADO)


@pytest.mark.django_db
def test_tecnico_monta_o_orcamento_na_ordem(api_tecnico: APIClient, ordem: OrdemServico) -> None:
    ordem.transicionar(StatusOS.EM_DIAGNOSTICO)

    tela = adicionar(api_tecnico, ordem, tipo="peca", descricao="Tela", valor="300.00")
    mao_de_obra = adicionar(
        api_tecnico, ordem, tipo="servico", descricao="Mão de obra", valor="80.50"
    )

    assert tela.status_code == 201
    assert mao_de_obra.status_code == 201
    assert tela.json()["aprovado"] is False

    detalhe = api_tecnico.get(f"/api/ordens/{ordem.pk}/").json()
    assert [linha["descricao"] for linha in detalhe["itens"]] == ["Tela", "Mão de obra"]
    assert detalhe["total_orcamento"] == "380.50"
    assert detalhe["orcamento_editavel"] is True


@pytest.mark.django_db
def test_atendente_tambem_monta_o_orcamento(
    atendente_do_tenant: Usuario, ordem: OrdemServico
) -> None:
    resposta = adicionar(api_de(atendente_do_tenant), ordem, descricao="Película", valor="30.00")

    assert resposta.status_code == 201


@pytest.mark.django_db
def test_item_pode_custar_zero_mas_nao_menos(api_tecnico: APIClient, ordem: OrdemServico) -> None:
    garantia = adicionar(api_tecnico, ordem, descricao="Reparo na garantia", valor="0")
    negativo = adicionar(api_tecnico, ordem, descricao="Desconto", valor="-10")

    assert garantia.status_code == 201
    assert negativo.status_code == 400
    assert negativo.json()["valor"] == ["O valor não pode ser negativo."]


@pytest.mark.django_db
def test_item_sem_descricao_e_recusado(api_tecnico: APIClient, ordem: OrdemServico) -> None:
    resposta = adicionar(api_tecnico, ordem, descricao="   ", valor="10.00")

    assert resposta.status_code == 400
    assert "descricao" in resposta.json()


@pytest.mark.django_db
def test_aprovado_nao_vem_de_quem_cria_o_item(api_tecnico: APIClient, ordem: OrdemServico) -> None:
    resposta = adicionar(api_tecnico, ordem, descricao="Tela", valor="300.00", aprovado=True)

    assert resposta.status_code == 201
    assert ItemOrcamento.objects.get().aprovado is False


@pytest.mark.django_db
def test_tecnico_apaga_item_antes_de_enviar(api_tecnico: APIClient, ordem: OrdemServico) -> None:
    rascunho = item(ordem, "Capa", "40.00")

    resposta = api_tecnico.delete(f"/api/itens/{rascunho.pk}/")

    assert resposta.status_code == 204
    assert not ordem.itens.exists()


@pytest.mark.django_db
def test_orcamento_enviado_fica_travado(api_tecnico: APIClient, ordem: OrdemServico) -> None:
    enviado = item(ordem, "Tela", "300.00")
    enviar(ordem)

    novo = adicionar(api_tecnico, ordem, descricao="Bateria", valor="120.00")
    apagado = api_tecnico.delete(f"/api/itens/{enviado.pk}/")

    assert novo.status_code == 409
    assert apagado.status_code == 409
    assert list(ordem.itens.values_list("descricao", flat=True)) == ["Tela"]


@pytest.mark.django_db
def test_item_de_outra_assistencia_nao_se_alcanca(
    api_tecnico_intruso: APIClient, ordem: OrdemServico
) -> None:
    alheio = item(ordem, "Tela", "300.00")

    assert adicionar(api_tecnico_intruso, ordem, descricao="X", valor="1").status_code == 404
    assert api_tecnico_intruso.delete(f"/api/itens/{alheio.pk}/").status_code == 404
    assert ordem.itens.count() == 1


@pytest.mark.django_db
def test_item_nao_se_edita_pela_api(api_tecnico: APIClient, ordem: OrdemServico) -> None:
    existente = item(ordem, "Tela", "300.00")

    resposta = api_tecnico.patch(f"/api/itens/{existente.pk}/", {"valor": "1.00"}, format="json")

    assert resposta.status_code == 405


@pytest.mark.django_db
def test_nao_se_envia_orcamento_vazio(api_tecnico: APIClient, ordem: OrdemServico) -> None:
    ordem.transicionar(StatusOS.EM_DIAGNOSTICO)

    resposta = transicionar(api_tecnico, ordem, StatusOS.ORCAMENTO_ENVIADO)

    assert resposta.status_code == 400
    assert "Adicione ao menos um item" in resposta.json()["status"][0]
    ordem.refresh_from_db()
    assert ordem.status == StatusOS.EM_DIAGNOSTICO


@pytest.mark.django_db
def test_aprovar_sem_escolher_aprova_tudo(api_tecnico: APIClient, ordem: OrdemServico) -> None:
    item(ordem, "Tela", "300.00")
    item(ordem, "Mão de obra", "80.00")
    enviar(ordem)

    resposta = transicionar(api_tecnico, ordem, StatusOS.APROVADO)

    assert resposta.status_code == 200
    assert resposta.json()["total_aprovado"] == "380.00"
    assert resposta.json()["orcamento_aprovado"] is True
    assert all(ordem.itens.values_list("aprovado", flat=True))


@pytest.mark.django_db
def test_cliente_aprova_so_parte_do_orcamento(api_tecnico: APIClient, ordem: OrdemServico) -> None:
    tela = item(ordem, "Tela", "300.00")
    item(ordem, "Bateria", "120.00")
    enviar(ordem)

    resposta = transicionar(api_tecnico, ordem, StatusOS.APROVADO, itens_aprovados=[tela.pk])

    assert resposta.status_code == 200
    assert list(ordem.itens.filter(aprovado=True).values_list("descricao", flat=True)) == ["Tela"]
    ordem.refresh_from_db()
    assert ordem.total_aprovado == Decimal("300.00")
    assert ordem.total_orcamento == Decimal("420.00")


@pytest.mark.django_db
def test_aprovar_sem_nenhum_item_marcado_e_recusado(
    api_tecnico: APIClient, ordem: OrdemServico
) -> None:
    item(ordem, "Tela", "300.00")
    enviar(ordem)

    resposta = transicionar(api_tecnico, ordem, StatusOS.APROVADO, itens_aprovados=[])

    assert resposta.status_code == 400
    assert "use Reprovado" in resposta.json()["itens_aprovados"][0]
    ordem.refresh_from_db()
    assert ordem.status == StatusOS.ORCAMENTO_ENVIADO


@pytest.mark.django_db
def test_nao_se_aprova_item_de_outra_ordem(api_tecnico: APIClient, ordem: OrdemServico) -> None:
    item(ordem, "Tela", "300.00")
    enviar(ordem)
    outra = OrdemServico.abrir(
        tenant=ordem.tenant,
        loja=ordem.loja,
        cliente=ordem.cliente,
        aparelho=ordem.aparelho,
        problema_relatado="Outro defeito",
    )
    de_fora = item(outra, "Conector", "90.00")

    resposta = transicionar(api_tecnico, ordem, StatusOS.APROVADO, itens_aprovados=[de_fora.pk])

    assert resposta.status_code == 400
    de_fora.refresh_from_db()
    assert de_fora.aprovado is False


@pytest.mark.django_db
def test_cliente_ve_so_o_que_aprovou_depois_da_aprovacao(ordem: OrdemServico) -> None:
    tela = item(ordem, "Tela", "300.00")
    item(ordem, "Bateria", "120.00")
    enviar(ordem)
    cache.clear()

    proposta = APIClient().get(f"/api/publico/os/{ordem.token_publico}/").json()["orcamento"]
    ordem.transicionar(StatusOS.APROVADO, itens_aprovados=[tela.pk])
    aprovado = APIClient().get(f"/api/publico/os/{ordem.token_publico}/").json()["orcamento"]

    assert proposta["total"] == "420.00"
    assert proposta["aprovado"] is False
    assert aprovado["total"] == "300.00"
    assert aprovado["aprovado"] is True
    assert [linha["descricao"] for linha in aprovado["itens"]] == ["Tela"]


@pytest.mark.django_db
def test_apagar_item_atualiza_a_pagina_publica(ordem: OrdemServico) -> None:
    rascunho = item(ordem, "Capa", "40.00")
    item(ordem, "Tela", "300.00")
    ordem.transicionar(StatusOS.EM_DIAGNOSTICO)
    ordem.transicionar(StatusOS.ORCAMENTO_ENVIADO)
    APIClient().get(f"/api/publico/os/{ordem.token_publico}/")

    rascunho.delete()
    depois = APIClient().get(f"/api/publico/os/{ordem.token_publico}/").json()

    assert depois["orcamento"]["total"] == "300.00"
