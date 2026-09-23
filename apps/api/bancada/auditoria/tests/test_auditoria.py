import pytest
from rest_framework.test import APIClient

from bancada.auditoria.models import Acao, RegistroDeAuditoria
from bancada.clientes.models import Aparelho
from bancada.core.rls import aplicar_tenant
from bancada.tenants.models import Tenant, Usuario


@pytest.mark.django_db
def test_tecnico_ve_a_senha_e_o_acesso_fica_registrado(
    api_tecnico: APIClient, aparelho: Aparelho, tecnico: Usuario
) -> None:
    resposta = api_tecnico.get(f"/api/aparelhos/{aparelho.pk}/senha/")

    assert resposta.status_code == 200
    assert resposta.json()["senha_desbloqueio"] == "1234"

    registro = RegistroDeAuditoria.objects.get()
    assert registro.acao == Acao.SENHA_VISTA
    assert registro.usuario == tecnico
    assert registro.objeto == "aparelho"
    assert registro.objeto_id == aparelho.pk
    assert registro.detalhe == "Motorola Moto G54"


@pytest.mark.django_db
def test_tentativa_negada_tambem_fica_registrada(
    tenant: Tenant, aparelho: Aparelho, atendente_do_tenant: Usuario
) -> None:
    from rest_framework.authtoken.models import Token

    cliente_api = APIClient()
    token, _ = Token.objects.get_or_create(user=atendente_do_tenant)
    cliente_api.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

    resposta = cliente_api.get(f"/api/aparelhos/{aparelho.pk}/senha/")

    assert resposta.status_code == 403

    registro = RegistroDeAuditoria.objects.get()
    assert registro.acao == Acao.SENHA_NEGADA
    assert registro.usuario == atendente_do_tenant


@pytest.mark.django_db
def test_intruso_nem_chega_a_gerar_registro(api_intruso: APIClient, aparelho: Aparelho) -> None:
    assert api_intruso.get(f"/api/aparelhos/{aparelho.pk}/senha/").status_code == 404
    assert RegistroDeAuditoria.objects.count() == 0


@pytest.mark.django_db
def test_o_registro_guarda_a_origem_do_acesso(api_tecnico: APIClient, aparelho: Aparelho) -> None:
    api_tecnico.get(f"/api/aparelhos/{aparelho.pk}/senha/", REMOTE_ADDR="192.0.2.10")

    assert RegistroDeAuditoria.objects.get().origem == "192.0.2.10"


@pytest.mark.django_db(transaction=False)
def test_a_trava_do_banco_vale_para_a_auditoria(tenant: Tenant, tecnico: Usuario) -> None:
    RegistroDeAuditoria.objects.create(
        tenant=tenant,
        usuario=tecnico,
        acao=Acao.SENHA_VISTA,
        objeto="aparelho",
        objeto_id=1,
    )

    aplicar_tenant(-1)

    assert RegistroDeAuditoria.objects.count() == 0
