from datetime import date, timedelta
from decimal import Decimal
from typing import Any

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from bancada.assinaturas.models import (
    Assinatura,
    Fatura,
    FormaDeCobranca,
    SituacaoDaAssinatura,
    SituacaoDaFatura,
)
from bancada.assinaturas.regras import fim_do_teste
from bancada.assinaturas.tests.conftest import ProvedorFalso
from bancada.auditoria.models import Acao, RegistroDeAuditoria
from bancada.core.calendario import somar_meses
from bancada.core.fuso import hoje_no_bancada
from bancada.tenants.models import Convite, Loja, Papel, Tenant, Usuario

URL = "/api/assinatura/"
ASSINAR = "/api/assinatura/assinar/"
CANCELAR = "/api/assinatura/cancelar/"
CPF_VALIDO = "529.982.247-25"
PEDIDO = {"documento": CPF_VALIDO, "plano": "equipe", "ciclo": "mensal"}


def assinatura_do(tenant: Tenant) -> Assinatura:
    return Assinatura.objects.get(tenant=tenant)


def assinar(api: APIClient, **pedido: str) -> dict[str, Any]:
    resposta = api.post(ASSINAR, {**PEDIDO, **pedido}, format="json")
    assert resposta.status_code == 201, resposta.json()
    return resposta.json()


def pagar(tenant: Tenant, *, vencimento: date, paga_em: date, forma: str) -> Fatura:
    fatura = Fatura.objects.get(tenant=tenant)
    fatura.vencimento = vencimento
    fatura.paga_em = paga_em
    fatura.forma_de_pagamento = forma
    fatura.situacao = SituacaoDaFatura.PAGA
    fatura.save()
    return fatura


def terminar_o_teste(tenant: Tenant, dias_atras: int) -> date:
    fim = hoje_no_bancada() - timedelta(days=dias_atras)
    Assinatura.objects.filter(tenant=tenant).update(teste_termina_em=fim)
    return fim


def pessoa(tenant: Tenant, nome: str) -> Usuario:
    return Usuario.objects.create_user(
        username=f"{nome}@central.test",
        email=f"{nome}@central.test",
        tenant=tenant,
        papel=Papel.TECNICO,
    )


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
    assert resumo["ciclo"] == ""
    assert resumo["em_teste"] is True
    assert resumo["dias_de_teste"] == 30
    assert resumo["teste_termina_em"] == fim_do_teste(timezone.localdate()).isoformat()


@pytest.mark.django_db
def test_so_para_consulta_mostra_quando_a_conta_sera_apagada(
    api_dono: APIClient, tenant: Tenant
) -> None:
    assert api_dono.get(URL).json()["apaga_em"] is None

    hoje = hoje_no_bancada()
    Assinatura.objects.filter(tenant=tenant).update(teste_termina_em=hoje - timedelta(days=1))

    assert api_dono.get(URL).json()["apaga_em"] == somar_meses(hoje, 6).isoformat()


@pytest.mark.django_db
def test_dono_ve_os_planos_e_o_que_cabe_na_assistencia_antes_de_assinar(
    api_dono: APIClient, tenant: Tenant
) -> None:
    dados = api_dono.get(URL).json()

    assert dados["plano"] == ""
    assert dados["valor"] is None
    assert dados["cancelamento"] is None
    assert dados["primeiro_vencimento"] == assinatura_do(tenant).teste_termina_em.isoformat()
    assert dados["faturas"] == []
    assert dados["tamanho"] == {"lojas": 0, "pessoas": 1}
    assert dados["plano_sugerido"] == "solo"
    assert dados["planos"] == [
        {
            "plano": "solo",
            "nome": "Solo",
            "lojas": 1,
            "pessoas": 2,
            "mensal": "39.90",
            "anual": "399.00",
            "por_que_nao_cabe": None,
        },
        {
            "plano": "equipe",
            "nome": "Equipe",
            "lojas": 1,
            "pessoas": None,
            "mensal": "59.90",
            "anual": "599.00",
            "por_que_nao_cabe": None,
        },
        {
            "plano": "rede",
            "nome": "Rede",
            "lojas": 3,
            "pessoas": None,
            "mensal": "119.90",
            "anual": "1199.00",
            "por_que_nao_cabe": None,
        },
    ]


@pytest.mark.django_db
def test_tecnico_nao_ve_a_assinatura(api_tecnico: APIClient) -> None:
    assert api_tecnico.get(URL).status_code == 403
    assert api_tecnico.post(ASSINAR, PEDIDO).status_code == 403


@pytest.mark.django_db
def test_assinar_pede_cpf_ou_cnpj_valido(api_dono: APIClient, provedor: ProvedorFalso) -> None:
    resposta = api_dono.post(ASSINAR, {**PEDIDO, "documento": "123.456.789-00"}, format="json")

    assert resposta.status_code == 400
    assert resposta.json()["documento"] == ["Informe um CPF ou CNPJ válido."]
    assert provedor.clientes == []


@pytest.mark.django_db
def test_assinar_pede_um_dos_planos_e_um_dos_ciclos(
    api_dono: APIClient, provedor: ProvedorFalso
) -> None:
    resposta = api_dono.post(
        ASSINAR, {**PEDIDO, "plano": "ouro", "ciclo": "semanal"}, format="json"
    )

    assert resposta.status_code == 400
    assert resposta.json() == {
        "plano": ["Escolha um dos planos."],
        "ciclo": ["Escolha entre o pagamento mensal e o anual."],
    }
    assert provedor.clientes == []


@pytest.mark.django_db
def test_assinar_no_teste_cobra_a_primeira_mensalidade_no_fim_do_teste(
    api_dono: APIClient, dono: Usuario, tenant: Tenant, provedor: ProvedorFalso
) -> None:
    fim = assinatura_do(tenant).teste_termina_em

    resposta = api_dono.post(ASSINAR, PEDIDO, format="json")

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
    assert provedor.assinaturas[0]["ciclo"] == "mensal"
    assert provedor.assinaturas[0]["descricao"] == "Assinatura mensal do Bancada, plano Equipe"

    assinatura = assinatura_do(tenant)
    assert assinatura.contratada
    assert assinatura.situacao == SituacaoDaAssinatura.ATIVA
    assert assinatura.documento_do_pagador == "52998224725"

    dados = resposta.json()
    assert dados["situacao"] == SituacaoDaAssinatura.ATIVA
    assert (dados["plano_rotulo"], dados["ciclo_rotulo"], dados["valor"]) == (
        "Equipe",
        "Mensal",
        "59.90",
    )
    assert [(f["vencimento"], f["situacao"]) for f in dados["faturas"]] == [
        (fim.isoformat(), SituacaoDaFatura.ABERTA)
    ]
    assert dados["faturas"][0]["link_de_pagamento"].startswith("https://")
    assert (
        RegistroDeAuditoria.objects.get(tenant=tenant, acao=Acao.ASSINATURA_CONTRATADA).detalhe
        == "Equipe, R$ 59.90 por mês"
    )


@pytest.mark.django_db
def test_assinar_o_anual_cobra_dez_meses_uma_vez_por_ano(
    api_dono: APIClient, tenant: Tenant, provedor: ProvedorFalso
) -> None:
    dados = assinar(api_dono, plano="solo", ciclo="anual")

    assert provedor.assinaturas[0]["valor"] == Decimal("399.00")
    assert provedor.assinaturas[0]["ciclo"] == "anual"
    assert provedor.assinaturas[0]["descricao"] == "Assinatura anual do Bancada, plano Solo"
    assert (dados["plano"], dados["ciclo"], dados["valor"]) == ("solo", "anual", "399.00")
    assert dados["faturas"][0]["valor"] == "399.00"
    assert (
        RegistroDeAuditoria.objects.get(tenant=tenant, acao=Acao.ASSINATURA_CONTRATADA).detalhe
        == "Solo, R$ 399.00 por ano"
    )


@pytest.mark.django_db
def test_plano_pequeno_demais_e_recusado_antes_de_ir_ao_asaas(
    api_dono: APIClient, dono: Usuario, tenant: Tenant, provedor: ProvedorFalso
) -> None:
    pessoa(tenant, "joana")
    Convite.objects.create(tenant=tenant, nome="Rafael", papel=Papel.ATENDENTE, criado_por=dono)

    resposta = api_dono.post(ASSINAR, {**PEDIDO, "plano": "solo"}, format="json")

    assert resposta.status_code == 400
    assert resposta.json() == {
        "plano": [
            "A assistência tem 3 pessoas, contando os convites ainda não aceitos, e o plano Solo é "
            "para até 2."
        ]
    }
    assert provedor.clientes == []
    dados = api_dono.get(URL).json()
    assert dados["plano_sugerido"] == "equipe"
    assert [plano["por_que_nao_cabe"] is None for plano in dados["planos"]] == [False, True, True]


@pytest.mark.django_db
def test_mais_de_uma_loja_so_cabe_na_rede_e_mais_de_tres_em_nenhum(
    api_dono: APIClient, tenant: Tenant
) -> None:
    for nome in ("Centro", "Shopping"):
        Loja.objects.create(tenant=tenant, nome=nome)
    Loja.objects.create(tenant=tenant, nome="Fechada", ativa=False)

    dados = api_dono.get(URL).json()
    assert dados["tamanho"] == {"lojas": 2, "pessoas": 1}
    assert dados["plano_sugerido"] == "rede"
    assert dados["planos"][1]["por_que_nao_cabe"] == (
        "A assistência tem 2 lojas ativas, e o plano Equipe é para 1 loja."
    )

    for nome in ("Bairro", "Rodoviária"):
        Loja.objects.create(tenant=tenant, nome=nome)

    dados = api_dono.get(URL).json()
    assert dados["plano_sugerido"] is None
    assert dados["planos"][2]["por_que_nao_cabe"] == (
        "A assistência tem 4 lojas ativas, e o plano Rede é para até 3 lojas."
    )


@pytest.mark.django_db
def test_assinar_depois_do_teste_cobra_a_partir_de_hoje(
    api_dono: APIClient, tenant: Tenant, provedor: ProvedorFalso
) -> None:
    Assinatura.objects.filter(tenant=tenant).update(
        teste_termina_em=timezone.localdate() - timedelta(days=5)
    )

    api_dono.post(ASSINAR, PEDIDO, format="json")

    assert provedor.assinaturas[0]["primeiro_vencimento"] == timezone.localdate()


@pytest.mark.django_db
def test_assinar_duas_vezes_e_recusado(api_dono: APIClient, provedor: ProvedorFalso) -> None:
    api_dono.post(ASSINAR, PEDIDO, format="json")

    resposta = api_dono.post(ASSINAR, PEDIDO, format="json")

    assert resposta.status_code == 409
    assert len(provedor.assinaturas) == 1


@pytest.mark.django_db
def test_falha_no_asaas_guarda_o_cliente_criado_para_a_proxima_tentativa(
    api_dono: APIClient, tenant: Tenant, provedor: ProvedorFalso
) -> None:
    provedor.falhar_em = "criar_assinatura"

    resposta = api_dono.post(ASSINAR, PEDIDO, format="json")

    assert resposta.status_code == 502
    assert resposta.json()["detail"] == "O Asaas está fora do ar."
    assert assinatura_do(tenant).cliente_no_provedor == "cus_1"
    assert not assinatura_do(tenant).contratada

    provedor.falhar_em = None
    assert api_dono.post(ASSINAR, PEDIDO, format="json").status_code == 201
    assert len(provedor.clientes) == 1


@pytest.mark.django_db
def test_cancelar_no_teste_mantem_os_dias_gratis_e_cancela_a_fatura(
    api_dono: APIClient, tenant: Tenant, provedor: ProvedorFalso
) -> None:
    api_dono.post(ASSINAR, PEDIDO, format="json")
    fim = assinatura_do(tenant).teste_termina_em
    assert api_dono.get(URL).json()["cancelamento"] == {
        "devolve": None,
        "acesso_ate": fim.isoformat(),
    }

    resposta = api_dono.post(CANCELAR)

    assert resposta.status_code == 200
    assert provedor.canceladas == ["sub_1"]
    assert provedor.devolvidas == []
    dados = resposta.json()
    assert dados["situacao"] == SituacaoDaAssinatura.CANCELADA
    assert dados["pode_editar"] is True
    assert dados["acesso_ate"] == fim.isoformat()
    assert [f["situacao"] for f in dados["faturas"]] == [SituacaoDaFatura.CANCELADA]
    assert RegistroDeAuditoria.objects.filter(
        tenant=tenant, acao=Acao.ASSINATURA_CANCELADA
    ).exists()


@pytest.mark.django_db
def test_cancelar_o_anual_ate_sete_dias_depois_de_pagar_devolve_tudo(
    api_dono: APIClient, tenant: Tenant, provedor: ProvedorFalso
) -> None:
    assinar(api_dono, plano="solo", ciclo="anual")
    hoje = hoje_no_bancada()
    vencimento = terminar_o_teste(tenant, dias_atras=7)
    pagar(tenant, vencimento=vencimento, paga_em=vencimento, forma=FormaDeCobranca.PIX)
    assert api_dono.get(URL).json()["cancelamento"] == {
        "devolve": "399.00",
        "acesso_ate": hoje.isoformat(),
    }

    dados = api_dono.post(CANCELAR).json()

    assert provedor.devolvidas == ["pay_sub_1"]
    assert dados["acesso_ate"] == hoje.isoformat()
    assert dados["faturas"][0]["situacao"] == SituacaoDaFatura.ESTORNADA
    assert dados["faturas"][0]["link_da_devolucao"] == ""
    detalhe = RegistroDeAuditoria.objects.get(tenant=tenant, acao=Acao.ASSINATURA_CANCELADA).detalhe
    assert detalhe == f"acesso até {hoje:%d/%m/%Y}, R$ 399.00 devolvidos"


@pytest.mark.django_db
def test_boleto_devolvido_traz_o_link_para_quem_pagou_informar_a_conta(
    api_dono: APIClient, tenant: Tenant, provedor: ProvedorFalso
) -> None:
    assinar(api_dono, plano="equipe", ciclo="anual")
    vencimento = terminar_o_teste(tenant, dias_atras=2)
    pagar(tenant, vencimento=vencimento, paga_em=vencimento, forma=FormaDeCobranca.BOLETO)

    dados = api_dono.post(CANCELAR).json()

    assert dados["faturas"][0]["link_da_devolucao"] == (
        "https://sandbox.asaas.test/solicitar-estorno/pay_sub_1"
    )


@pytest.mark.django_db
def test_cancelar_o_anual_depois_de_sete_dias_mantem_o_ano_pago(
    api_dono: APIClient, tenant: Tenant, provedor: ProvedorFalso
) -> None:
    assinar(api_dono, plano="rede", ciclo="anual")
    vencimento = terminar_o_teste(tenant, dias_atras=8)
    pagar(tenant, vencimento=vencimento, paga_em=vencimento, forma=FormaDeCobranca.CARTAO)
    ultimo_dia = somar_meses(vencimento, 12) - timedelta(days=1)

    dados = api_dono.post(CANCELAR).json()

    assert provedor.devolvidas == []
    assert dados["acesso_ate"] == ultimo_dia.isoformat()
    assert dados["faturas"][0]["situacao"] == SituacaoDaFatura.PAGA


@pytest.mark.django_db
def test_cancelar_o_mensal_nunca_devolve_o_mes_pago(
    api_dono: APIClient, tenant: Tenant, provedor: ProvedorFalso
) -> None:
    assinar(api_dono)
    vencimento = terminar_o_teste(tenant, dias_atras=1)
    pagar(tenant, vencimento=vencimento, paga_em=vencimento, forma=FormaDeCobranca.PIX)

    dados = api_dono.post(CANCELAR).json()

    assert provedor.devolvidas == []
    assert dados["acesso_ate"] == (somar_meses(vencimento, 1) - timedelta(days=1)).isoformat()


@pytest.mark.django_db
def test_devolucao_feita_nao_se_repete_quando_o_cancelamento_falha(
    api_dono: APIClient, tenant: Tenant, provedor: ProvedorFalso
) -> None:
    assinar(api_dono, plano="solo", ciclo="anual")
    vencimento = terminar_o_teste(tenant, dias_atras=3)
    pagar(tenant, vencimento=vencimento, paga_em=vencimento, forma=FormaDeCobranca.PIX)
    provedor.falhar_em = "cancelar_assinatura"

    assert api_dono.post(CANCELAR).status_code == 502
    assert assinatura_do(tenant).contratada

    provedor.falhar_em = None
    dados = api_dono.post(CANCELAR).json()

    assert provedor.devolvidas == ["pay_sub_1"]
    assert dados["situacao"] == SituacaoDaAssinatura.CANCELADA
    assert dados["acesso_ate"] == hoje_no_bancada().isoformat()


@pytest.mark.django_db
def test_cancelar_sem_assinatura_e_recusado(api_dono: APIClient, provedor: ProvedorFalso) -> None:
    assert api_dono.post(CANCELAR).status_code == 409
    assert provedor.canceladas == []


@pytest.mark.django_db
def test_assinar_de_novo_depois_de_cancelar_reaproveita_o_cliente(
    api_dono: APIClient, tenant: Tenant, provedor: ProvedorFalso
) -> None:
    api_dono.post(ASSINAR, PEDIDO, format="json")
    api_dono.post(CANCELAR)

    resposta = api_dono.post(ASSINAR, {**PEDIDO, "ciclo": "anual"}, format="json")

    assert resposta.status_code == 201
    assert len(provedor.clientes) == 1
    assert assinatura_do(tenant).assinatura_no_provedor == "sub_2"
    assert resposta.json()["situacao"] == SituacaoDaAssinatura.ATIVA
    assert resposta.json()["valor"] == "599.00"


@pytest.mark.django_db
def test_assinar_marca_o_passo_nos_primeiros_passos(
    api_dono: APIClient, provedor: ProvedorFalso
) -> None:
    def passo_de_assinar() -> bool:
        passos = api_dono.get("/api/orientacao/primeiros-passos/").json()["passos"]
        return next(passo["feito"] for passo in passos if passo["chave"] == "assinar")

    assert passo_de_assinar() is False
    api_dono.post(ASSINAR, PEDIDO, format="json")
    assert passo_de_assinar() is True
