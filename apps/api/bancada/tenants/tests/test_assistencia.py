import pytest
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from bancada.auditoria.models import Acao, RegistroDeAuditoria
from bancada.tenants.models import Loja, Papel, Tenant, Usuario


@pytest.fixture
def api_dono(tenant: Tenant) -> APIClient:
    dono = Usuario.objects.create_user(
        username="marcos",
        email="marcos@central.test",
        password="senha-de-teste",
        tenant=tenant,
        papel=Papel.DONO,
    )
    cliente_api = APIClient()
    token, _ = Token.objects.get_or_create(user=dono)
    cliente_api.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    return cliente_api


@pytest.mark.django_db
def test_dono_ve_os_dados_da_assistencia(api_dono: APIClient) -> None:
    resposta = api_dono.get("/api/assistencia/")

    assert resposta.status_code == 200
    assert resposta.json()["nome"] == "Assistência Central"


@pytest.mark.django_db
def test_dono_altera_nome_documento_e_whatsapp(api_dono: APIClient, tenant: Tenant) -> None:
    resposta = api_dono.patch(
        "/api/assistencia/",
        {
            "nome": "Central Celulares",
            "documento": "12.345.678/0001-90",
            "whatsapp": "11 91234-5678",
        },
        format="json",
    )

    assert resposta.status_code == 200
    tenant.refresh_from_db()
    assert tenant.nome == "Central Celulares"
    assert tenant.documento == "12.345.678/0001-90"
    assert tenant.whatsapp == "11912345678"

    registro = RegistroDeAuditoria.objects.get(acao=Acao.ASSISTENCIA_ALTERADA)
    assert "Central Celulares" in registro.detalhe


@pytest.mark.django_db
def test_salvar_sem_mudar_nada_nao_suja_a_auditoria(api_dono: APIClient) -> None:
    api_dono.patch("/api/assistencia/", {"nome": "Assistência Central"}, format="json")

    assert not RegistroDeAuditoria.objects.filter(acao=Acao.ASSISTENCIA_ALTERADA).exists()


@pytest.mark.django_db
def test_nome_em_branco_e_recusado(api_dono: APIClient) -> None:
    assert api_dono.patch("/api/assistencia/", {"nome": ""}, format="json").status_code == 400


@pytest.mark.django_db
def test_tecnico_nao_mexe_na_assistencia(api_tecnico: APIClient, tenant: Tenant) -> None:
    assert api_tecnico.get("/api/assistencia/").status_code == 403
    assert (
        api_tecnico.patch("/api/assistencia/", {"nome": "Tomada"}, format="json").status_code == 403
    )
    tenant.refresh_from_db()
    assert tenant.nome == "Assistência Central"


@pytest.mark.django_db
def test_dono_altera_endereco_e_telefone_da_loja(api_dono: APIClient, loja: Loja) -> None:
    resposta = api_dono.patch(
        f"/api/lojas/{loja.pk}/",
        {"endereco": "Rua das Flores, 100", "telefone": "(11) 3333-4444"},
        format="json",
    )

    assert resposta.status_code == 200
    loja.refresh_from_db()
    assert loja.endereco == "Rua das Flores, 100"
    assert loja.telefone == "1133334444"


@pytest.mark.django_db
def test_dono_nao_alcanca_loja_de_outra_assistencia(
    api_dono: APIClient, outro_tenant: Tenant
) -> None:
    alheia = Loja.objects.create(tenant=outro_tenant, nome="Deles")

    resposta = api_dono.patch(f"/api/lojas/{alheia.pk}/", {"nome": "Nossa"}, format="json")

    assert resposta.status_code == 404
    alheia.refresh_from_db()
    assert alheia.nome == "Deles"
