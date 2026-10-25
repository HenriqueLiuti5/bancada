from datetime import date, datetime, time, timedelta
from decimal import Decimal
from typing import Any

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from bancada.clientes.models import Aparelho, Cliente
from bancada.financeiro.tests.conftest import api_de, daqui_a
from bancada.ordens.estados import StatusOS
from bancada.ordens.models import (
    Cobranca,
    FormaDePagamento,
    ItemOrcamento,
    OrdemServico,
    Pagamento,
    Recebimento,
    RegistroOS,
    TipoDeRegistro,
)
from bancada.tenants.models import Loja, Tenant, Usuario

CAMINHO_ATE_PRONTO = [
    StatusOS.EM_DIAGNOSTICO,
    StatusOS.ORCAMENTO_ENVIADO,
    StatusOS.APROVADO,
    StatusOS.EM_REPARO,
    StatusOS.PRONTO,
]


def pronta(
    tenant: Tenant, loja: Loja, nome: str = "Maria Souza", valor: str = "300.00"
) -> OrdemServico:
    cliente = Cliente.objects.create(tenant=tenant, nome=nome, telefone="11999990000")
    aparelho = Aparelho.objects.create(
        tenant=tenant, cliente=cliente, marca="Motorola", modelo="Moto Edge"
    )
    ordem = OrdemServico.abrir(
        tenant=tenant,
        loja=loja,
        cliente=cliente,
        aparelho=aparelho,
        problema_relatado="Não carrega",
    )
    ItemOrcamento.objects.create(ordem=ordem, descricao="Conector de carga", valor=valor)
    for status in CAMINHO_ATE_PRONTO:
        ordem.transicionar(status)
    return ordem


def entregar(api: APIClient, ordem: OrdemServico, **cobranca: Any) -> Any:
    return api.post(
        f"/api/ordens/{ordem.pk}/transicionar/",
        {"status": StatusOS.ENTREGUE, "cobranca": {"valor_cobrado": "300.00", **cobranca}},
        format="json",
    )


def combinar(api: APIClient, ordem: OrdemServico, data: object) -> Any:
    return api.post(
        f"/api/ordens/{ordem.pk}/pagamento-combinado/",
        {"pagamento_combinado_para": data},
        format="json",
    )


# Entrega pelo modelo, sem a conferência da API, para montar contas vencidas e entregas antigas.
def devendo(ordem: OrdemServico, *, pago: str, combinado: date | None) -> OrdemServico:
    pagamentos = (Recebimento(forma=FormaDePagamento.PIX, valor=Decimal(pago)),) if pago else ()
    ordem.transicionar(
        StatusOS.ENTREGUE,
        cobranca=Cobranca(
            valor_cobrado=ordem.total_aprovado,
            recebimentos=pagamentos,
            pagamento_combinado_para=combinado,
        ),
    )
    ontem = timezone.now() - timedelta(days=1)
    OrdemServico.objects.filter(pk=ordem.pk).update(entregue_em=ontem)
    Pagamento.objects.filter(ordem=ordem).update(recebido_em=ontem)
    return ordem


def registros(ordem: OrdemServico) -> list[tuple[str, str | None]]:
    return [
        (registro.texto, registro.usuario.first_name if registro.usuario else None)
        for registro in RegistroOS.objects.filter(
            ordem=ordem, tipo=TipoDeRegistro.PAGAMENTO_COMBINADO
        )
    ]


def lista(api: APIClient, **parametros: str) -> list[str]:
    resposta = api.get("/api/contas-a-receber/", parametros)
    assert resposta.status_code == 200
    return [linha["cliente_nome"] for linha in resposta.json()["results"]]


@pytest.fixture
def carla(atendente_do_tenant: Usuario) -> Usuario:
    atendente_do_tenant.first_name = "Carla"
    atendente_do_tenant.save()
    return atendente_do_tenant


@pytest.mark.django_db
def test_entrega_com_valor_faltando_pede_o_dia_combinado_com_o_cliente(
    api_atendente: APIClient, carla: Usuario, tenant: Tenant, loja: Loja
) -> None:
    ordem = pronta(tenant, loja)
    pagou_cem = {"pagamentos": [{"forma": "pix", "valor": "100.00"}]}

    sem_data = entregar(api_atendente, ordem, **pagou_cem)
    no_passado = entregar(
        api_atendente, ordem, **pagou_cem, pagamento_combinado_para=daqui_a(-1).isoformat()
    )
    escrita_errada = entregar(api_atendente, ordem, **pagou_cem, pagamento_combinado_para="sexta")

    assert sem_data.json() == {"cobranca": ["Informe quando o cliente vai pagar o que falta."]}
    assert no_passado.json() == {
        "cobranca": ["A data combinada para pagar não pode ser antes de hoje."]
    }
    assert escrita_errada.json() == {
        "cobranca": {
            "pagamento_combinado_para": ["Informe quando o cliente vai pagar o que falta."]
        }
    }
    ordem.refresh_from_db()
    assert ordem.status == StatusOS.PRONTO

    combinado = daqui_a(3)
    resposta = entregar(
        api_atendente, ordem, **pagou_cem, pagamento_combinado_para=combinado.isoformat()
    )

    assert resposta.status_code == 200
    assert resposta.json()["pagamento_combinado_para"] == combinado.isoformat()
    assert resposta.json()["saldo_a_receber"] == "200.00"
    assert registros(ordem) == [
        (f"Falta receber R$ 200,00, combinado para {combinado:%d/%m/%Y}.", "Carla")
    ]


@pytest.mark.django_db
def test_entrega_quitada_nao_guarda_o_dia_combinado(
    api_tecnico: APIClient, tenant: Tenant, loja: Loja
) -> None:
    ordem = pronta(tenant, loja)

    resposta = entregar(
        api_tecnico,
        ordem,
        pagamentos=[{"forma": "debito", "valor": "300.00"}],
        pagamento_combinado_para=daqui_a(3).isoformat(),
    )

    assert resposta.status_code == 200
    assert resposta.json()["pagamento_combinado_para"] is None
    assert registros(ordem) == []


@pytest.mark.django_db
def test_qualquer_pessoa_da_equipe_muda_o_dia_e_a_mudanca_fica_no_historico(
    api_atendente: APIClient, carla: Usuario, tenant: Tenant, loja: Loja
) -> None:
    ordem = devendo(pronta(tenant, loja), pago="100.00", combinado=daqui_a(2))
    novo = daqui_a(9)

    resposta = combinar(api_atendente, ordem, novo.isoformat())
    de_novo = combinar(api_atendente, ordem, novo.isoformat())

    assert resposta.status_code == 200
    assert resposta.json()["pagamento_combinado_para"] == novo.isoformat()
    assert de_novo.status_code == 200
    assert registros(ordem) == [
        (f"Falta receber R$ 200,00, combinado para {daqui_a(2):%d/%m/%Y}.", None),
        (
            f"O pagamento do que falta passou de {daqui_a(2):%d/%m/%Y} para {novo:%d/%m/%Y}.",
            "Carla",
        ),
    ]


@pytest.mark.django_db
def test_entrega_antiga_sem_data_ganha_o_primeiro_dia_combinado(
    api_tecnico: APIClient, tecnico: Usuario, tenant: Tenant, loja: Loja
) -> None:
    tecnico.first_name = "Joana"
    tecnico.save()
    ordem = devendo(pronta(tenant, loja), pago="", combinado=None)

    resposta = combinar(api_tecnico, ordem, daqui_a(0).isoformat())

    assert resposta.status_code == 200
    assert registros(ordem) == [
        (f"O pagamento do que falta ficou combinado para {daqui_a(0):%d/%m/%Y}.", "Joana")
    ]


@pytest.mark.django_db
def test_o_dia_novo_e_de_hoje_em_diante_e_so_para_quem_ainda_deve(
    api_tecnico: APIClient, tenant: Tenant, loja: Loja, ordem: OrdemServico
) -> None:
    devendo_ainda = devendo(pronta(tenant, loja), pago="100.00", combinado=daqui_a(2))
    quitada = devendo(pronta(tenant, loja, nome="Rui Lima"), pago="300.00", combinado=None)

    no_passado = combinar(api_tecnico, devendo_ainda, daqui_a(-1).isoformat())
    sem_data = combinar(api_tecnico, devendo_ainda, None)
    ainda_na_bancada = combinar(api_tecnico, ordem, daqui_a(1).isoformat())
    ja_quitada = combinar(api_tecnico, quitada, daqui_a(1).isoformat())

    assert no_passado.json() == {
        "pagamento_combinado_para": ["A data combinada para pagar não pode ser antes de hoje."]
    }
    assert sem_data.json() == {"pagamento_combinado_para": ["Informe a nova data."]}
    for resposta in [ainda_na_bancada, ja_quitada]:
        assert resposta.status_code == 409
        assert resposta.json() == {"detail": "Esta ordem não tem nada a receber."}
    devendo_ainda.refresh_from_db()
    assert devendo_ainda.pagamento_combinado_para == daqui_a(2)


@pytest.mark.django_db
def test_so_o_dono_ve_a_lista_e_os_totais_do_que_os_clientes_devem(
    api_dono: APIClient, api_tecnico: APIClient, api_atendente: APIClient
) -> None:
    for api in [api_tecnico, api_atendente]:
        assert api.get("/api/contas-a-receber/").status_code == 403
        assert api.get("/api/contas-a-receber/resumo/").status_code == 403

    assert api_dono.get("/api/contas-a-receber/").status_code == 200
    assert api_dono.get("/api/contas-a-receber/resumo/").status_code == 200


@pytest.mark.django_db
def test_contas_a_receber_comecam_pelo_que_vence_primeiro(
    api_dono: APIClient, tenant: Tenant, loja: Loja, ordem: OrdemServico
) -> None:
    devendo(pronta(tenant, loja, "Sem Data"), pago="", combinado=None)
    devendo(pronta(tenant, loja, "Daqui a Dez"), pago="", combinado=daqui_a(10))
    devendo(pronta(tenant, loja, "Vence Hoje"), pago="50.00", combinado=daqui_a(0))
    vencida = devendo(pronta(tenant, loja, "Venceu Ontem"), pago="100.00", combinado=daqui_a(-1))
    quitada = devendo(pronta(tenant, loja, "Pagou Depois"), pago="120.00", combinado=daqui_a(-3))
    quitada.receber(Recebimento(forma=FormaDePagamento.DINHEIRO, valor=Decimal("180.00")))
    devendo(pronta(tenant, loja, "Pagou na Entrega"), pago="300.00", combinado=None)

    assert lista(api_dono) == ["Venceu Ontem", "Vence Hoje", "Daqui a Dez", "Sem Data"]
    assert lista(api_dono, situacao="vencidas") == ["Venceu Ontem"]
    assert lista(api_dono, situacao="recebidas") == ["Pagou Depois"]
    assert lista(api_dono, busca="vence") == ["Venceu Ontem", "Vence Hoje"]
    assert lista(api_dono, busca=f"#{vencida.numero}") == ["Venceu Ontem"]

    linha = api_dono.get("/api/contas-a-receber/").json()["results"][0]
    valores = {chave: linha[chave] for chave in ["numero", "valor_cobrado", "valor_pago", "saldo"]}
    assert valores == {
        "numero": vencida.numero,
        "valor_cobrado": "300.00",
        "valor_pago": "100.00",
        "saldo": "200.00",
    }
    assert linha["pagamento_combinado_para"] == daqui_a(-1).isoformat()
    assert linha["aparelho_descricao"] == "Motorola Moto Edge"
    assert linha["quitada_em"] is None
    recebida = api_dono.get("/api/contas-a-receber/", {"situacao": "recebidas"}).json()
    assert recebida["results"][0]["quitada_em"] is not None
    assert recebida["results"][0]["saldo"] == "0.00"


@pytest.mark.django_db
def test_resumo_mostra_o_vencido_o_que_vence_na_semana_e_o_recebido_no_mes(
    api_dono: APIClient, tenant: Tenant, loja: Loja
) -> None:
    devendo(pronta(tenant, loja), pago="200.00", combinado=daqui_a(-4))
    devendo(pronta(tenant, loja), pago="250.00", combinado=daqui_a(6))
    devendo(pronta(tenant, loja), pago="230.00", combinado=daqui_a(7))
    devendo(pronta(tenant, loja), pago="300.00", combinado=None)

    neste_mes = devendo(pronta(tenant, loja), pago="220.00", combinado=daqui_a(1))
    neste_mes.receber(Recebimento(forma=FormaDePagamento.PIX, valor=Decimal("80.00")))

    no_mes_passado = devendo(pronta(tenant, loja), pago="210.00", combinado=None)
    pago = no_mes_passado.receber(Recebimento(forma=FormaDePagamento.PIX, valor=Decimal("90.00")))
    fim_do_mes_passado = timezone.localdate().replace(day=1) - timedelta(days=1)
    momento = timezone.make_aware(datetime.combine(fim_do_mes_passado, time(15)))
    entrega = momento - timedelta(days=2)
    OrdemServico.objects.filter(pk=no_mes_passado.pk).update(entregue_em=entrega)
    Pagamento.objects.filter(ordem=no_mes_passado).exclude(pk=pago.pk).update(recebido_em=entrega)
    Pagamento.objects.filter(pk=pago.pk).update(recebido_em=momento)

    assert api_dono.get("/api/contas-a-receber/resumo/").json() == {
        "vencidas": {"valor": "100.00", "ordens": 1},
        "proximos_dias": {"valor": "50.00", "ordens": 1},
        "recebido_no_mes": {"valor": "80.00", "ordens": 1},
    }


@pytest.mark.django_db
def test_outra_assistencia_nao_ve_o_que_os_clientes_devem(
    dono_de_fora: Usuario, tenant: Tenant, loja: Loja
) -> None:
    ordem = devendo(pronta(tenant, loja), pago="", combinado=daqui_a(-2))
    api = api_de(dono_de_fora)

    assert api.get("/api/contas-a-receber/").json()["count"] == 0
    assert api.get(f"/api/contas-a-receber/{ordem.pk}/").status_code == 404
    assert api.get("/api/contas-a-receber/resumo/").json()["vencidas"] == {
        "valor": "0.00",
        "ordens": 0,
    }
    assert combinar(api, ordem, daqui_a(1).isoformat()).status_code == 404
