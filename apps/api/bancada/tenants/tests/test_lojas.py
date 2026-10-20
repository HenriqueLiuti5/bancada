from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from bancada.assinaturas.models import Assinatura
from bancada.auditoria.models import Acao, RegistroDeAuditoria
from bancada.clientes.models import Aparelho, Cliente
from bancada.core.api import SOMENTE_PARA_CONSULTA
from bancada.ordens.estados import StatusOS
from bancada.ordens.models import OrdemServico
from bancada.orientacao.passos import completou_o_endereco_da_loja
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


@pytest.fixture
def filial(tenant: Tenant) -> Loja:
    return Loja.objects.create(tenant=tenant, nome="Filial Centro")


def abrir_ordem(api: APIClient, loja: Loja, aparelho: Aparelho) -> dict:
    resposta = api.post(
        "/api/ordens/",
        {
            "loja": loja.pk,
            "cliente": aparelho.cliente_id,
            "aparelho": aparelho.pk,
            "problema_relatado": "Tela trincada",
        },
        format="json",
    )
    return {"status": resposta.status_code, "corpo": resposta.json()}


@pytest.mark.django_db
def test_dono_cria_uma_loja(api_dono: APIClient, tenant: Tenant, loja: Loja) -> None:
    resposta = api_dono.post(
        "/api/lojas/",
        {"nome": "  Filial Shopping ", "telefone": "(11) 3333-4444", "endereco": "Av. Brasil, 10"},
        format="json",
    )

    assert resposta.status_code == 201
    assert resposta.json() == {
        "id": resposta.json()["id"],
        "nome": "Filial Shopping",
        "telefone": "1133334444",
        "endereco": "Av. Brasil, 10",
        "ativa": True,
    }
    nova = Loja.objects.get(pk=resposta.json()["id"])
    assert nova.tenant == tenant

    registro = RegistroDeAuditoria.objects.get(acao=Acao.LOJA_CRIADA)
    assert registro.objeto == "loja"
    assert registro.objeto_id == nova.pk
    assert registro.detalhe == "Filial Shopping"


@pytest.mark.django_db
def test_loja_nova_so_precisa_do_nome(api_dono: APIClient, loja: Loja) -> None:
    resposta = api_dono.post("/api/lojas/", {"nome": "Filial"}, format="json")

    assert resposta.status_code == 201
    assert resposta.json()["telefone"] == ""
    assert resposta.json()["endereco"] == ""


@pytest.mark.django_db
def test_loja_nova_confere_nome_e_telefone(api_dono: APIClient, loja: Loja) -> None:
    sem_nome = api_dono.post("/api/lojas/", {"nome": " "}, format="json")
    telefone_errado = api_dono.post(
        "/api/lojas/", {"nome": "Filial", "telefone": "(23) 3333-4444"}, format="json"
    )

    assert sem_nome.status_code == 400
    assert "nome" in sem_nome.json()
    assert telefone_errado.status_code == 400
    assert "O DDD 23 não existe" in telefone_errado.json()["telefone"][0]
    assert Loja.objects.count() == 1


@pytest.mark.django_db
def test_duas_lojas_da_mesma_assistencia_nao_tem_o_mesmo_nome(
    api_dono: APIClient, loja: Loja, filial: Loja, outro_tenant: Tenant
) -> None:
    Loja.objects.create(tenant=outro_tenant, nome="Filial Norte")

    endereco = f"/api/lojas/{filial.pk}/"
    repetida = api_dono.post("/api/lojas/", {"nome": "matriz"}, format="json")
    renomeada = api_dono.patch(endereco, {"nome": "MATRIZ"}, format="json")
    mesmo_nome = api_dono.patch(endereco, {"nome": "Filial Centro"}, format="json")
    de_outra_assistencia = api_dono.post("/api/lojas/", {"nome": "Filial Norte"}, format="json")

    assert repetida.status_code == 400
    assert repetida.json()["nome"] == ["Já existe uma loja com esse nome."]
    assert renomeada.status_code == 400
    assert mesmo_nome.status_code == 200
    assert de_outra_assistencia.status_code == 201


@pytest.mark.django_db
def test_toda_a_equipe_ve_as_lojas_mas_so_o_dono_cria(
    api_tecnico: APIClient, api_atendente: APIClient, loja: Loja, filial: Loja
) -> None:
    filial.ativa = False
    filial.save(update_fields=["ativa"])

    for api in [api_tecnico, api_atendente]:
        lista = api.get("/api/lojas/")
        assert lista.status_code == 200
        assert {(item["nome"], item["ativa"]) for item in lista.json()} == {
            ("Matriz", True),
            ("Filial Centro", False),
        }

        criada = api.post("/api/lojas/", {"nome": "Filial Sul"}, format="json")
        assert criada.status_code == 403

    assert not Loja.objects.filter(nome="Filial Sul").exists()


@pytest.mark.django_db
def test_assinatura_vencida_nao_cria_loja(api_dono: APIClient, tenant: Tenant, loja: Loja) -> None:
    Assinatura.objects.filter(tenant=tenant).update(
        teste_termina_em=timezone.localdate() - timedelta(days=1)
    )

    resposta = api_dono.post("/api/lojas/", {"nome": "Filial"}, format="json")

    assert resposta.status_code == 403
    assert resposta.json()["detail"] == SOMENTE_PARA_CONSULTA
    assert api_dono.get("/api/lojas/").status_code == 200


@pytest.mark.django_db
def test_dono_desativa_e_reativa_uma_loja(api_dono: APIClient, loja: Loja, filial: Loja) -> None:
    desativada = api_dono.patch(f"/api/lojas/{filial.pk}/", {"ativa": False}, format="json")

    assert desativada.status_code == 200
    assert desativada.json()["ativa"] is False
    filial.refresh_from_db()
    assert filial.ativa is False
    registro = RegistroDeAuditoria.objects.get(acao=Acao.ASSISTENCIA_ALTERADA)
    assert registro.objeto == "loja"
    assert registro.detalhe == "ativa=False"

    reativada = api_dono.patch(f"/api/lojas/{filial.pk}/", {"ativa": True}, format="json")

    assert reativada.status_code == 200
    filial.refresh_from_db()
    assert filial.ativa is True


@pytest.mark.django_db
def test_a_ultima_loja_ativa_nao_se_desativa(api_dono: APIClient, loja: Loja, filial: Loja) -> None:
    filial.ativa = False
    filial.save(update_fields=["ativa"])

    resposta = api_dono.patch(f"/api/lojas/{loja.pk}/", {"ativa": False}, format="json")

    assert resposta.status_code == 409
    assert resposta.json()["detail"] == "A assistência precisa de pelo menos uma loja ativa."
    loja.refresh_from_db()
    assert loja.ativa is True


@pytest.mark.django_db
def test_tecnico_nao_desativa_loja(api_tecnico: APIClient, loja: Loja, filial: Loja) -> None:
    resposta = api_tecnico.patch(f"/api/lojas/{filial.pk}/", {"ativa": False}, format="json")

    assert resposta.status_code == 403
    filial.refresh_from_db()
    assert filial.ativa is True


@pytest.mark.django_db
def test_loja_desativada_nao_recebe_ordem_nova_e_termina_as_que_tem(
    api_tecnico: APIClient, tenant: Tenant, loja: Loja, filial: Loja, aparelho: Aparelho
) -> None:
    aberta_antes = abrir_ordem(api_tecnico, filial, aparelho)
    assert aberta_antes["status"] == 201
    filial.ativa = False
    filial.save(update_fields=["ativa"])

    recusada = abrir_ordem(api_tecnico, filial, aparelho)
    aceita = abrir_ordem(api_tecnico, loja, aparelho)
    andamento = api_tecnico.post(
        f"/api/ordens/{aberta_antes['corpo']['id']}/transicionar/",
        {"status": StatusOS.EM_DIAGNOSTICO},
        format="json",
    )

    assert recusada["status"] == 400
    assert recusada["corpo"]["loja"] == ["Esta loja foi desativada. Escolha uma loja ativa."]
    assert aceita["status"] == 201
    assert andamento.status_code == 200


@pytest.mark.django_db
def test_loja_de_outra_assistencia_continua_recusada_antes_de_dizer_se_esta_ativa(
    api_tecnico: APIClient, outro_tenant: Tenant, loja: Loja, aparelho: Aparelho
) -> None:
    alheia = Loja.objects.create(tenant=outro_tenant, nome="Deles", ativa=False)

    resposta = abrir_ordem(api_tecnico, alheia, aparelho)

    assert resposta["status"] == 400
    assert resposta["corpo"]["loja"] == ["Não pertence à sua assistência."]


@pytest.mark.django_db
def test_cliente_ve_o_nome_da_loja_quando_a_assistencia_usa_mais_de_uma(
    tenant: Tenant, loja: Loja, cliente: Cliente, aparelho: Aparelho
) -> None:
    ordem = OrdemServico.abrir(
        tenant=tenant, loja=loja, cliente=cliente, aparelho=aparelho, problema_relatado="X"
    )
    assert ordem.loja_para_o_cliente == ""

    criada_por_engano = Loja.objects.create(tenant=tenant, nome="Filail")
    assert ordem.loja_para_o_cliente == "Matriz"

    criada_por_engano.ativa = False
    criada_por_engano.save(update_fields=["ativa"])
    assert ordem.loja_para_o_cliente == ""

    fechada = Loja.objects.create(tenant=tenant, nome="Filial Shopping")
    OrdemServico.abrir(
        tenant=tenant, loja=fechada, cliente=cliente, aparelho=aparelho, problema_relatado="Y"
    )
    fechada.ativa = False
    fechada.save(update_fields=["ativa"])
    assert ordem.loja_para_o_cliente == "Matriz"


@pytest.mark.django_db
def test_endereco_da_loja_desativada_nao_conta_nos_primeiros_passos(
    tenant: Tenant, loja: Loja, filial: Loja
) -> None:
    loja.endereco = "Rua das Flores, 100"
    loja.save(update_fields=["endereco"])
    assert not completou_o_endereco_da_loja(tenant)

    filial.ativa = False
    filial.save(update_fields=["ativa"])
    assert completou_o_endereco_da_loja(tenant)


@pytest.mark.django_db
def test_painel_continua_filtrando_pela_loja_desativada(
    api_tecnico: APIClient, filial: Loja, loja: Loja
) -> None:
    filial.ativa = False
    filial.save(update_fields=["ativa"])

    resposta = api_tecnico.get("/api/ordens/painel/", {"loja": filial.pk})

    assert resposta.status_code == 200


@pytest.mark.django_db
def test_detalhe_da_ordem_diz_a_loja_quando_ha_mais_de_uma(
    api_tecnico: APIClient, ordem: OrdemServico, filial: Loja
) -> None:
    assert api_tecnico.get(f"/api/ordens/{ordem.pk}/").json()["loja_nome"] == "Matriz"

    filial.ativa = False
    filial.save(update_fields=["ativa"])

    assert api_tecnico.get(f"/api/ordens/{ordem.pk}/").json()["loja_nome"] == ""
