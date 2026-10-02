import pytest
from django.db import IntegrityError
from rest_framework.test import APIClient

from bancada.auditoria.models import Acao, RegistroDeAuditoria
from bancada.core.rls import aplicar_tenant
from bancada.plataforma.tests.conftest import abrir_ordem
from bancada.tenants.models import Papel, Tenant, Usuario


@pytest.mark.django_db
@pytest.mark.usefixtures("conta_da_plataforma")
def test_conta_da_plataforma_entra_pelo_login_de_sempre() -> None:
    resposta = APIClient().post(
        "/api/auth/login/",
        {"email": "Henrique@Bancada.test", "password": "senha-de-teste"},
        format="json",
    )

    assert resposta.status_code == 200
    usuario = resposta.json()["usuario"]
    assert usuario["da_plataforma"] is True
    assert usuario["tenant"] is None


@pytest.mark.django_db
def test_conta_sem_assistencia_que_nao_e_da_plataforma_continua_de_fora() -> None:
    Usuario.objects.create_user(
        username="solta@bancada.test", email="solta@bancada.test", password="senha-de-teste"
    )

    resposta = APIClient().post(
        "/api/auth/login/",
        {"email": "solta@bancada.test", "password": "senha-de-teste"},
        format="json",
    )

    assert resposta.status_code == 403


@pytest.mark.django_db
def test_conta_da_plataforma_nao_pode_pertencer_a_uma_assistencia(tenant: Tenant) -> None:
    with pytest.raises(IntegrityError):
        Usuario.objects.create_user(
            username="dupla@bancada.test",
            email="dupla@bancada.test",
            tenant=tenant,
            papel=Papel.DONO,
            da_plataforma=True,
        )


@pytest.mark.django_db
def test_sem_login_o_painel_nao_abre() -> None:
    assert APIClient().get("/api/plataforma/painel/").status_code == 401


@pytest.mark.django_db
def test_ninguem_de_assistencia_ve_o_painel_nem_lanca_custo(api_tecnico: APIClient) -> None:
    painel = api_tecnico.get("/api/plataforma/painel/")
    custo = api_tecnico.post(
        "/api/plataforma/custos/",
        {"mes": "2026-01", "descricao": "Servidor", "valor": "10.00"},
        format="json",
    )

    assert painel.status_code == 403
    assert custo.status_code == 403


@pytest.mark.django_db
def test_a_plataforma_nao_entra_nas_telas_das_assistencias(api_plataforma: APIClient) -> None:
    assert api_plataforma.get("/api/ordens/").status_code == 403
    assert api_plataforma.get("/api/clientes/").status_code == 403


@pytest.mark.django_db
def test_o_painel_ve_todas_as_assistencias_mesmo_com_uma_ja_fixada(
    api_plataforma: APIClient, tenant: Tenant, outro_tenant: Tenant
) -> None:
    abrir_ordem(tenant)
    abrir_ordem(outro_tenant)
    abrir_ordem(outro_tenant)
    aplicar_tenant(tenant.pk)

    linhas = api_plataforma.get("/api/plataforma/painel/").json()["assistencias"]

    ordens = {linha["nome"]: linha["ordens_no_total"] for linha in linhas}
    assert ordens == {tenant.nome: 1, outro_tenant.nome: 2}


@pytest.mark.django_db
def test_cada_consulta_ao_painel_fica_na_auditoria(
    api_plataforma: APIClient, conta_da_plataforma: Usuario
) -> None:
    api_plataforma.get("/api/plataforma/painel/?mes=2026-09")

    registro = RegistroDeAuditoria.objects.get(acao=Acao.PLATAFORMA_CONSULTADA)
    assert registro.tenant is None
    assert registro.usuario == conta_da_plataforma
    assert registro.detalhe == "números de 2026-09"


@pytest.mark.django_db
def test_a_auditoria_da_plataforma_nao_aparece_para_as_assistencias(
    api_plataforma: APIClient, tenant: Tenant
) -> None:
    api_plataforma.get("/api/plataforma/painel/")

    aplicar_tenant(tenant.pk)
    visto_pela_assistencia = RegistroDeAuditoria.objects.filter(
        acao=Acao.PLATAFORMA_CONSULTADA
    ).exists()
    aplicar_tenant(None)

    assert not visto_pela_assistencia
    assert RegistroDeAuditoria.objects.filter(acao=Acao.PLATAFORMA_CONSULTADA).exists()
