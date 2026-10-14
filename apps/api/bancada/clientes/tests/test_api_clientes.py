import pytest
from rest_framework.test import APIClient

from bancada.clientes.models import Aparelho, Cliente


@pytest.mark.django_db
def test_telefone_do_cliente_e_guardado_so_com_digitos(api_tecnico: APIClient) -> None:
    resposta = api_tecnico.post(
        "/api/clientes/", {"nome": "Bruna Lima", "telefone": "(21) 98765-4321"}, format="json"
    )

    assert resposta.status_code == 201
    assert Cliente.objects.get().telefone == "21987654321"


@pytest.mark.django_db
def test_cliente_criado_pela_api_e_achado_pelo_telefone(api_tecnico: APIClient) -> None:
    api_tecnico.post(
        "/api/clientes/", {"nome": "Bruna Lima", "telefone": "(21) 98765-4321"}, format="json"
    )

    resposta = api_tecnico.get("/api/clientes/", {"busca": "98765-4321"})

    assert [cliente["nome"] for cliente in resposta.json()["results"]] == ["Bruna Lima"]


@pytest.mark.django_db
def test_telefone_sem_ddd_e_recusado(api_tecnico: APIClient) -> None:
    resposta = api_tecnico.post(
        "/api/clientes/", {"nome": "Bruna Lima", "telefone": "98765-4321"}, format="json"
    )

    assert resposta.status_code == 400
    assert resposta.json()["telefone"] == ["Informe o telefone com DDD."]


@pytest.mark.django_db
def test_cliente_e_aparelho_nao_aceitam_put(api_tecnico: APIClient, aparelho: Aparelho) -> None:
    cliente = api_tecnico.put(
        f"/api/clientes/{aparelho.cliente_id}/",
        {"nome": "Outra Pessoa", "telefone": "11999990000"},
        format="json",
    )
    dispositivo = api_tecnico.put(
        f"/api/aparelhos/{aparelho.pk}/",
        {"cliente": aparelho.cliente_id, "marca": "Samsung", "modelo": "A15"},
        format="json",
    )

    assert cliente.status_code == dispositivo.status_code == 405
