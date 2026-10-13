import pytest
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from bancada.auditoria.models import Acao, RegistroDeAuditoria
from bancada.clientes.models import Aparelho, Cliente
from bancada.tenants.models import Tenant, Usuario


@pytest.fixture
def api_atendente(atendente_do_tenant: Usuario) -> APIClient:
    cliente_api = APIClient()
    token, _ = Token.objects.get_or_create(user=atendente_do_tenant)
    cliente_api.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    return cliente_api


@pytest.mark.django_db
def test_atendente_corrige_telefone_e_email_do_cliente(
    api_atendente: APIClient, cliente: Cliente
) -> None:
    resposta = api_atendente.patch(
        f"/api/clientes/{cliente.pk}/",
        {"telefone": "(21) 98765-4321", "email": "maria@exemplo.com"},
        format="json",
    )

    assert resposta.status_code == 200
    cliente.refresh_from_db()
    assert cliente.telefone == "21987654321"
    assert cliente.email == "maria@exemplo.com"


@pytest.mark.django_db
def test_correcao_com_telefone_sem_ddd_e_recusada(
    api_atendente: APIClient, cliente: Cliente
) -> None:
    resposta = api_atendente.patch(
        f"/api/clientes/{cliente.pk}/", {"telefone": "98765-4321"}, format="json"
    )

    assert resposta.status_code == 400
    assert resposta.json()["telefone"] == ["Informe o telefone com DDD."]
    cliente.refresh_from_db()
    assert cliente.telefone == "11999990000"


@pytest.mark.django_db
def test_cliente_de_outra_assistencia_nao_e_corrigido(
    api_intruso: APIClient, cliente: Cliente
) -> None:
    resposta = api_intruso.patch(f"/api/clientes/{cliente.pk}/", {"nome": "Outra"}, format="json")

    assert resposta.status_code == 404
    cliente.refresh_from_db()
    assert cliente.nome == "Maria Souza"


@pytest.mark.django_db
def test_imei_corrigido_fica_so_com_digitos(api_atendente: APIClient, aparelho: Aparelho) -> None:
    resposta = api_atendente.patch(
        f"/api/aparelhos/{aparelho.pk}/", {"imei": "35-824005-222222-0"}, format="json"
    )

    assert resposta.status_code == 200
    aparelho.refresh_from_db()
    assert aparelho.imei == "358240052222220"


@pytest.mark.django_db
def test_aparelho_nao_muda_de_cliente(
    api_tecnico: APIClient, tenant: Tenant, aparelho: Aparelho
) -> None:
    outro = Cliente.objects.create(tenant=tenant, nome="João Lima", telefone="11988887777")

    resposta = api_tecnico.patch(
        f"/api/aparelhos/{aparelho.pk}/", {"cliente": outro.pk}, format="json"
    )

    assert resposta.status_code == 400
    assert resposta.json()["cliente"] == ["O aparelho não pode mudar de cliente."]


@pytest.mark.django_db
def test_atendente_corrige_o_modelo_sem_mexer_na_senha(
    api_atendente: APIClient, aparelho: Aparelho
) -> None:
    resposta = api_atendente.patch(
        f"/api/aparelhos/{aparelho.pk}/", {"modelo": "Moto G84"}, format="json"
    )

    assert resposta.status_code == 200
    aparelho.refresh_from_db()
    assert aparelho.modelo == "Moto G84"
    assert aparelho.senha_desbloqueio == "1234"


@pytest.mark.django_db
def test_tecnico_troca_a_senha_e_a_troca_fica_registrada(
    api_tecnico: APIClient, tecnico: Usuario, aparelho: Aparelho
) -> None:
    resposta = api_tecnico.patch(
        f"/api/aparelhos/{aparelho.pk}/", {"senha_desbloqueio": "1-2-3-6-9"}, format="json"
    )

    assert resposta.status_code == 200
    aparelho.refresh_from_db()
    assert aparelho.senha_desbloqueio == "1-2-3-6-9"
    registro = RegistroDeAuditoria.objects.get(acao=Acao.SENHA_ALTERADA)
    assert registro.usuario == tecnico
    assert registro.objeto_id == aparelho.pk


@pytest.mark.django_db
def test_atendente_nao_troca_a_senha(api_atendente: APIClient, aparelho: Aparelho) -> None:
    resposta = api_atendente.patch(
        f"/api/aparelhos/{aparelho.pk}/", {"senha_desbloqueio": "0000"}, format="json"
    )

    assert resposta.status_code == 403
    assert resposta.json()["detail"] == "Só técnicos e o dono podem trocar a senha de desbloqueio."
    aparelho.refresh_from_db()
    assert aparelho.senha_desbloqueio == "1234"
    assert not RegistroDeAuditoria.objects.filter(acao=Acao.SENHA_ALTERADA).exists()


@pytest.mark.django_db
def test_salvar_a_mesma_senha_nao_registra_troca(
    api_tecnico: APIClient, aparelho: Aparelho
) -> None:
    resposta = api_tecnico.patch(
        f"/api/aparelhos/{aparelho.pk}/", {"senha_desbloqueio": "1234"}, format="json"
    )

    assert resposta.status_code == 200
    assert not RegistroDeAuditoria.objects.filter(acao=Acao.SENHA_ALTERADA).exists()
