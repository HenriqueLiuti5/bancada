from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Any

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from bancada.auditoria.models import Acao, RegistroDeAuditoria
from bancada.core.rls import aplicar_tenant
from bancada.estoque.models import PagamentoDaVenda, Venda
from bancada.financeiro.models import ConferenciaDoCaixa, ContaAPagar, MovimentoDoCaixa
from bancada.financeiro.tests.conftest import api_de, daqui_a
from bancada.ordens.models import OrdemServico, Pagamento
from bancada.tenants.models import Loja, Tenant, Usuario


def ha(dias: int) -> datetime:
    return timezone.now() - timedelta(days=dias)


def pago_na_ordem(ordem: OrdemServico, valor: str, forma: str = "dinheiro", dias: int = 0) -> Any:
    pagamento = Pagamento.objects.create(ordem=ordem, forma=forma, valor=Decimal(valor))
    if dias:
        Pagamento.objects.filter(pk=pagamento.pk).update(recebido_em=ha(dias))
    return pagamento


def vendido(loja: Loja, numero: int, valor: str, forma: str = "dinheiro", dias: int = 0) -> Venda:
    venda = Venda.objects.create(
        tenant_id=loja.tenant_id,
        numero=numero,
        loja=loja,
        total=Decimal(valor),
        valor_cobrado=Decimal(valor),
    )
    PagamentoDaVenda.objects.create(
        tenant_id=loja.tenant_id, venda=venda, forma=forma, valor=Decimal(valor)
    )
    if dias:
        Venda.objects.filter(pk=venda.pk).update(criado_em=ha(dias))
    return venda


def conta_paga(
    tenant: Tenant, descricao: str, valor: str, forma: str = "dinheiro", loja: Loja | None = None
) -> ContaAPagar:
    return ContaAPagar.objects.create(
        tenant=tenant,
        descricao=descricao,
        categoria="transporte",
        valor=Decimal(valor),
        vencimento=daqui_a(0),
        paga_em=daqui_a(0),
        forma=forma,
        loja=loja,
    )


def contada(
    loja: Loja, dia: date, contado: str, na_gaveta: str | None = None, no_dia: str = "0.00"
) -> ConferenciaDoCaixa:
    return ConferenciaDoCaixa.objects.create(
        tenant_id=loja.tenant_id,
        loja=loja,
        dia=dia,
        contado=Decimal(contado),
        na_gaveta=Decimal(na_gaveta or contado),
        esperado=Decimal(contado),
        movimento_do_dia=Decimal(no_dia),
    )


def conferir(api: APIClient, loja: Loja, contado: str, retirado: str = "0") -> Any:
    return api.post(
        "/api/caixa/conferencias/",
        {"loja": loja.pk, "contado": contado, "retirado": retirado},
        format="json",
    )


def movimentar(api: APIClient, loja: Loja, tipo: str, valor: str, motivo: str = "") -> Any:
    return api.post(
        "/api/caixa/movimentos/",
        {"loja": loja.pk, "tipo": tipo, "valor": valor, "motivo": motivo},
        format="json",
    )


def resumo(api: APIClient, loja: Loja, dia: date | None = None) -> Any:
    parametros = {"loja": str(loja.pk)}
    if dia is not None:
        parametros["dia"] = dia.isoformat()
    resposta = api.get("/api/caixa/", parametros)
    assert resposta.status_code == 200, resposta.json()
    return resposta.json()


@pytest.fixture
def carla(atendente_do_tenant: Usuario) -> Usuario:
    atendente_do_tenant.first_name = "Carla"
    atendente_do_tenant.save()
    return atendente_do_tenant


@pytest.mark.django_db
def test_toda_a_equipe_registra_retirada_e_reforco_e_so_o_dono_remove(
    api_atendente: APIClient,
    carla: Usuario,
    api_tecnico: APIClient,
    api_dono: APIClient,
    loja: Loja,
) -> None:
    retirada = movimentar(api_atendente, loja, "retirada", "50.00", "Depósito no banco")
    reforco = movimentar(api_tecnico, loja, "reforco", "20")

    assert retirada.status_code == 201
    assert retirada.json()["tipo_rotulo"] == "Retirada"
    assert retirada.json()["registrado_por"] == "Carla"
    assert reforco.status_code == 201
    caminho = f"/api/caixa/movimentos/{retirada.json()['id']}/"
    assert api_atendente.delete(caminho).status_code == 403
    assert api_dono.delete(caminho).status_code == 204
    assert MovimentoDoCaixa.objects.count() == 1

    registro = RegistroDeAuditoria.objects.get(acao=Acao.MOVIMENTO_DO_CAIXA_REMOVIDO)
    assert registro.detalhe.startswith("Retirada de R$ 50,00 em Matriz, ")


@pytest.mark.django_db
def test_retirada_e_reforco_recusam_o_que_nao_faz_sentido(
    api_tecnico: APIClient, loja: Loja, outro_tenant: Tenant
) -> None:
    de_fora = Loja.objects.create(tenant=outro_tenant, nome="Loja de fora")
    fechada = Loja.objects.create(tenant=loja.tenant, nome="Fechada", ativa=False)

    assert movimentar(api_tecnico, loja, "retirada", "0").json() == {
        "valor": ["O valor precisa ser maior que zero."]
    }
    assert movimentar(api_tecnico, loja, "sangria", "10").json() == {
        "tipo": ["Escolha retirada ou reforço."]
    }
    assert movimentar(api_tecnico, de_fora, "retirada", "10").status_code == 400
    assert movimentar(api_tecnico, fechada, "retirada", "10").json() == {
        "loja": ["Esta loja foi desativada."]
    }
    assert not MovimentoDoCaixa.objects.exists()


@pytest.mark.django_db
def test_a_primeira_conferencia_da_loja_e_o_ponto_de_partida(
    api_dono: APIClient, loja: Loja
) -> None:
    resposta = conferir(api_dono, loja, "100.00")

    assert resposta.status_code == 201
    conferencia = resposta.json()
    assert conferencia["dia"] == daqui_a(0).isoformat()
    assert (conferencia["contado"], conferencia["na_gaveta"]) == ("100.00", "100.00")
    assert (conferencia["esperado"], conferencia["diferenca"]) == (None, None)


@pytest.mark.django_db
def test_a_equipe_conta_sem_ver_quanto_devia_ter(
    api_dono: APIClient,
    api_atendente: APIClient,
    api_tecnico: APIClient,
    loja: Loja,
    ordem: OrdemServico,
) -> None:
    conferir(api_dono, loja, "100.00")
    pago_na_ordem(ordem, "50.00")
    movimentar(api_tecnico, loja, "reforco", "10.00", "Troco")

    pela_atendente = conferir(api_atendente, loja, "155.00", retirado="55.00")

    assert pela_atendente.status_code == 201
    assert "esperado" not in pela_atendente.json()
    assert "diferenca" not in pela_atendente.json()
    assert pela_atendente.json()["na_gaveta"] == "100.00"
    for api in [api_atendente, api_tecnico]:
        assert api.get("/api/caixa/", {"loja": loja.pk}).status_code == 403
        assert api.get("/api/caixa/conferencias/").status_code == 403

    hoje = api_atendente.get("/api/caixa/hoje/", {"loja": loja.pk}).json()
    assert [movimento["motivo"] for movimento in hoje["movimentos"]] == ["Troco"]
    assert [conferencia["contado"] for conferencia in hoje["conferencias"]] == [
        "100.00",
        "155.00",
    ]
    assert all("esperado" not in conferencia for conferencia in hoje["conferencias"])

    vista_pelo_dono = resumo(api_dono, loja)["conferencias"][-1]
    assert (vista_pelo_dono["esperado"], vista_pelo_dono["diferenca"]) == ("160.00", "-5.00")


@pytest.mark.django_db
def test_o_esperado_conta_so_o_dinheiro_que_entrou_e_saiu_depois_da_contagem(
    api_dono: APIClient, tenant: Tenant, loja: Loja, ordem: OrdemServico
) -> None:
    desfeita_hoje = vendido(loja, 1, "20.00", dias=1)
    conferir(api_dono, loja, "100.00")

    pago_na_ordem(ordem, "80.00")
    pago_na_ordem(ordem, "300.00", forma="pix")
    vendido(loja, 2, "30.00")
    vendido(loja, 3, "50.00", forma="credito")
    conta_paga(tenant, "Motoboy", "15.00")
    conta_paga(tenant, "Fornecedor", "200.00", forma="pix")
    movimentar(api_dono, loja, "retirada", "40.00")
    movimentar(api_dono, loja, "reforco", "10.00")
    desfeita_hoje.desfazer()

    conferencia = conferir(api_dono, loja, "145.00").json()

    assert (conferencia["esperado"], conferencia["diferenca"]) == ("145.00", "0.00")


@pytest.mark.django_db
def test_recontar_no_mesmo_dia_parte_da_contagem_anterior(
    api_dono: APIClient, loja: Loja, ordem: OrdemServico
) -> None:
    conferir(api_dono, loja, "100.00")
    pago_na_ordem(ordem, "50.00")
    no_fechamento = conferir(api_dono, loja, "150.00", retirado="120.00").json()
    pago_na_ordem(ordem, "10.00")

    recontagem = conferir(api_dono, loja, "38.00").json()

    assert (no_fechamento["esperado"], no_fechamento["diferenca"]) == ("150.00", "0.00")
    assert no_fechamento["retirado"] == "120.00"
    assert (recontagem["esperado"], recontagem["diferenca"]) == ("40.00", "-2.00")


@pytest.mark.django_db
def test_o_dinheiro_que_entra_depois_da_conferencia_fica_para_o_dia_seguinte(
    api_dono: APIClient, loja: Loja, ordem: OrdemServico
) -> None:
    contada(loja, daqui_a(-1), "200.00", na_gaveta="100.00")
    pago_na_ordem(ordem, "25.00", dias=1)

    ontem = resumo(api_dono, loja, daqui_a(-1))["gaveta"]
    hoje = resumo(api_dono, loja)["gaveta"]

    assert (ontem["depois_da_conferencia"], ontem["deve_ter"]) == ("25.00", "125.00")
    assert (hoje["comeco"], hoje["deve_ter"]) == ("125.00", "125.00")


@pytest.mark.django_db
def test_os_dias_sem_conferencia_somam_no_comeco_do_dia(
    api_dono: APIClient, loja: Loja, ordem: OrdemServico
) -> None:
    contada(loja, daqui_a(-3), "50.00")
    pago_na_ordem(ordem, "10.00", dias=2)
    pago_na_ordem(ordem, "5.00", dias=1)
    movimentar(api_dono, loja, "retirada", "20.00")

    anteontem = resumo(api_dono, loja, daqui_a(-2))["gaveta"]
    hoje = resumo(api_dono, loja)["gaveta"]

    assert (anteontem["comeco"], anteontem["deve_ter"]) == ("50.00", "60.00")
    assert (hoje["comeco"], hoje["retiradas"], hoje["deve_ter"]) == ("65.00", "20.00", "45.00")
    assert resumo(api_dono, loja, daqui_a(-4))["gaveta"]["comeco"] is None


@pytest.mark.django_db
def test_cada_loja_tem_a_sua_gaveta(
    api_dono: APIClient, tenant: Tenant, loja: Loja, shopping: Loja, ordem: OrdemServico
) -> None:
    Loja.objects.filter(pk=loja.pk).update(criado_em=ha(60))
    Loja.objects.filter(pk=shopping.pk).update(criado_em=ha(30))
    conferir(api_dono, loja, "100.00")
    conferir(api_dono, shopping, "100.00")
    pago_na_ordem(ordem, "40.00")
    conta_paga(tenant, "Contador", "300.00")
    conta_paga(tenant, "Lanche", "12.00", loja=shopping)
    movimentar(api_dono, shopping, "reforco", "5.00")

    assert resumo(api_dono, loja)["gaveta"]["deve_ter"] == "140.00"
    assert resumo(api_dono, shopping)["gaveta"]["deve_ter"] == "93.00"


@pytest.mark.django_db
def test_com_uma_loja_so_a_conta_de_toda_a_assistencia_sai_da_gaveta(
    api_dono: APIClient, tenant: Tenant, loja: Loja
) -> None:
    conferir(api_dono, loja, "100.00")
    conta_paga(tenant, "Motoboy", "15.00")

    assert resumo(api_dono, loja)["gaveta"]["deve_ter"] == "85.00"


@pytest.mark.django_db
def test_a_loja_nova_nao_muda_o_que_ja_foi_conferido(
    api_dono: APIClient, tenant: Tenant, loja: Loja
) -> None:
    conferir(api_dono, loja, "100.00")
    conta_paga(tenant, "Motoboy", "15.00")
    assert conferir(api_dono, loja, "85.00").json()["diferenca"] == "0.00"

    Loja.objects.create(tenant=tenant, nome="Shopping")

    gaveta = resumo(api_dono, loja)["gaveta"]
    assert (gaveta["saiu"], gaveta["depois_da_conferencia"], gaveta["deve_ter"]) == (
        "15.00",
        "0.00",
        "85.00",
    )


@pytest.mark.django_db
def test_resumo_mostra_cada_forma_e_cada_movimento_do_dia(
    api_dono: APIClient, dono: Usuario, tenant: Tenant, loja: Loja, ordem: OrdemServico
) -> None:
    pago_na_ordem(ordem, "80.00")
    pago_na_ordem(ordem, "120.00", forma="pix")
    vendido(loja, 7, "30.00", forma="debito")
    conta_paga(tenant, "Motoboy", "15.00")
    conta_paga(tenant, "Boleto da internet", "99.90", forma="boleto")
    movimentar(api_dono, loja, "retirada", "40.00", "Depósito no banco")

    corpo = resumo(api_dono, loja)

    assert corpo["dia"] == daqui_a(0).isoformat()
    assert {linha["forma"]: (linha["entrou"], linha["saiu"]) for linha in corpo["por_forma"]} == {
        "pix": ("120.00", "0.00"),
        "dinheiro": ("80.00", "15.00"),
        "debito": ("30.00", "0.00"),
        "credito": ("0.00", "0.00"),
        "boleto": ("0.00", "99.90"),
    }
    assert corpo["gaveta"] == {
        "comeco": None,
        "entrou": "80.00",
        "saiu": "15.00",
        "retiradas": "40.00",
        "reforcos": "0.00",
        "depois_da_conferencia": None,
        "deve_ter": None,
    }
    assert [
        (movimento["tipo"], movimento["descricao"], movimento["forma_rotulo"], movimento["valor"])
        for movimento in corpo["movimentos"]
    ] == [
        ("ordem", f"OS #{ordem.numero} · Maria Souza", "Dinheiro", "80.00"),
        ("ordem", f"OS #{ordem.numero} · Maria Souza", "PIX", "120.00"),
        ("venda", "Venda #7", "Débito", "30.00"),
        ("retirada", "Depósito no banco", "Dinheiro", "-40.00"),
        ("conta", "Motoboy", "Dinheiro", "-15.00"),
        ("conta", "Boleto da internet", "Boleto", "-99.90"),
    ]
    assert corpo["movimentos"][3]["usuario"] == dono.nome_de_exibicao
    assert corpo["movimentos"][-1]["momento"] is None


@pytest.mark.django_db
def test_o_dono_ve_as_conferencias_de_cada_loja_da_mais_recente_para_a_mais_antiga(
    api_dono: APIClient, loja: Loja, shopping: Loja
) -> None:
    contada(loja, daqui_a(-2), "80.00")
    contada(loja, daqui_a(-1), "90.00")
    contada(shopping, daqui_a(-1), "70.00")

    resposta = api_dono.get("/api/caixa/conferencias/", {"loja": loja.pk})

    assert [linha["contado"] for linha in resposta.json()["results"]] == ["90.00", "80.00"]


@pytest.mark.django_db
def test_a_conferencia_recusa_valores_impossiveis(api_tecnico: APIClient, loja: Loja) -> None:
    assert conferir(api_tecnico, loja, "-1").json() == {
        "contado": ["O valor não pode ser negativo."]
    }
    assert conferir(api_tecnico, loja, "50.00", retirado="60.00").json() == {
        "retirado": ["Não dá para tirar mais do que tem na gaveta."]
    }
    assert api_tecnico.post(
        "/api/caixa/conferencias/", {"loja": loja.pk}, format="json"
    ).json() == {"contado": ["Informe quanto dinheiro tem na gaveta."]}
    assert not ConferenciaDoCaixa.objects.exists()


@pytest.mark.django_db
def test_o_caixa_de_um_dia_que_nao_chegou_e_recusado(api_dono: APIClient, loja: Loja) -> None:
    resposta = api_dono.get("/api/caixa/", {"loja": str(loja.pk), "dia": daqui_a(1).isoformat()})

    assert resposta.json() == {"dia": ["O caixa de um dia que ainda não chegou está vazio."]}
    assert api_dono.get("/api/caixa/").json() == {"loja": ["Escolha a loja."]}


@pytest.mark.django_db
def test_o_painel_mostra_a_ultima_conferencia_de_cada_loja(
    api_dono: APIClient, loja: Loja, shopping: Loja
) -> None:
    primeira = contada(loja, daqui_a(-2), "100.00")
    ConferenciaDoCaixa.objects.filter(pk=primeira.pk).update(esperado=None)
    faltou = contada(loja, daqui_a(-1), "95.00")
    ConferenciaDoCaixa.objects.filter(pk=faltou.pk).update(esperado=Decimal("100.00"))

    caixa = api_dono.get("/api/ordens/painel/").json()["dinheiro"]["caixa"]
    so_do_shopping = api_dono.get("/api/ordens/painel/", {"loja": shopping.pk}).json()

    assert [(linha["loja_nome"], linha["diferenca"]) for linha in caixa] == [
        ("Matriz", "-5.00"),
        ("Shopping", None),
    ]
    assert caixa[0]["conferida_em"] is not None
    assert caixa[1]["conferida_em"] is None
    assert [linha["loja_nome"] for linha in so_do_shopping["dinheiro"]["caixa"]] == ["Shopping"]


@pytest.mark.django_db
def test_outra_assistencia_nao_ve_nem_mexe_no_caixa(
    api_dono: APIClient, dono_de_fora: Usuario, loja: Loja
) -> None:
    retirada = movimentar(api_dono, loja, "retirada", "10.00").json()
    conferir(api_dono, loja, "100.00")
    de_fora = api_de(dono_de_fora)

    assert de_fora.get("/api/caixa/", {"loja": loja.pk}).status_code == 400
    assert de_fora.get("/api/caixa/hoje/", {"loja": loja.pk}).status_code == 400
    assert movimentar(de_fora, loja, "reforco", "10.00").status_code == 400
    assert conferir(de_fora, loja, "1.00").status_code == 400
    assert de_fora.delete(f"/api/caixa/movimentos/{retirada['id']}/").status_code == 404
    assert de_fora.get("/api/caixa/conferencias/").json()["count"] == 0

    # O último pedido deixou a trava do banco na outra assistência.
    aplicar_tenant(None)
    assert MovimentoDoCaixa.objects.count() == 1
    assert ConferenciaDoCaixa.objects.count() == 1
