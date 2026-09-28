from datetime import timedelta
from decimal import Decimal
from typing import Any

import pytest
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from bancada.clientes.models import Aparelho, Cliente
from bancada.ordens.estados import StatusOS
from bancada.ordens.models import (
    Cobranca,
    EventoOS,
    FormaDePagamento,
    ItemOrcamento,
    OrdemServico,
    Pagamento,
    Recebimento,
)
from bancada.tenants.models import Loja, Papel, Tenant, Usuario

CAMINHO = [
    StatusOS.EM_DIAGNOSTICO,
    StatusOS.ORCAMENTO_ENVIADO,
    StatusOS.APROVADO,
    StatusOS.EM_REPARO,
    StatusOS.PRONTO,
    StatusOS.ENTREGUE,
]


def abrir(
    tenant: Tenant,
    loja: Loja,
    cliente: Cliente,
    aparelho: Aparelho,
    problema: str = "Não liga",
) -> OrdemServico:
    return OrdemServico.abrir(
        tenant=tenant,
        loja=loja,
        cliente=cliente,
        aparelho=aparelho,
        problema_relatado=problema,
    )


def levar_ate(ordem: OrdemServico, destino: str) -> OrdemServico:
    for status in CAMINHO:
        ordem.transicionar(status)
        if status == destino:
            break
    return ordem


def entregar(
    ordem: OrdemServico,
    *,
    aprovado: str,
    cobrado: str,
    pagamentos: list[tuple[str, str]],
) -> OrdemServico:
    ItemOrcamento.objects.create(ordem=ordem, descricao="Reparo", valor=aprovado)
    levar_ate(ordem, StatusOS.PRONTO)
    ordem.transicionar(
        StatusOS.ENTREGUE,
        cobranca=Cobranca(
            valor_cobrado=Decimal(cobrado),
            recebimentos=tuple(
                Recebimento(forma=forma, valor=Decimal(valor)) for forma, valor in pagamentos
            ),
        ),
    )
    return ordem


def recuar(ordem: OrdemServico, dias: int) -> None:
    passado = timezone.now() - timedelta(days=dias)
    OrdemServico.objects.filter(pk=ordem.pk).update(criado_em=passado, entregue_em=passado)
    Pagamento.objects.filter(ordem=ordem).update(recebido_em=passado)
    EventoOS.objects.filter(ordem=ordem).update(criado_em=passado)


def painel(api: APIClient, **parametros: str) -> Any:
    return api.get("/api/ordens/painel/", parametros).json()


@pytest.mark.django_db
def test_painel_mostra_como_a_loja_esta_agora(
    api_tecnico: APIClient, tenant: Tenant, loja: Loja, cliente: Cliente, aparelho: Aparelho
) -> None:
    levar_ate(abrir(tenant, loja, cliente, aparelho), StatusOS.ORCAMENTO_ENVIADO)
    levar_ate(abrir(tenant, loja, cliente, aparelho), StatusOS.PRONTO)
    abrir(tenant, loja, cliente, aparelho)

    agora = painel(api_tecnico)["agora"]

    assert agora["abertas"] == 3
    assert agora["aguardando_cliente"] == 1
    assert agora["prontas"] == 1


@pytest.mark.django_db
def test_painel_conta_as_atrasadas_pela_data_prometida(
    api_tecnico: APIClient, ordem: OrdemServico
) -> None:
    OrdemServico.objects.filter(pk=ordem.pk).update(
        prometida_para=timezone.localdate() - timedelta(days=2)
    )

    assert painel(api_tecnico)["agora"]["atrasadas"] == 1


@pytest.mark.django_db
def test_ordem_entregue_sai_da_bancada_e_conta_como_entregue_no_periodo(
    api_tecnico: APIClient, ordem: OrdemServico
) -> None:
    OrdemServico.objects.filter(pk=ordem.pk).update(
        prometida_para=timezone.localdate() - timedelta(days=2)
    )
    levar_ate(ordem, StatusOS.ENTREGUE)

    corpo = painel(api_tecnico, periodo="hoje")

    assert corpo["agora"]["atrasadas"] == 0
    assert corpo["agora"]["abertas"] == 0
    assert corpo["operacao"]["entregues"] == {"atual": 1, "anterior": 0}
    assert corpo["operacao"]["abertas"] == {"atual": 1, "anterior": 0}


@pytest.mark.django_db
def test_painel_lista_todos_os_status_mesmo_os_vazios(
    api_tecnico: APIClient, ordem: OrdemServico
) -> None:
    por_status = painel(api_tecnico)["agora"]["por_status"]

    assert len(por_status) == len(StatusOS.choices)
    assert por_status[0] == {"status": "recebido", "rotulo": "Recebido", "total": 1}


@pytest.mark.django_db
def test_o_padrao_e_o_mes_comparado_com_o_mesmo_trecho_do_mes_anterior(
    api_tecnico: APIClient,
) -> None:
    hoje = timezone.localdate()

    periodo = painel(api_tecnico)["periodo"]

    assert periodo["chave"] == "mes"
    assert periodo["inicio"] == hoje.replace(day=1).isoformat()
    assert periodo["fim"] == hoje.isoformat()
    assert periodo["anterior"]["inicio"].endswith("-01")


@pytest.mark.django_db
def test_periodo_personalizado_usa_as_datas_escolhidas(api_tecnico: APIClient) -> None:
    periodo = painel(api_tecnico, periodo="personalizado", de="2026-03-01", ate="2026-03-10")[
        "periodo"
    ]

    assert periodo["inicio"] == "2026-03-01"
    assert periodo["fim"] == "2026-03-10"
    assert periodo["anterior"] == {"inicio": "2026-02-19", "fim": "2026-02-28"}


@pytest.mark.django_db
@pytest.mark.parametrize(
    ("parametros", "mensagem"),
    [
        ({"periodo": "personalizado"}, "Escolha a data inicial e a final."),
        (
            {"periodo": "personalizado", "de": "2026-03-10", "ate": "2026-03-01"},
            "A data inicial precisa vir antes da final.",
        ),
        (
            {"periodo": "personalizado", "de": "2024-01-01", "ate": "2026-01-01"},
            "Escolha um intervalo de até 366 dias.",
        ),
    ],
)
def test_periodo_personalizado_invalido_e_recusado(
    api_tecnico: APIClient, parametros: dict[str, str], mensagem: str
) -> None:
    resposta = api_tecnico.get("/api/ordens/painel/", parametros)

    assert resposta.status_code == 400
    assert resposta.json()["de"] == [mensagem]


@pytest.mark.django_db
def test_tecnico_nao_ve_dinheiro_nem_equipe(api_tecnico: APIClient, ordem: OrdemServico) -> None:
    corpo = painel(api_tecnico)

    assert "dinheiro" not in corpo
    assert "equipe" not in corpo
    assert "operacao" in corpo


@pytest.mark.django_db
def test_atendente_nao_ve_dinheiro_nem_equipe(
    atendente_do_tenant: Usuario, ordem: OrdemServico
) -> None:
    api = APIClient()
    token, _ = Token.objects.get_or_create(user=atendente_do_tenant)
    api.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

    corpo = painel(api)

    assert "dinheiro" not in corpo
    assert "equipe" not in corpo


@pytest.mark.django_db
def test_dono_ve_o_recebido_no_periodo_por_forma_e_comparado_ao_anterior(
    api_dono: APIClient, tenant: Tenant, loja: Loja, cliente: Cliente, aparelho: Aparelho
) -> None:
    entregar(
        abrir(tenant, loja, cliente, aparelho),
        aprovado="300.00",
        cobrado="300.00",
        pagamentos=[("pix", "200.00"), ("credito", "100.00")],
    )
    antiga = entregar(
        abrir(tenant, loja, cliente, aparelho),
        aprovado="80.00",
        cobrado="80.00",
        pagamentos=[("dinheiro", "80.00")],
    )
    recuar(antiga, dias=7)

    dinheiro = painel(api_dono, periodo="7dias")["dinheiro"]

    assert dinheiro["recebido"] == {"atual": "300.00", "anterior": "80.00"}
    assert dinheiro["por_forma"] == [
        {"forma": "pix", "rotulo": "PIX", "valor": "200.00"},
        {"forma": "dinheiro", "rotulo": "Dinheiro", "valor": "0.00"},
        {"forma": "debito", "rotulo": "Débito", "valor": "0.00"},
        {"forma": "credito", "rotulo": "Crédito", "valor": "100.00"},
    ]


@pytest.mark.django_db
def test_quitacao_conta_no_dia_em_que_o_dinheiro_entrou(
    api_dono: APIClient, tenant: Tenant, loja: Loja, cliente: Cliente, aparelho: Aparelho
) -> None:
    ordem = entregar(
        abrir(tenant, loja, cliente, aparelho),
        aprovado="200.00",
        cobrado="200.00",
        pagamentos=[("pix", "50.00")],
    )
    recuar(ordem, dias=3)
    ordem.receber(Recebimento(forma=FormaDePagamento.DINHEIRO, valor=Decimal("150.00")))

    dinheiro = painel(api_dono, periodo="hoje")["dinheiro"]

    assert dinheiro["recebido"]["atual"] == "150.00"


@pytest.mark.django_db
def test_descontos_e_ticket_medio_das_entregas_do_periodo(
    api_dono: APIClient, tenant: Tenant, loja: Loja, cliente: Cliente, aparelho: Aparelho
) -> None:
    entregar(
        abrir(tenant, loja, cliente, aparelho),
        aprovado="300.00",
        cobrado="280.00",
        pagamentos=[("pix", "280.00")],
    )
    entregar(
        abrir(tenant, loja, cliente, aparelho),
        aprovado="120.00",
        cobrado="120.00",
        pagamentos=[("pix", "120.00")],
    )
    entregar(abrir(tenant, loja, cliente, aparelho), aprovado="0.00", cobrado="0.00", pagamentos=[])

    dinheiro = painel(api_dono, periodo="hoje")["dinheiro"]

    assert dinheiro["descontos"]["atual"] == "20.00"
    assert dinheiro["ticket_medio"]["atual"] == "200.00"
    assert dinheiro["ticket_medio"]["anterior"] is None


@pytest.mark.django_db
def test_a_receber_soma_o_que_falta_de_todas_as_entregas(
    api_dono: APIClient, tenant: Tenant, loja: Loja, cliente: Cliente, aparelho: Aparelho
) -> None:
    antiga = entregar(
        abrir(tenant, loja, cliente, aparelho),
        aprovado="300.00",
        cobrado="300.00",
        pagamentos=[("pix", "100.00")],
    )
    recuar(antiga, dias=60)
    entregar(
        abrir(tenant, loja, cliente, aparelho), aprovado="90.00", cobrado="90.00", pagamentos=[]
    )
    entregar(
        abrir(tenant, loja, cliente, aparelho),
        aprovado="50.00",
        cobrado="50.00",
        pagamentos=[("pix", "50.00")],
    )

    dinheiro = painel(api_dono, periodo="hoje")["dinheiro"]

    assert dinheiro["a_receber"] == {"valor": "290.00", "ordens": 2}


@pytest.mark.django_db
def test_painel_soma_apenas_o_orcamento_aprovado_do_que_esta_aberto(
    api_dono: APIClient, tenant: Tenant, loja: Loja, cliente: Cliente, aparelho: Aparelho
) -> None:
    aberta = abrir(tenant, loja, cliente, aparelho)
    ItemOrcamento.objects.create(ordem=aberta, descricao="Tela", valor="300.00", aprovado=True)
    ItemOrcamento.objects.create(ordem=aberta, descricao="Capa", valor="50.00", aprovado=False)

    entregue = levar_ate(abrir(tenant, loja, cliente, aparelho), StatusOS.ENTREGUE)
    ItemOrcamento.objects.create(ordem=entregue, descricao="Bateria", valor="90.00", aprovado=True)

    assert painel(api_dono)["dinheiro"]["aprovado_em_aberto"] == "300.00"


@pytest.mark.django_db
def test_taxa_de_aprovacao_dos_orcamentos_respondidos_no_periodo(
    api_dono: APIClient, tenant: Tenant, loja: Loja, cliente: Cliente, aparelho: Aparelho
) -> None:
    for _ in range(3):
        levar_ate(abrir(tenant, loja, cliente, aparelho), StatusOS.APROVADO)
    reprovada = levar_ate(abrir(tenant, loja, cliente, aparelho), StatusOS.ORCAMENTO_ENVIADO)
    reprovada.transicionar(StatusOS.REPROVADO)
    levar_ate(abrir(tenant, loja, cliente, aparelho), StatusOS.ORCAMENTO_ENVIADO)

    taxa = painel(api_dono, periodo="hoje")["dinheiro"]["taxa_de_aprovacao"]

    assert taxa == {"atual": 75.0, "anterior": None}


@pytest.mark.django_db
def test_equipe_mostra_concluidas_e_recebido_por_tecnico(
    api_dono: APIClient,
    tecnico: Usuario,
    tenant: Tenant,
    loja: Loja,
    cliente: Cliente,
    aparelho: Aparelho,
) -> None:
    tecnico.first_name = "Joana"
    tecnico.save()
    for valor in ["100.00", "150.00"]:
        ordem = abrir(tenant, loja, cliente, aparelho)
        OrdemServico.objects.filter(pk=ordem.pk).update(tecnico=tecnico)
        entregar(ordem, aprovado=valor, cobrado=valor, pagamentos=[("pix", valor)])
    entregar(
        abrir(tenant, loja, cliente, aparelho), aprovado="40.00", cobrado="40.00", pagamentos=[]
    )

    equipe = painel(api_dono, periodo="hoje")["equipe"]

    assert equipe == [
        {"tecnico": tecnico.pk, "nome": "Joana", "concluidas": 2, "recebido": "250.00"},
        {"tecnico": None, "nome": "Sem técnico", "concluidas": 1, "recebido": "0.00"},
    ]


@pytest.mark.django_db
def test_tempo_medio_de_reparo_das_entregas_do_periodo(
    api_tecnico: APIClient, ordem: OrdemServico
) -> None:
    levar_ate(ordem, StatusOS.ENTREGUE)
    OrdemServico.objects.filter(pk=ordem.pk).update(
        criado_em=timezone.now() - timedelta(days=4), entregue_em=timezone.now()
    )

    tempo = painel(api_tecnico, periodo="hoje")["operacao"]["dias_medios_de_reparo"]

    assert tempo == {"atual": 4.0, "anterior": None}


@pytest.mark.django_db
def test_tempo_parado_em_cada_etapa_encerrada_no_periodo(
    api_tecnico: APIClient, ordem: OrdemServico
) -> None:
    levar_ate(ordem, StatusOS.ORCAMENTO_ENVIADO)
    agora = timezone.now()
    horarios = {
        StatusOS.RECEBIDO: agora - timedelta(hours=10),
        StatusOS.EM_DIAGNOSTICO: agora - timedelta(hours=7),
        StatusOS.ORCAMENTO_ENVIADO: agora - timedelta(hours=1),
    }
    for status, momento in horarios.items():
        EventoOS.objects.filter(ordem=ordem, para_status=status).update(criado_em=momento)

    etapas = painel(api_tecnico, periodo="hoje")["operacao"]["tempo_por_etapa"]

    assert etapas == [
        {"status": "recebido", "rotulo": "Recebido", "horas": 3.0, "vezes": 1},
        {"status": "em_diagnostico", "rotulo": "Em diagnóstico", "horas": 6.0, "vezes": 1},
    ]


@pytest.mark.django_db
def test_aparelhos_mais_atendidos_sem_diferenciar_maiusculas(
    api_tecnico: APIClient, tenant: Tenant, loja: Loja, cliente: Cliente
) -> None:
    for marca, modelo in [
        ("Samsung", "Galaxy A15"),
        ("samsung ", "galaxy a15"),
        ("Apple", "iPhone 13"),
    ]:
        aparelho = Aparelho.objects.create(
            tenant=tenant, cliente=cliente, marca=marca, modelo=modelo
        )
        abrir(tenant, loja, cliente, aparelho)

    aparelhos = painel(api_tecnico)["atendimento"]["aparelhos"]

    assert [(linha["modelo"].lower(), linha["total"]) for linha in aparelhos] == [
        ("galaxy a15", 2),
        ("iphone 13", 1),
    ]


@pytest.mark.django_db
def test_defeitos_mais_comuns_do_periodo(
    api_tecnico: APIClient, tenant: Tenant, loja: Loja, cliente: Cliente, aparelho: Aparelho
) -> None:
    for relato in ["Tela trincada", "Tela quebrada após queda", "Caiu na água e não liga"]:
        abrir(tenant, loja, cliente, aparelho, problema=relato)

    defeitos = painel(api_tecnico)["atendimento"]["defeitos"]

    assert defeitos[0] == {"defeito": "Tela", "total": 2}
    assert {linha["defeito"] for linha in defeitos[1:]} == {"Contato com líquido", "Não liga"}


@pytest.mark.django_db
def test_clientes_que_voltaram_entre_os_atendidos_no_periodo(
    api_tecnico: APIClient, tenant: Tenant, loja: Loja, cliente: Cliente, aparelho: Aparelho
) -> None:
    antiga = abrir(tenant, loja, cliente, aparelho)
    recuar(antiga, dias=90)
    abrir(tenant, loja, cliente, aparelho)

    novo = Cliente.objects.create(tenant=tenant, nome="Pedro Lima", telefone="11977776666")
    abrir(tenant, loja, novo, Aparelho.objects.create(tenant=tenant, cliente=novo, marca="LG"))

    clientes = painel(api_tecnico)["atendimento"]["clientes"]

    assert clientes["atendidos"] == 2
    assert clientes["que_voltaram"] == 1
    assert clientes["mais_frequentes"] == [
        {"nome": "Maria Souza", "telefone": "11999990000", "ordens": 2}
    ]


@pytest.mark.django_db
def test_filtro_por_loja(
    api_dono: APIClient, tenant: Tenant, loja: Loja, cliente: Cliente, aparelho: Aparelho
) -> None:
    filial = Loja.objects.create(tenant=tenant, nome="Filial")
    abrir(tenant, loja, cliente, aparelho)
    abrir(tenant, filial, cliente, aparelho)
    abrir(tenant, filial, cliente, aparelho)

    assert painel(api_dono)["agora"]["abertas"] == 3
    assert painel(api_dono, loja=str(filial.pk))["agora"]["abertas"] == 2


@pytest.mark.django_db
def test_loja_de_outra_assistencia_e_recusada(api_dono: APIClient, outro_tenant: Tenant) -> None:
    alheia = Loja.objects.create(tenant=outro_tenant, nome="Alheia")

    resposta = api_dono.get("/api/ordens/painel/", {"loja": alheia.pk})

    assert resposta.status_code == 400


@pytest.mark.django_db
def test_painel_de_uma_assistencia_nao_enxerga_a_outra(
    tenant: Tenant, loja: Loja, cliente: Cliente, aparelho: Aparelho, outro_tenant: Tenant
) -> None:
    entregar(
        abrir(tenant, loja, cliente, aparelho),
        aprovado="100.00",
        cobrado="100.00",
        pagamentos=[("pix", "100.00")],
    )
    dono_de_fora = Usuario.objects.create_user(
        username="dono-de-fora", password="x", tenant=outro_tenant, papel=Papel.DONO
    )
    api = APIClient()
    token, _ = Token.objects.get_or_create(user=dono_de_fora)
    api.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

    corpo = painel(api, periodo="hoje")

    assert corpo["operacao"]["entregues"]["atual"] == 0
    assert corpo["dinheiro"]["recebido"]["atual"] == "0.00"
    assert corpo["dinheiro"]["aprovado_em_aberto"] == "0.00"
    assert corpo["atendimento"]["aparelhos"] == []


@pytest.mark.django_db
def test_painel_exige_autenticacao(ordem: OrdemServico) -> None:
    assert APIClient().get("/api/ordens/painel/").status_code == 401
