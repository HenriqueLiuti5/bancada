import pytest
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from bancada.clientes.models import Aparelho
from bancada.tenants.models import Papel, Tenant, Usuario


@pytest.mark.django_db
def test_senha_nunca_aparece_na_listagem(api_tecnico: APIClient, aparelho: Aparelho) -> None:
    corpo = api_tecnico.get("/api/aparelhos/").json()

    assert "senha_desbloqueio" not in corpo["results"][0]


@pytest.mark.django_db
def test_tecnico_consegue_revelar_a_senha(api_tecnico: APIClient, aparelho: Aparelho) -> None:
    resposta = api_tecnico.get(f"/api/aparelhos/{aparelho.pk}/senha/")

    assert resposta.status_code == 200
    assert resposta.json()["senha_desbloqueio"] == "1234"


@pytest.mark.django_db
def test_atendente_nao_consegue_revelar_a_senha(tenant: Tenant, aparelho: Aparelho) -> None:
    atendente = Usuario.objects.create_user(
        username="carlos", password="x", tenant=tenant, papel=Papel.ATENDENTE
    )
    token, _ = Token.objects.get_or_create(user=atendente)
    cliente_api = APIClient()
    cliente_api.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

    resposta = cliente_api.get(f"/api/aparelhos/{aparelho.pk}/senha/")

    assert resposta.status_code == 403
