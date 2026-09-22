import pytest
from rest_framework.test import APIClient

from bancada.ordens.models import OrdemServico


@pytest.mark.django_db
def test_lista_traz_apenas_ordens_da_propria_assistencia(
    api_tecnico: APIClient, api_intruso: APIClient, ordem: OrdemServico
) -> None:
    minha = api_tecnico.get("/api/ordens/")
    alheia = api_intruso.get("/api/ordens/")

    assert minha.json()["count"] == 1
    assert alheia.json()["count"] == 0


@pytest.mark.django_db
def test_detalhe_de_ordem_de_outra_assistencia_da_404(
    api_intruso: APIClient, ordem: OrdemServico
) -> None:
    resposta = api_intruso.get(f"/api/ordens/{ordem.pk}/")

    assert resposta.status_code == 404


@pytest.mark.django_db
def test_transicionar_ordem_de_outra_assistencia_da_404(
    api_intruso: APIClient, ordem: OrdemServico
) -> None:
    resposta = api_intruso.post(
        f"/api/ordens/{ordem.pk}/transicionar/",
        {"status": "em_diagnostico"},
        format="json",
    )

    assert resposta.status_code == 404
    ordem.refresh_from_db()
    assert ordem.status == "recebido"


@pytest.mark.django_db
def test_sem_autenticacao_recebe_401(ordem: OrdemServico) -> None:
    assert APIClient().get("/api/ordens/").status_code == 401
