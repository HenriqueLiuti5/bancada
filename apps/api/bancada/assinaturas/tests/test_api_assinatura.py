from datetime import timedelta
from decimal import Decimal

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from bancada.assinaturas.models import Assinatura, SituacaoDaAssinatura, SituacaoDaFatura
from bancada.assinaturas.regras import fim_do_teste
from bancada.assinaturas.tests.conftest import ProvedorFalso
from bancada.auditoria.models import Acao, RegistroDeAuditoria
from bancada.tenants.models import Tenant, Usuario

URL = "/api/assinatura/"
ASSINAR = "/api/assinatura/assinar/"
CANCELAR = "/api/assinatura/cancelar/"
CPF_VALIDO = "529.982.247-25"


def assinatura_do(tenant: Tenant) -> Assinatura:
    return Assinatura.objects.get(tenant=tenant)


@pytest.mark.django_db
def test_cadastro_ja_comeca_em_teste_e_o_eu_conta_quantos_dias_faltam() -> None:
    resposta = APIClient().post(
        "/api/auth/cadastro/",
        {
            "assistencia": "Conserta Já",
            "nome": "Rafael Lima",
            "email": "rafael@consertaja.test",
            "whatsapp": "(21) 98765-4321",
            "senha": "bancada-2026-forte",
            "aceite_dos_termos": True,
        },
        format="json",
    )
    cliente_api = APIClient()
    cliente_api.credentials(HTTP_AUTHORIZATION=f"Token {resposta.json()['token']}")

    resumo = cliente_api.get("/api/auth/eu/").json()["assinatura"]

    assert resumo["situacao"] == SituacaoDaAssinatura.TESTE
    assert resumo["pode_editar"] is True
    assert resumo["contratada"] is False
    assert resumo["em_teste"] is True
    assert resumo["dias_de_teste"] == 30
    assert resumo["teste_termina_em"] == fim_do_teste(timezone.localdate()).isoformat()


@pytest.mark.django_db
def test_dono_ve_valor_e_primeiro_vencimento_antes_de_assinar(
    api_dono: APIClient, tenant: Tenant
) -> None:
    dados = api_dono.get(URL).json()

    assert dados["valor_mensal"] == "59.90"
    assert dados["primeiro_vencimento"] == assinatura_do(tenant).teste_termina_em.isoformat()
    assert dados["faturas"] == []


@pytest.mark.django_db
def test_tecnico_nao_ve_a_assinatura(api_tecnico: APIClient) -> None:
    assert api_tecnico.get(URL).status_code == 403
    assert api_tecnico.post(ASSINAR, {"documento": CPF_VALIDO}).status_code == 403


@pytest.mark.django_db
def test_assinar_pede_cpf_ou_cnpj_valido(api_dono: APIClient, provedor: ProvedorFalso) -> None:
    resposta = api_dono.post(ASSINAR, {"documento": "123.456.789-00"}, format="json")

    assert resposta.status_code == 400
    assert resposta.json()["documento"] == ["Informe um CPF ou CNPJ válido."]
    assert provedor.clientes == []


@pytest.mark.django_db
def test_assinar_no_teste_cobra_a_primeira_mensalidade_no_fim_do_teste(
    api_dono: APIClient, dono: Usuario, tenant: Tenant, provedor: ProvedorFalso
) -> None:
    fim = assinatura_do(tenant).teste_termina_em

    resposta = api_dono.post(ASSINAR, {"documento": CPF_VALIDO}, format="json")

    assert resposta.status_code == 201
    assert provedor.clientes == [
        {
            "nome": tenant.nome,
            "documento": "52998224725",
            "email": dono.email,
            "referencia": f"assistencia-{tenant.pk}",
        }
    ]
    assert provedor.assinaturas[0]["primeiro_vencimento"] == fim
    assert provedor.assinaturas[0]["valor"] == Decimal("59.90")

    assinatura = assinatura_do(tenant)
    assert assinatura.contratada
    assert assinatura.situacao == SituacaoDaAssinatura.ATIVA
    assert assinatura.documento_do_pagador == "52998224725"

    dados = resposta.json()
    assert dados["situacao"] == SituacaoDaAssinatura.ATIVA
    assert [(f["vencimento"], f["situacao"]) for f in dados["faturas"]] == [
        (fim.isoformat(), SituacaoDaFatura.ABERTA)
    ]
    assert dados["faturas"][0]["link_de_pagamento"].startswith("https://")
    assert RegistroDeAuditoria.objects.filter(
        tenant=tenant, acao=Acao.ASSINATURA_CONTRATADA
    ).exists()


@pytest.mark.django_db
def test_assinar_depois_do_teste_cobra_a_partir_de_hoje(
    api_dono: APIClient, tenant: Tenant, provedor: ProvedorFalso
) -> None:
    Assinatura.objects.filter(tenant=tenant).update(
        teste_termina_em=timezone.localdate() - timedelta(days=5)
    )

    api_dono.post(ASSINAR, {"documento": CPF_VALIDO}, format="json")

    assert provedor.assinaturas[0]["primeiro_vencimento"] == timezone.localdate()


@pytest.mark.django_db
def test_assinar_duas_vezes_e_recusado(api_dono: APIClient, provedor: ProvedorFalso) -> None:
    api_dono.post(ASSINAR, {"documento": CPF_VALIDO}, format="json")

    resposta = api_dono.post(ASSINAR, {"documento": CPF_VALIDO}, format="json")

    assert resposta.status_code == 409
    assert len(provedor.assinaturas) == 1


@pytest.mark.django_db
def test_falha_no_asaas_guarda_o_cliente_criado_para_a_proxima_tentativa(
    api_dono: APIClient, tenant: Tenant, provedor: ProvedorFalso
) -> None:
    provedor.falhar_em = "criar_assinatura"

    resposta = api_dono.post(ASSINAR, {"documento": CPF_VALIDO}, format="json")

    assert resposta.status_code == 502
    assert resposta.json()["detail"] == "O Asaas está fora do ar."
    assert assinatura_do(tenant).cliente_no_provedor == "cus_1"
    assert not assinatura_do(tenant).contratada

    provedor.falhar_em = None
    assert api_dono.post(ASSINAR, {"documento": CPF_VALIDO}, format="json").status_code == 201
    assert len(provedor.clientes) == 1


@pytest.mark.django_db
def test_cancelar_no_teste_mantem_os_dias_gratis_e_cancela_a_fatura(
    api_dono: APIClient, tenant: Tenant, provedor: ProvedorFalso
) -> None:
    api_dono.post(ASSINAR, {"documento": CPF_VALIDO}, format="json")
    fim = assinatura_do(tenant).teste_termina_em

    resposta = api_dono.post(CANCELAR)

    assert resposta.status_code == 200
    assert provedor.canceladas == ["sub_1"]
    dados = resposta.json()
    assert dados["situacao"] == SituacaoDaAssinatura.CANCELADA
    assert dados["pode_editar"] is True
    assert dados["acesso_ate"] == fim.isoformat()
    assert [f["situacao"] for f in dados["faturas"]] == [SituacaoDaFatura.CANCELADA]
    assert RegistroDeAuditoria.objects.filter(
        tenant=tenant, acao=Acao.ASSINATURA_CANCELADA
    ).exists()


@pytest.mark.django_db
def test_cancelar_sem_assinatura_e_recusado(api_dono: APIClient, provedor: ProvedorFalso) -> None:
    assert api_dono.post(CANCELAR).status_code == 409
    assert provedor.canceladas == []


@pytest.mark.django_db
def test_assinar_de_novo_depois_de_cancelar_reaproveita_o_cliente(
    api_dono: APIClient, tenant: Tenant, provedor: ProvedorFalso
) -> None:
    api_dono.post(ASSINAR, {"documento": CPF_VALIDO}, format="json")
    api_dono.post(CANCELAR)

    resposta = api_dono.post(ASSINAR, {"documento": CPF_VALIDO}, format="json")

    assert resposta.status_code == 201
    assert len(provedor.clientes) == 1
    assert assinatura_do(tenant).assinatura_no_provedor == "sub_2"
    assert resposta.json()["situacao"] == SituacaoDaAssinatura.ATIVA


@pytest.mark.django_db
def test_assinar_marca_o_passo_nos_primeiros_passos(
    api_dono: APIClient, provedor: ProvedorFalso
) -> None:
    def passo_de_assinar() -> bool:
        passos = api_dono.get("/api/orientacao/primeiros-passos/").json()["passos"]
        return next(passo["feito"] for passo in passos if passo["chave"] == "assinar")

    assert passo_de_assinar() is False
    api_dono.post(ASSINAR, {"documento": CPF_VALIDO}, format="json")
    assert passo_de_assinar() is True
