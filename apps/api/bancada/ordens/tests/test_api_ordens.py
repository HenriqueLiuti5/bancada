import pytest
from rest_framework.test import APIClient

from bancada.clientes.models import Aparelho, Cliente
from bancada.ordens.estados import StatusOS
from bancada.ordens.models import OrdemServico
from bancada.tenants.models import Loja


@pytest.mark.django_db
def test_abrir_ordem_pela_api(
    api_tecnico: APIClient, loja: Loja, cliente: Cliente, aparelho: Aparelho
) -> None:
    resposta = api_tecnico.post(
        "/api/ordens/",
        {
            "loja": loja.pk,
            "cliente": cliente.pk,
            "aparelho": aparelho.pk,
            "problema_relatado": "Não liga",
        },
        format="json",
    )

    assert resposta.status_code == 201
    corpo = resposta.json()
    assert corpo["numero"] == 1
    assert corpo["status"] == StatusOS.RECEBIDO
    assert len(corpo["eventos"]) == 1


@pytest.mark.django_db
def test_nao_abre_ordem_com_aparelho_de_outro_cliente(
    api_tecnico: APIClient, loja: Loja, cliente: Cliente, aparelho: Aparelho
) -> None:
    outro = Cliente.objects.create(tenant=cliente.tenant, nome="Outro", telefone="11977776666")

    resposta = api_tecnico.post(
        "/api/ordens/",
        {
            "loja": loja.pk,
            "cliente": outro.pk,
            "aparelho": aparelho.pk,
            "problema_relatado": "Não liga",
        },
        format="json",
    )

    assert resposta.status_code == 400
    assert "aparelho" in resposta.json()


@pytest.mark.django_db
def test_transicao_valida_pela_api(api_tecnico: APIClient, ordem: OrdemServico) -> None:
    resposta = api_tecnico.post(
        f"/api/ordens/{ordem.pk}/transicionar/",
        {"status": StatusOS.EM_DIAGNOSTICO, "nota": "Bancada 2"},
        format="json",
    )

    assert resposta.status_code == 200
    assert resposta.json()["status"] == StatusOS.EM_DIAGNOSTICO
    assert len(resposta.json()["eventos"]) == 2


@pytest.mark.django_db
def test_transicao_invalida_pela_api_retorna_409(
    api_tecnico: APIClient, ordem: OrdemServico
) -> None:
    resposta = api_tecnico.post(
        f"/api/ordens/{ordem.pk}/transicionar/",
        {"status": StatusOS.ENTREGUE},
        format="json",
    )

    assert resposta.status_code == 409
    ordem.refresh_from_db()
    assert ordem.status == StatusOS.RECEBIDO


@pytest.mark.django_db
def test_detalhe_lista_as_proximas_transicoes(api_tecnico: APIClient, ordem: OrdemServico) -> None:
    corpo = api_tecnico.get(f"/api/ordens/{ordem.pk}/").json()

    assert [t["valor"] for t in corpo["transicoes_possiveis"]] == [StatusOS.EM_DIAGNOSTICO]
