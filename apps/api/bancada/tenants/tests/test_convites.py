from datetime import timedelta
from typing import Any

import pytest
from django.core import mail
from django.utils import timezone
from pytest_django import DjangoCaptureOnCommitCallbacks
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from bancada.auditoria.models import Acao, RegistroDeAuditoria
from bancada.core.rls import aplicar_tenant
from bancada.tenants.models import Convite, Papel, Tenant, Usuario


def autenticar(usuario: Usuario) -> APIClient:
    cliente_api = APIClient()
    token, _ = Token.objects.get_or_create(user=usuario)
    cliente_api.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    return cliente_api


@pytest.fixture
def dono(tenant: Tenant) -> Usuario:
    return Usuario.objects.create_user(
        username="marcos",
        email="marcos@central.test",
        first_name="Marcos",
        password="senha-de-teste",
        tenant=tenant,
        papel=Papel.DONO,
    )


@pytest.fixture
def api_dono(dono: Usuario) -> APIClient:
    return autenticar(dono)


@pytest.fixture
def convite(tenant: Tenant, dono: Usuario) -> Convite:
    return Convite.objects.create(
        tenant=tenant, criado_por=dono, nome="Paulo Reis", papel=Papel.TECNICO
    )


def aceitar(token: str, **dados: Any) -> Any:
    corpo = {"nome": "Paulo Reis", "email": "paulo@central.test", "senha": "bancada-2026-forte"}
    return APIClient().post(
        f"/api/publico/convites/{token}/aceitar/", {**corpo, **dados}, format="json"
    )


@pytest.mark.django_db
def test_dono_cria_convite_so_com_nome_e_papel(api_dono: APIClient, tenant: Tenant) -> None:
    resposta = api_dono.post(
        "/api/convites/", {"nome": "Paulo Reis", "papel": Papel.TECNICO}, format="json"
    )

    assert resposta.status_code == 201
    corpo = resposta.json()
    assert corpo["papel_rotulo"] == "Técnico"
    assert corpo["link"].endswith(f"/convite/{Convite.objects.get().token}")
    assert Convite.objects.get().tenant == tenant
    assert RegistroDeAuditoria.objects.filter(acao=Acao.CONVITE_CRIADO).exists()


@pytest.mark.django_db
def test_convite_com_email_vai_pelo_correio(
    api_dono: APIClient, django_capture_on_commit_callbacks: DjangoCaptureOnCommitCallbacks
) -> None:
    with django_capture_on_commit_callbacks(execute=True):
        api_dono.post(
            "/api/convites/",
            {"nome": "Paulo Reis", "papel": Papel.TECNICO, "email": "paulo@central.test"},
            format="json",
        )

    assert len(mail.outbox) == 1
    assert mail.outbox[0].to == ["paulo@central.test"]
    assert "Marcos chamou você" in str(mail.outbox[0].body)
    assert f"/convite/{Convite.objects.get().token}" in str(mail.outbox[0].body)


@pytest.mark.django_db
def test_email_do_convite_nao_escapa_caracteres_como_html(
    api_dono: APIClient,
    tenant: Tenant,
    django_capture_on_commit_callbacks: DjangoCaptureOnCommitCallbacks,
) -> None:
    tenant.nome = "Cell & Cia D'Ávila"
    tenant.save(update_fields=["nome"])

    with django_capture_on_commit_callbacks(execute=True):
        api_dono.post(
            "/api/convites/",
            {"nome": "Paulo Reis", "papel": Papel.TECNICO, "email": "paulo@central.test"},
            format="json",
        )

    corpo = str(mail.outbox[0].body)
    assert "Cell & Cia D'Ávila" in corpo
    assert "&amp;" not in corpo
    assert "&#x27;" not in corpo


@pytest.mark.django_db
def test_convite_para_email_que_ja_tem_conta_e_recusado(
    api_dono: APIClient, tecnico: Usuario
) -> None:
    resposta = api_dono.post(
        "/api/convites/",
        {"nome": "Joana", "papel": Papel.TECNICO, "email": "joana@central.test"},
        format="json",
    )

    assert resposta.status_code == 400
    assert "email" in resposta.json()


@pytest.mark.django_db
def test_so_o_dono_convida(api_tecnico: APIClient) -> None:
    resposta = api_tecnico.post(
        "/api/convites/", {"nome": "Paulo", "papel": Papel.DONO}, format="json"
    )

    assert resposta.status_code == 403
    assert not Convite.objects.exists()


@pytest.mark.django_db
def test_dono_ve_so_os_convites_pendentes_da_propria_assistencia(
    api_dono: APIClient, convite: Convite, outro_tenant: Tenant
) -> None:
    Convite.objects.create(tenant=outro_tenant, nome="De fora", papel=Papel.TECNICO)
    Convite.objects.create(
        tenant=convite.tenant, nome="Já entrou", papel=Papel.TECNICO, aceito_em=timezone.now()
    )

    nomes = [item["nome"] for item in api_dono.get("/api/convites/").json()]

    assert nomes == ["Paulo Reis"]


@pytest.mark.django_db
def test_dono_cancela_um_convite(api_dono: APIClient, convite: Convite) -> None:
    assert api_dono.delete(f"/api/convites/{convite.pk}/").status_code == 204

    assert not Convite.objects.exists()
    assert RegistroDeAuditoria.objects.filter(acao=Acao.CONVITE_CANCELADO).exists()
    assert aceitar(convite.token).status_code == 404


@pytest.mark.django_db
def test_link_do_convite_mostra_assistencia_e_papel(convite: Convite) -> None:
    resposta = APIClient().get(f"/api/publico/convites/{convite.token}/")

    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["assistencia"] == "Assistência Central"
    assert corpo["nome"] == "Paulo Reis"
    assert corpo["papel_rotulo"] == "Técnico"


@pytest.mark.django_db
def test_aceitar_o_convite_cria_a_conta_e_abre_a_sessao(convite: Convite, tenant: Tenant) -> None:
    resposta = aceitar(convite.token, email="Paulo@Central.test")

    assert resposta.status_code == 201
    novo = Usuario.objects.get(email="paulo@central.test")
    assert novo.tenant == tenant
    assert novo.papel == Papel.TECNICO
    assert novo.check_password("bancada-2026-forte")
    assert not novo.is_staff

    convite.refresh_from_db()
    assert convite.aceito
    assert convite.usuario == novo

    cliente_api = APIClient()
    cliente_api.credentials(HTTP_AUTHORIZATION=f"Token {resposta.json()['token']}")
    assert cliente_api.get("/api/ordens/").status_code == 200


@pytest.mark.django_db
def test_quem_aceita_entra_depois_pelo_email(convite: Convite) -> None:
    aceitar(convite.token)

    resposta = APIClient().post(
        "/api/auth/login/",
        {"email": "paulo@central.test", "password": "bancada-2026-forte"},
        format="json",
    )

    assert resposta.status_code == 200


@pytest.mark.django_db
def test_convite_so_pode_ser_usado_uma_vez(convite: Convite) -> None:
    assert aceitar(convite.token).status_code == 201

    segunda = aceitar(convite.token, email="outro@central.test")

    assert segunda.status_code == 404
    assert "já foi usado" in segunda.json()["detail"]
    assert not Usuario.objects.filter(email="outro@central.test").exists()


@pytest.mark.django_db
def test_convite_expirado_nao_serve(convite: Convite) -> None:
    convite.expira_em = timezone.now() - timedelta(minutes=1)
    convite.save(update_fields=["expira_em"])

    resposta = aceitar(convite.token)

    assert resposta.status_code == 404
    assert "expirou" in resposta.json()["detail"]
    assert not Usuario.objects.filter(email="paulo@central.test").exists()


@pytest.mark.django_db
def test_token_inventado_nao_encontra_nada(convite: Convite) -> None:
    assert APIClient().get("/api/publico/convites/inventado/").status_code == 404


@pytest.mark.django_db
def test_aceite_com_email_ja_usado_e_recusado(convite: Convite, tecnico: Usuario) -> None:
    resposta = aceitar(convite.token, email="joana@central.test")

    assert resposta.status_code == 400
    convite.refresh_from_db()
    assert not convite.aceito


@pytest.mark.django_db
def test_email_do_convite_fica_confirmado_quando_e_o_mesmo(tenant: Tenant, dono: Usuario) -> None:
    convite = Convite.objects.create(
        tenant=tenant, nome="Paulo", papel=Papel.ATENDENTE, email="paulo@central.test"
    )

    aceitar(convite.token)

    assert Usuario.objects.get(email="paulo@central.test").email_confirmado


@pytest.mark.django_db
def test_email_diferente_do_convite_precisa_de_confirmacao(
    convite: Convite, django_capture_on_commit_callbacks: DjangoCaptureOnCommitCallbacks
) -> None:
    with django_capture_on_commit_callbacks(execute=True):
        aceitar(convite.token)

    assert not Usuario.objects.get(email="paulo@central.test").email_confirmado
    assert "/confirmar-email/" in str(mail.outbox[0].body)


@pytest.mark.django_db
def test_aceite_fica_na_auditoria_da_assistencia(convite: Convite) -> None:
    aceitar(convite.token)

    registro = RegistroDeAuditoria.objects.get(acao=Acao.USUARIO_CRIADO)
    assert registro.tenant == convite.tenant
    assert "paulo@central.test" in registro.detalhe


@pytest.mark.django_db
def test_convites_de_outra_assistencia_ficam_invisiveis_no_banco(
    convite: Convite, outro_tenant: Tenant
) -> None:
    aplicar_tenant(outro_tenant.pk)

    assert not Convite.objects.exists()
