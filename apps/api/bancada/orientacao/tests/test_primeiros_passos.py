import pytest
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from bancada.auditoria.models import Acao, RegistroDeAuditoria
from bancada.avisos.models import AvisoDeStatus
from bancada.clientes.models import Aparelho, Cliente
from bancada.ordens.models import OrdemServico
from bancada.tenants.models import Loja, Papel, Tenant, Usuario

URL = "/api/orientacao/primeiros-passos/"


def passos_feitos(api: APIClient) -> dict[str, bool]:
    return {passo["chave"]: passo["feito"] for passo in api.get(URL).json()["passos"]}


def abrir_ordem_em(tenant: Tenant) -> OrdemServico:
    loja = Loja.objects.filter(tenant=tenant).first() or Loja.objects.create(
        tenant=tenant, nome="Matriz"
    )
    cliente = Cliente.objects.create(tenant=tenant, nome="Ana Lima", telefone="11988887777")
    aparelho = Aparelho.objects.create(
        tenant=tenant, cliente=cliente, marca="Samsung", modelo="A15"
    )
    return OrdemServico.abrir(
        tenant=tenant,
        loja=loja,
        cliente=cliente,
        aparelho=aparelho,
        problema_relatado="Tela quebrada",
    )


@pytest.mark.django_db
def test_assistencia_recem_criada_comeca_sem_nenhum_passo(api_dono: APIClient, loja: Loja) -> None:
    dados = api_dono.get(URL).json()

    assert [passo["chave"] for passo in dados["passos"]] == [
        "abrir-ordem",
        "mandar-link",
        "endereco-da-loja",
        "convidar-equipe",
        "assinar",
    ]
    assert not any(passo["feito"] for passo in dados["passos"])
    assert dados["ordem_mais_recente"] is None
    assert dados["escondidos"] is False


@pytest.mark.django_db
def test_abrir_uma_ordem_cumpre_o_primeiro_passo(api_dono: APIClient, ordem: OrdemServico) -> None:
    dados = api_dono.get(URL).json()

    assert dados["passos"][0] == {"chave": "abrir-ordem", "feito": True}
    assert dados["ordem_mais_recente"] == ordem.pk


@pytest.mark.django_db
def test_compartilhar_o_link_pelo_whatsapp_cumpre_o_passo_e_fica_na_auditoria(
    api_dono: APIClient, ordem: OrdemServico, dono: Usuario
) -> None:
    resposta = api_dono.post(
        f"/api/ordens/{ordem.pk}/link-compartilhado/", {"meio": "whatsapp"}, format="json"
    )

    assert resposta.status_code == 204
    assert passos_feitos(api_dono)["mandar-link"] is True
    registro = RegistroDeAuditoria.objects.get(acao=Acao.LINK_COMPARTILHADO)
    assert registro.usuario == dono
    assert registro.objeto_id == ordem.pk
    assert registro.detalhe == f"OS #{ordem.numero}, pelo WhatsApp"


@pytest.mark.django_db
def test_atendente_tambem_registra_o_compartilhamento(
    atendente_do_tenant: Usuario, ordem: OrdemServico
) -> None:
    api = APIClient()
    token, _ = Token.objects.get_or_create(user=atendente_do_tenant)
    api.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

    resposta = api.post(
        f"/api/ordens/{ordem.pk}/link-compartilhado/", {"meio": "copia"}, format="json"
    )

    assert resposta.status_code == 204


@pytest.mark.django_db
def test_meio_de_compartilhamento_desconhecido_e_recusado(
    api_dono: APIClient, ordem: OrdemServico
) -> None:
    resposta = api_dono.post(
        f"/api/ordens/{ordem.pk}/link-compartilhado/", {"meio": "pombo"}, format="json"
    )

    assert resposta.status_code == 400
    assert not RegistroDeAuditoria.objects.filter(acao=Acao.LINK_COMPARTILHADO).exists()


@pytest.mark.django_db
def test_nao_se_registra_compartilhamento_de_ordem_de_outra_assistencia(
    api_intruso: APIClient, ordem: OrdemServico
) -> None:
    resposta = api_intruso.post(
        f"/api/ordens/{ordem.pk}/link-compartilhado/", {"meio": "copia"}, format="json"
    )

    assert resposta.status_code == 404
    assert not RegistroDeAuditoria.objects.filter(acao=Acao.LINK_COMPARTILHADO).exists()


@pytest.mark.django_db
def test_aviso_enviado_por_email_tambem_conta_como_link_mandado(
    api_dono: APIClient, ordem: OrdemServico
) -> None:
    AvisoDeStatus.objects.create(
        tenant=ordem.tenant,
        evento=ordem.eventos.get(),
        destino="maria@cliente.test",
        assunto="Recebemos seu aparelho",
        enviado_em=timezone.now(),
    )

    assert passos_feitos(api_dono)["mandar-link"] is True


@pytest.mark.django_db
def test_aviso_que_ainda_nao_saiu_nao_conta(api_dono: APIClient, ordem: OrdemServico) -> None:
    AvisoDeStatus.objects.create(
        tenant=ordem.tenant,
        evento=ordem.eventos.get(),
        destino="maria@cliente.test",
        assunto="Recebemos seu aparelho",
    )

    assert passos_feitos(api_dono)["mandar-link"] is False


@pytest.mark.django_db
def test_endereco_de_todas_as_lojas_cumpre_o_passo(
    api_dono: APIClient, tenant: Tenant, loja: Loja
) -> None:
    loja.endereco = "Rua das Flores, 100"
    loja.save()
    assert passos_feitos(api_dono)["endereco-da-loja"] is True

    Loja.objects.create(tenant=tenant, nome="Filial")
    assert passos_feitos(api_dono)["endereco-da-loja"] is False


@pytest.mark.django_db
def test_convite_cumpre_o_passo_mesmo_depois_de_cancelado(api_dono: APIClient) -> None:
    convite = api_dono.post(
        "/api/convites/", {"nome": "Joana", "papel": "tecnico"}, format="json"
    ).json()
    api_dono.delete(f"/api/convites/{convite['id']}/")

    assert passos_feitos(api_dono)["convidar-equipe"] is True


@pytest.mark.django_db
def test_colega_na_equipe_cumpre_o_passo_de_convidar(api_dono: APIClient, tecnico: Usuario) -> None:
    assert passos_feitos(api_dono)["convidar-equipe"] is True


@pytest.mark.django_db
def test_o_que_outra_assistencia_fez_nao_conta(
    api_dono: APIClient, outro_tenant: Tenant, loja: Loja
) -> None:
    alheia = abrir_ordem_em(outro_tenant)
    RegistroDeAuditoria.objects.create(
        tenant=outro_tenant,
        acao=Acao.LINK_COMPARTILHADO,
        objeto="ordem",
        objeto_id=alheia.pk,
    )
    Usuario.objects.create_user(
        username="de-fora", password="senha-de-teste", tenant=outro_tenant, papel=Papel.TECNICO
    )

    assert not any(passos_feitos(api_dono).values())


@pytest.mark.django_db
def test_dono_esconde_e_mostra_de_novo(api_dono: APIClient, dono: Usuario) -> None:
    escondidos = api_dono.patch(URL, {"escondidos": True}, format="json")
    assert escondidos.status_code == 200
    assert escondidos.json()["escondidos"] is True
    dono.refresh_from_db()
    assert dono.primeiros_passos_escondidos is True

    api_dono.patch(URL, {"escondidos": False}, format="json")
    dono.refresh_from_db()
    assert dono.primeiros_passos_escondidos is False


@pytest.mark.django_db
def test_primeiros_passos_sao_so_do_dono(api_tecnico: APIClient) -> None:
    assert api_tecnico.get(URL).status_code == 403
    assert api_tecnico.patch(URL, {"escondidos": True}, format="json").status_code == 403
