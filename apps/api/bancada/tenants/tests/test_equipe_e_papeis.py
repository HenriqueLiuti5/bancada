import pytest
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from bancada.auditoria.models import Acao, RegistroDeAuditoria
from bancada.clientes.models import Cliente
from bancada.ordens.models import OrdemServico
from bancada.tenants.models import Papel, Tenant, Usuario


def autenticar(usuario: Usuario) -> APIClient:
    cliente_api = APIClient()
    token, _ = Token.objects.get_or_create(user=usuario)
    cliente_api.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    return cliente_api


@pytest.fixture
def dono(tenant: Tenant) -> Usuario:
    return Usuario.objects.create_user(
        username="marcos", password="senha-de-teste", tenant=tenant, papel=Papel.DONO
    )


@pytest.fixture
def api_dono(dono: Usuario) -> APIClient:
    return autenticar(dono)


@pytest.mark.django_db
def test_dono_cria_um_usuario_da_equipe(api_dono: APIClient, tenant: Tenant) -> None:
    resposta = api_dono.post(
        "/api/usuarios/",
        {
            "username": "carla",
            "first_name": "Carla",
            "papel": Papel.ATENDENTE,
            "senha": "bancada-2026-forte",
        },
        format="json",
    )

    assert resposta.status_code == 201

    criada = Usuario.objects.get(username="carla")
    assert criada.tenant == tenant
    assert criada.papel == Papel.ATENDENTE
    assert criada.check_password("bancada-2026-forte")
    assert not criada.is_staff
    assert not criada.is_superuser


@pytest.mark.django_db
def test_criacao_de_usuario_fica_na_auditoria(api_dono: APIClient, dono: Usuario) -> None:
    api_dono.post(
        "/api/usuarios/",
        {"username": "carla", "papel": Papel.ATENDENTE, "senha": "bancada-2026-forte"},
        format="json",
    )

    registro = RegistroDeAuditoria.objects.get(acao=Acao.USUARIO_CRIADO)
    assert registro.usuario == dono
    assert "carla" in registro.detalhe


@pytest.mark.django_db
def test_senha_fraca_e_recusada(api_dono: APIClient) -> None:
    resposta = api_dono.post(
        "/api/usuarios/",
        {"username": "carla", "papel": Papel.ATENDENTE, "senha": "1234"},
        format="json",
    )

    assert resposta.status_code == 400
    assert "senha" in resposta.json()
    assert not Usuario.objects.filter(username="carla").exists()


@pytest.mark.django_db
def test_nome_de_usuario_repetido_e_recusado(api_dono: APIClient, tecnico: Usuario) -> None:
    resposta = api_dono.post(
        "/api/usuarios/",
        {"username": tecnico.username.upper(), "papel": Papel.TECNICO, "senha": "outra-2026-ok"},
        format="json",
    )

    assert resposta.status_code == 400
    assert "username" in resposta.json()


@pytest.mark.django_db
def test_tecnico_nao_gerencia_a_equipe(api_tecnico: APIClient) -> None:
    listagem = api_tecnico.get("/api/usuarios/")
    criacao = api_tecnico.post(
        "/api/usuarios/",
        {"username": "carla", "papel": Papel.ATENDENTE, "senha": "bancada-2026-forte"},
        format="json",
    )

    assert listagem.status_code == 403
    assert criacao.status_code == 403
    assert not Usuario.objects.filter(username="carla").exists()


@pytest.mark.django_db
def test_dono_ve_apenas_a_propria_equipe(
    api_dono: APIClient, tecnico: Usuario, tecnico_intruso: Usuario
) -> None:
    corpo = api_dono.get("/api/usuarios/").json()

    nomes = {pessoa["username"] for pessoa in corpo["results"]}
    assert tecnico.username in nomes
    assert tecnico_intruso.username not in nomes


@pytest.mark.django_db
def test_dono_nao_alcanca_usuario_de_outra_assistencia(
    api_dono: APIClient, tecnico_intruso: Usuario
) -> None:
    resposta = api_dono.patch(
        f"/api/usuarios/{tecnico_intruso.pk}/", {"papel": Papel.DONO}, format="json"
    )

    assert resposta.status_code == 404
    tecnico_intruso.refresh_from_db()
    assert tecnico_intruso.papel == Papel.TECNICO


@pytest.mark.django_db
def test_dono_muda_o_papel_de_um_colega(api_dono: APIClient, tecnico: Usuario) -> None:
    resposta = api_dono.patch(
        f"/api/usuarios/{tecnico.pk}/", {"papel": Papel.ATENDENTE}, format="json"
    )

    assert resposta.status_code == 200
    tecnico.refresh_from_db()
    assert tecnico.papel == Papel.ATENDENTE
    assert RegistroDeAuditoria.objects.filter(acao=Acao.USUARIO_ALTERADO).exists()


@pytest.mark.django_db
def test_dono_desativa_um_colega(api_dono: APIClient, tecnico: Usuario) -> None:
    assert (
        api_dono.patch(
            f"/api/usuarios/{tecnico.pk}/", {"is_active": False}, format="json"
        ).status_code
        == 200
    )

    tecnico.refresh_from_db()
    assert not tecnico.is_active


@pytest.mark.django_db
def test_dono_nao_muda_o_proprio_papel(api_dono: APIClient, dono: Usuario) -> None:
    resposta = api_dono.patch(f"/api/usuarios/{dono.pk}/", {"papel": Papel.TECNICO}, format="json")

    assert resposta.status_code == 409
    dono.refresh_from_db()
    assert dono.papel == Papel.DONO


@pytest.mark.django_db
def test_assistencia_nao_fica_sem_dono(api_dono: APIClient, dono: Usuario, tenant: Tenant) -> None:
    outro = Usuario.objects.create_user(
        username="segundo-dono", password="x", tenant=tenant, papel=Papel.DONO
    )

    assert (
        api_dono.patch(
            f"/api/usuarios/{outro.pk}/", {"papel": Papel.TECNICO}, format="json"
        ).status_code
        == 200
    )

    resposta = api_dono.patch(f"/api/usuarios/{dono.pk}/", {"is_active": False}, format="json")

    assert resposta.status_code == 409
    dono.refresh_from_db()
    assert dono.is_active


@pytest.mark.django_db
def test_redefinir_a_senha_derruba_o_acesso_antigo(api_dono: APIClient, tecnico: Usuario) -> None:
    api_tecnico = autenticar(tecnico)
    assert api_tecnico.get("/api/ordens/").status_code == 200

    resposta = api_dono.post(
        f"/api/usuarios/{tecnico.pk}/senha/", {"senha": "trocada-2026-ok"}, format="json"
    )

    assert resposta.status_code == 204
    assert api_tecnico.get("/api/ordens/").status_code == 401

    tecnico.refresh_from_db()
    assert tecnico.check_password("trocada-2026-ok")
    assert RegistroDeAuditoria.objects.filter(acao=Acao.SENHA_REDEFINIDA).exists()


@pytest.mark.django_db
def test_nao_da_para_apagar_usuario_pela_api(api_dono: APIClient, tecnico: Usuario) -> None:
    assert api_dono.delete(f"/api/usuarios/{tecnico.pk}/").status_code == 405
    assert Usuario.objects.filter(pk=tecnico.pk).exists()


@pytest.mark.django_db
def test_atendente_nao_apaga_cliente(intruso: Usuario, outro_tenant: Tenant) -> None:
    cliente_api = autenticar(intruso)
    alvo = Cliente.objects.create(tenant=outro_tenant, nome="Some", telefone="11900000000")

    assert cliente_api.delete(f"/api/clientes/{alvo.pk}/").status_code == 403
    assert Cliente.objects.filter(pk=alvo.pk).exists()


@pytest.mark.django_db
def test_tecnico_apaga_cliente_da_propria_assistencia(
    api_tecnico: APIClient, tenant: Tenant
) -> None:
    alvo = Cliente.objects.create(tenant=tenant, nome="Sem ordens", telefone="11900000000")

    assert api_tecnico.delete(f"/api/clientes/{alvo.pk}/").status_code == 204
    assert not Cliente.objects.filter(pk=alvo.pk).exists()


@pytest.mark.django_db
def test_cliente_com_ordens_nao_pode_ser_apagado(
    api_tecnico: APIClient, ordem: OrdemServico
) -> None:
    alvo = ordem.cliente

    resposta = api_tecnico.delete(f"/api/clientes/{alvo.pk}/")

    assert resposta.status_code == 409
    assert Cliente.objects.filter(pk=alvo.pk).exists()
