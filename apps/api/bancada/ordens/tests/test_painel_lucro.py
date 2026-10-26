from datetime import date, timedelta
from decimal import Decimal
from typing import Any

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from bancada.clientes.models import Aparelho, Cliente
from bancada.estoque.models import ItemDaVenda, PagamentoDaVenda, Produto, Venda
from bancada.financeiro.models import ContaAPagar
from bancada.ordens.estados import StatusOS
from bancada.ordens.models import Cobranca, ItemOrcamento, OrdemServico, Recebimento
from bancada.ordens.tests.test_painel import abrir, levar_ate, painel, recuar
from bancada.tenants.models import Loja, Tenant


def entregar(
    ordem: OrdemServico, itens: list[tuple[str, str, str | None]], cobrado: str, forma: str = "pix"
) -> OrdemServico:
    for tipo, valor, custo in itens:
        ItemOrcamento.objects.create(
            ordem=ordem,
            tipo=tipo,
            descricao=f"{tipo} de {valor}",
            valor=Decimal(valor),
            custo=None if custo is None else Decimal(custo),
        )
    levar_ate(ordem, StatusOS.PRONTO)
    ordem.transicionar(
        StatusOS.ENTREGUE,
        cobranca=Cobranca(
            valor_cobrado=Decimal(cobrado),
            recebimentos=(Recebimento(forma=forma, valor=Decimal(cobrado)),),
        ),
    )
    return ordem


def vender(loja: Loja, numero: int, quantidade: int, preco: str, custo: str) -> Venda:
    produto = Produto.objects.create(
        tenant_id=loja.tenant_id,
        nome=f"Película {numero}",
        tipo="acessorio",
        custo=Decimal(custo),
        preco=Decimal(preco),
    )
    total = Decimal(preco) * quantidade
    venda = Venda.objects.create(
        tenant_id=loja.tenant_id, numero=numero, loja=loja, total=total, valor_cobrado=total
    )
    ItemDaVenda.objects.create(
        tenant_id=loja.tenant_id,
        venda=venda,
        produto=produto,
        descricao=produto.nome,
        quantidade=quantidade,
        preco=Decimal(preco),
        custo=Decimal(custo),
    )
    PagamentoDaVenda.objects.create(
        tenant_id=loja.tenant_id, venda=venda, forma="dinheiro", valor=total
    )
    return venda


def paga(
    tenant: Tenant,
    categoria: str,
    valor: str,
    paga_em: date | None = None,
    loja: Loja | None = None,
) -> ContaAPagar:
    dia = paga_em or timezone.localdate()
    return ContaAPagar.objects.create(
        tenant=tenant,
        descricao=categoria,
        categoria=categoria,
        valor=Decimal(valor),
        vencimento=dia,
        paga_em=dia,
        forma="pix",
        loja=loja,
    )


def lucro(api: APIClient, **parametros: str) -> Any:
    return painel(api, **parametros)["dinheiro"]["lucro"]


@pytest.mark.django_db
def test_lucro_e_o_recebido_menos_as_pecas_e_as_contas_pagas(
    api_dono: APIClient, tenant: Tenant, loja: Loja, ordem: OrdemServico
) -> None:
    entregar(ordem, [("peca", "300.00", "120.00"), ("servico", "100.00", None)], cobrado="400.00")
    vender(loja, 1, quantidade=2, preco="40.00", custo="15.00")
    paga(tenant, "aluguel", "200.00")
    paga(tenant, "contas_da_loja", "50.00")
    paga(tenant, "compras", "500.00")
    ContaAPagar.objects.create(
        tenant=tenant,
        descricao="Luz que ainda não foi paga",
        categoria="contas_da_loja",
        valor=Decimal("90.00"),
        vencimento=timezone.localdate(),
    )

    atual = lucro(api_dono)["atual"]

    assert (atual["recebido"], atual["custo_das_pecas"], atual["despesas"]) == (
        "480.00",
        "150.00",
        "250.00",
    )
    assert atual["lucro"] == "80.00"
    assert atual["pecas_sem_custo"] == 0
    assert atual["despesas_por_categoria"] == [
        {"categoria": "aluguel", "rotulo": "Aluguel e condomínio", "valor": "200.00"},
        {
            "categoria": "contas_da_loja",
            "rotulo": "Luz, água, internet e telefone",
            "valor": "50.00",
        },
    ]


@pytest.mark.django_db
def test_avisa_as_pecas_sem_custo_e_ignora_o_que_nao_foi_aprovado(
    api_dono: APIClient, tenant: Tenant, loja: Loja, cliente: Cliente, aparelho: Aparelho
) -> None:
    entregar(
        abrir(tenant, loja, cliente, aparelho),
        [("peca", "200.00", None), ("servico", "80.00", None)],
        cobrado="280.00",
    )
    recusada = abrir(tenant, loja, cliente, aparelho)
    ItemOrcamento.objects.create(
        ordem=recusada, descricao="Tela", valor=Decimal("500"), custo=Decimal("300")
    )
    levar_ate(recusada, StatusOS.ORCAMENTO_ENVIADO)
    recusada.transicionar(StatusOS.REPROVADO)

    atual = lucro(api_dono)["atual"]

    assert (atual["custo_das_pecas"], atual["pecas_sem_custo"]) == ("0.00", 1)
    assert atual["lucro"] == "280.00"


@pytest.mark.django_db
def test_venda_desfeita_nao_entra_no_lucro(api_dono: APIClient, loja: Loja) -> None:
    venda = vender(loja, 1, quantidade=1, preco="60.00", custo="20.00")
    Venda.objects.filter(pk=venda.pk).update(desfeita_em=timezone.now())

    atual = lucro(api_dono)["atual"]

    assert (atual["recebido"], atual["custo_das_pecas"], atual["lucro"]) == (
        "0.00",
        "0.00",
        "0.00",
    )


@pytest.mark.django_db
def test_lucro_segue_o_periodo_e_compara_com_o_anterior(
    api_dono: APIClient, tenant: Tenant, loja: Loja, cliente: Cliente, aparelho: Aparelho
) -> None:
    entregar(abrir(tenant, loja, cliente, aparelho), [("servico", "300.00", None)], "300.00")
    antiga = entregar(
        abrir(tenant, loja, cliente, aparelho), [("peca", "100.00", "40.00")], "100.00"
    )
    recuar(antiga, 10)
    paga(tenant, "aluguel", "500.00", paga_em=timezone.localdate() - timedelta(days=9))

    resposta = lucro(api_dono, periodo="7dias")

    assert resposta["atual"]["lucro"] == "300.00"
    assert (resposta["anterior"]["custo_das_pecas"], resposta["anterior"]["lucro"]) == (
        "40.00",
        "-440.00",
    )


@pytest.mark.django_db
def test_mes_a_mes_mostra_os_ultimos_seis_meses_ate_hoje(
    api_dono: APIClient, tenant: Tenant, loja: Loja, cliente: Cliente, aparelho: Aparelho
) -> None:
    hoje = timezone.localdate()
    entregar(abrir(tenant, loja, cliente, aparelho), [("servico", "250.00", None)], "250.00")
    ha_dois_meses = (hoje.replace(day=1) - timedelta(days=40)).replace(day=10)
    paga(tenant, "salarios", "900.00", paga_em=ha_dois_meses)
    paga(tenant, "aluguel", "700.00", paga_em=hoje.replace(day=1) - timedelta(days=200))

    resposta = lucro(api_dono)
    meses = resposta["meses"]

    assert len(meses) == 6
    este_mes = meses[-1]
    assert (este_mes["mes"], este_mes["recebido"], este_mes["lucro"]) == (
        f"{hoje:%Y-%m}",
        resposta["atual"]["recebido"],
        resposta["atual"]["lucro"],
    )
    do_salario = next(mes for mes in meses if mes["mes"] == f"{ha_dois_meses:%Y-%m}")
    assert (do_salario["despesas"], do_salario["lucro"]) == ("900.00", "-900.00")
    assert sum(Decimal(mes["despesas"]) for mes in meses) == Decimal("900.00")


@pytest.mark.django_db
def test_painel_de_uma_loja_conta_so_as_contas_dela(
    api_dono: APIClient, tenant: Tenant, loja: Loja
) -> None:
    shopping = Loja.objects.create(tenant=tenant, nome="Shopping")
    paga(tenant, "aluguel", "1000.00", loja=loja)
    paga(tenant, "aluguel", "800.00", loja=shopping)
    paga(tenant, "servicos", "300.00")

    assert lucro(api_dono)["atual"]["despesas"] == "2100.00"
    assert lucro(api_dono, loja=str(shopping.pk))["atual"]["despesas"] == "800.00"
    assert lucro(api_dono, loja=str(shopping.pk))["meses"][-1]["despesas"] == "800.00"
