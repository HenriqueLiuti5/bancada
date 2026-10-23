from decimal import Decimal
from typing import Any

import pytest
from rest_framework.test import APIClient

from bancada.auditoria.models import Acao, RegistroDeAuditoria
from bancada.financeiro.models import ContaAPagar, PagamentoDaConta
from bancada.financeiro.tests.conftest import api_de, daqui_a, lancar
from bancada.tenants.models import Loja, Tenant, Usuario


def contas(api: APIClient, **parametros: Any) -> list[str]:
    resposta = api.get("/api/contas-a-pagar/", parametros)
    assert resposta.status_code == 200
    return [conta["descricao"] for conta in resposta.json()["results"]]


def conta_de(tenant: Tenant, descricao: str, vencimento: int, **campos: Any) -> ContaAPagar:
    return ContaAPagar.objects.create(
        tenant=tenant,
        descricao=descricao,
        categoria=campos.pop("categoria", "outras"),
        valor=campos.pop("valor", Decimal("100.00")),
        vencimento=daqui_a(vencimento),
        **campos,
    )


@pytest.mark.django_db
def test_qualquer_pessoa_da_equipe_lanca_a_conta_que_chegou(
    api_atendente: APIClient, atendente_do_tenant: Usuario
) -> None:
    atendente_do_tenant.first_name = "Carla"
    atendente_do_tenant.save()

    resposta = lancar(
        api_atendente,
        descricao="Conta de luz de outubro",
        fornecedor="Copel",
        observacao="Chegou pelo correio",
    )

    assert resposta.status_code == 201
    conta = resposta.json()
    assert conta["descricao"] == "Conta de luz de outubro"
    assert conta["categoria_rotulo"] == "Luz, água, internet e telefone"
    assert conta["valor"] == "250.00"
    assert conta["vencimento"] == daqui_a(5).isoformat()
    assert conta["fornecedor"] == "Copel"
    assert conta["lancada_por"] == "Carla"
    assert (conta["paga"], conta["repete"], conta["loja"]) == (False, False, None)


@pytest.mark.django_db
def test_so_o_dono_ve_a_lista_os_totais_e_mexe_nas_contas(
    api_dono: APIClient, api_tecnico: APIClient, api_atendente: APIClient, tenant: Tenant
) -> None:
    conta = conta_de(tenant, "Aluguel", 3)
    caminho = f"/api/contas-a-pagar/{conta.pk}/"

    for api in [api_tecnico, api_atendente]:
        assert api.get("/api/contas-a-pagar/").status_code == 403
        assert api.get("/api/contas-a-pagar/resumo/").status_code == 403
        assert api.get("/api/contas-a-pagar/fornecedores/").status_code == 403
        assert api.get(caminho).status_code == 403
        assert api.patch(caminho, {"valor": "1.00"}, format="json").status_code == 403
        assert api.post(f"{caminho}pagar/", {"forma": "pix"}, format="json").status_code == 403
        assert api.delete(caminho).status_code == 403

    assert api_dono.get(caminho).status_code == 200
    assert contas(api_dono) == ["Aluguel"]
    conta.refresh_from_db()
    assert (conta.valor, conta.paga) == (Decimal("100.00"), False)


@pytest.mark.django_db
def test_conta_paga_na_hora_guarda_a_data_a_forma_e_quem_pagou(
    api_atendente: APIClient, atendente_do_tenant: Usuario
) -> None:
    resposta = lancar(
        api_atendente,
        descricao="Motoboy",
        categoria="transporte",
        valor="15",
        vencimento=daqui_a(0).isoformat(),
        paga=True,
        forma="dinheiro",
    )

    assert resposta.status_code == 201
    conta = ContaAPagar.objects.get()
    assert conta.paga_em == daqui_a(0)
    assert conta.forma == "dinheiro"
    assert conta.paga_por == atendente_do_tenant


@pytest.mark.django_db
def test_conta_paga_precisa_da_forma_e_nao_pode_ser_paga_no_futuro(
    api_tecnico: APIClient,
) -> None:
    sem_forma = lancar(api_tecnico, paga=True)
    assert sem_forma.json() == {"forma": ["Escolha como a conta foi paga."]}

    no_futuro = lancar(api_tecnico, paga=True, forma="pix", paga_em=daqui_a(1).isoformat())
    assert no_futuro.json() == {"paga_em": ["A data do pagamento não pode ser depois de hoje."]}

    # Sem marcar como paga, a forma enviada por engano não vale.
    a_pagar = lancar(api_tecnico, forma="pix")
    assert a_pagar.status_code == 201
    assert (a_pagar.json()["paga"], a_pagar.json()["forma"]) == (False, "")


@pytest.mark.django_db
def test_conta_sem_o_basico_e_recusada_com_mensagens_simples(api_tecnico: APIClient) -> None:
    resposta = lancar(api_tecnico, descricao="  ", categoria="", valor="0", vencimento="")

    assert resposta.status_code == 400
    assert resposta.json() == {
        "descricao": ["Escreva o que é a conta."],
        "categoria": ["Escolha a categoria."],
        "valor": ["O valor precisa ser maior que zero."],
        "vencimento": ["Informe o vencimento."],
    }
    assert lancar(api_tecnico, valor="-10").json()["valor"] == [
        "O valor precisa ser maior que zero."
    ]
    assert lancar(api_tecnico, valor="dez").json()["valor"] == ["Escreva só o número, como 150,00."]
    assert not ContaAPagar.objects.exists()


@pytest.mark.django_db
def test_conta_vai_para_a_loja_escolhida_dessa_assistencia(
    api_dono: APIClient, shopping: Loja, outro_tenant: Tenant
) -> None:
    resposta = lancar(api_dono, loja=shopping.pk)
    assert resposta.json()["loja_nome"] == "Shopping"

    alheia = Loja.objects.create(tenant=outro_tenant, nome="Alheia")
    assert lancar(api_dono, loja=alheia.pk).json() == {"loja": ["Não pertence à sua assistência."]}

    shopping.ativa = False
    shopping.save()
    assert lancar(api_dono, loja=shopping.pk).json() == {
        "loja": ["Esta loja foi desativada. Escolha uma loja ativa."]
    }

    # A conta que já era da loja desativada continua com ela ao ser corrigida.
    corrigida = api_dono.patch(
        f"/api/contas-a-pagar/{resposta.json()['id']}/",
        {"loja": shopping.pk, "valor": "260.00"},
        format="json",
    )
    assert corrigida.status_code == 200
    assert corrigida.json()["valor"] == "260.00"


@pytest.mark.django_db
def test_so_o_dono_lanca_a_conta_que_se_repete(api_atendente: APIClient) -> None:
    resposta = lancar(api_atendente, repetir=True)

    assert resposta.json() == {"repetir": ["Só o dono lança contas que se repetem todo mês."]}
    assert not ContaAPagar.objects.exists()


@pytest.mark.django_db
def test_lista_separa_o_que_falta_pagar_o_que_venceu_e_o_que_foi_pago(
    api_dono: APIClient, tenant: Tenant
) -> None:
    conta_de(tenant, "Aluguel", 10, categoria="aluguel", fornecedor="Imobiliária Centro")
    conta_de(tenant, "Internet", -3, categoria="contas_da_loja")
    conta_de(tenant, "Contador", 0, categoria="servicos")
    conta_de(
        tenant,
        "Telas da distribuidora",
        -20,
        categoria="compras",
        paga_em=daqui_a(-1),
        forma="boleto",
    )
    conta_de(tenant, "Película", -30, categoria="compras", paga_em=daqui_a(-25), forma="pix")

    assert contas(api_dono) == ["Internet", "Contador", "Aluguel"]
    assert contas(api_dono, situacao="vencidas") == ["Internet"]
    assert contas(api_dono, situacao="pagas") == ["Telas da distribuidora", "Película"]
    assert contas(api_dono, situacao="pagas", categoria="compras", busca="tela") == [
        "Telas da distribuidora"
    ]
    assert contas(api_dono, busca="imobiliária") == ["Aluguel"]
    assert contas(api_dono, categoria="inventada") == ["Internet", "Contador", "Aluguel"]


@pytest.mark.django_db
def test_dono_paga_a_conta_com_o_valor_certo_e_pode_desfazer(
    api_dono: APIClient, dono: Usuario, tenant: Tenant
) -> None:
    conta = conta_de(tenant, "Conta de luz", 2, valor=Decimal("250.00"))
    caminho = f"/api/contas-a-pagar/{conta.pk}/"

    paga = api_dono.post(
        f"{caminho}pagar/",
        {"forma": "pix", "valor": "263.40", "paga_em": daqui_a(-1).isoformat()},
        format="json",
    )
    assert paga.status_code == 200
    assert paga.json()["paga"] is True
    assert paga.json()["valor"] == "263.40"
    assert paga.json()["paga_em"] == daqui_a(-1).isoformat()
    assert (paga.json()["forma_rotulo"], paga.json()["paga_por"]) == ("PIX", "Marcos")

    de_novo = api_dono.post(f"{caminho}pagar/", {"forma": "dinheiro"}, format="json")
    assert de_novo.status_code == 409
    assert de_novo.json()["detail"] == "Esta conta já foi paga."

    desfeito = api_dono.post(f"{caminho}desfazer-pagamento/")
    assert desfeito.status_code == 200
    assert (desfeito.json()["paga"], desfeito.json()["paga_em"]) == (False, None)
    assert desfeito.json()["valor"] == "263.40"

    sem_pagamento = api_dono.post(f"{caminho}desfazer-pagamento/")
    assert sem_pagamento.status_code == 409
    assert sem_pagamento.json()["detail"] == "Esta conta ainda não foi paga."

    hoje = api_dono.post(f"{caminho}pagar/", {"forma": "debito"}, format="json")
    assert hoje.json()["paga_em"] == daqui_a(0).isoformat()
    assert hoje.json()["valor"] == "263.40"


@pytest.mark.django_db
def test_pagamento_sem_forma_ou_no_futuro_e_recusado(api_dono: APIClient, tenant: Tenant) -> None:
    conta = conta_de(tenant, "Aluguel", 1)
    caminho = f"/api/contas-a-pagar/{conta.pk}/pagar/"

    assert api_dono.post(caminho, {}, format="json").json() == {
        "forma": ["Escolha como a conta foi paga."]
    }
    no_futuro = api_dono.post(
        caminho, {"forma": "pix", "paga_em": daqui_a(2).isoformat()}, format="json"
    )
    assert no_futuro.json() == {"paga_em": ["A data do pagamento não pode ser depois de hoje."]}
    conta.refresh_from_db()
    assert not conta.paga


@pytest.mark.django_db
def test_dono_corrige_a_conta(api_dono: APIClient, tenant: Tenant) -> None:
    conta = conta_de(tenant, "Conta de luz", 2)

    resposta = api_dono.patch(
        f"/api/contas-a-pagar/{conta.pk}/",
        {
            "descricao": "Conta de água",
            "categoria": "contas_da_loja",
            "vencimento": daqui_a(4).isoformat(),
            "fornecedor": "Sanepar",
        },
        format="json",
    )

    assert resposta.status_code == 200
    assert resposta.json()["descricao"] == "Conta de água"
    assert resposta.json()["vencimento"] == daqui_a(4).isoformat()
    assert resposta.json()["fornecedor"] == "Sanepar"


@pytest.mark.django_db
def test_remover_a_conta_fica_na_auditoria(
    api_dono: APIClient, dono: Usuario, tenant: Tenant
) -> None:
    conta = conta_de(tenant, "Lançada duas vezes", 0, valor=Decimal("89.90"))

    resposta = api_dono.delete(f"/api/contas-a-pagar/{conta.pk}/")

    assert resposta.status_code == 204
    assert not ContaAPagar.objects.exists()
    registro = RegistroDeAuditoria.objects.get(acao=Acao.CONTA_REMOVIDA)
    assert (registro.usuario, registro.objeto, registro.objeto_id) == (
        dono,
        "conta_a_pagar",
        conta.pk,
    )
    assert registro.detalhe == (f"Lançada duas vezes, R$ 89,90, vencimento {daqui_a(0):%d/%m/%Y}")


@pytest.mark.django_db
def test_resumo_soma_o_que_venceu_o_que_vence_na_semana_e_o_que_foi_pago_no_mes(
    api_dono: APIClient, tenant: Tenant
) -> None:
    conta_de(tenant, "Internet", -1, valor=Decimal("120.00"))
    conta_de(tenant, "Contador", -15, valor=Decimal("300.00"))
    conta_de(tenant, "Luz", 0, valor=Decimal("250.00"))
    conta_de(tenant, "Água", 6, valor=Decimal("80.00"))
    conta_de(tenant, "Aluguel", 7, valor=Decimal("1500.00"))
    paga = conta_de(tenant, "Motoboy", 0, valor=Decimal("15.00"))
    paga.pagar(PagamentoDaConta(daqui_a(0), "dinheiro"))

    resposta = api_dono.get("/api/contas-a-pagar/resumo/")

    assert resposta.json() == {
        "vencidas": {"valor": "420.00", "contas": 2},
        "proximos_dias": {"valor": "330.00", "contas": 2},
        "pagas_no_mes": {"valor": "15.00", "contas": 1},
    }


@pytest.mark.django_db
def test_painel_avisa_o_dono_do_que_venceu_e_do_que_vence(
    api_dono: APIClient, api_tecnico: APIClient, tenant: Tenant, loja: Loja, shopping: Loja
) -> None:
    conta_de(tenant, "Internet", -2, valor=Decimal("120.00"), loja=loja)
    conta_de(tenant, "Aluguel do shopping", 3, valor=Decimal("2000.00"), loja=shopping)
    conta_de(tenant, "Contador", 30, valor=Decimal("300.00"))

    dinheiro = api_dono.get("/api/ordens/painel/").json()["dinheiro"]
    assert dinheiro["a_pagar"] == {
        "vencidas": {"valor": "120.00", "contas": 1},
        "proximos_dias": {"valor": "2000.00", "contas": 1},
    }

    so_do_shopping = api_dono.get("/api/ordens/painel/", {"loja": shopping.pk}).json()
    assert so_do_shopping["dinheiro"]["a_pagar"]["vencidas"] == {"valor": "0.00", "contas": 0}
    assert so_do_shopping["dinheiro"]["a_pagar"]["proximos_dias"]["contas"] == 1

    assert "dinheiro" not in api_tecnico.get("/api/ordens/painel/").json()


@pytest.mark.django_db
def test_fornecedores_ja_usados_aparecem_como_sugestao(api_dono: APIClient) -> None:
    for fornecedor in ["Copel", "Sanepar", "Copel", ""]:
        lancar(api_dono, fornecedor=fornecedor)

    assert api_dono.get("/api/contas-a-pagar/fornecedores/").json() == ["Copel", "Sanepar"]


@pytest.mark.django_db
def test_conta_de_outra_assistencia_nao_aparece(
    api_dono: APIClient, dono_de_fora: Usuario, tenant: Tenant
) -> None:
    conta = conta_de(tenant, "Aluguel", 3)
    api_de_fora = api_de(dono_de_fora)

    assert api_de_fora.get(f"/api/contas-a-pagar/{conta.pk}/").status_code == 404
    assert (
        api_de_fora.post(
            f"/api/contas-a-pagar/{conta.pk}/pagar/", {"forma": "pix"}, format="json"
        ).status_code
        == 404
    )
    assert api_de_fora.get("/api/contas-a-pagar/").json()["count"] == 0
    assert api_de_fora.get("/api/contas-a-pagar/resumo/").json()["vencidas"]["contas"] == 0
