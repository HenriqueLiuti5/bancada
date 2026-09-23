from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from bancada.clientes.models import Aparelho, Cliente
from bancada.ordens.estados import StatusOS
from bancada.ordens.models import ItemOrcamento, OrdemServico
from bancada.tenants.models import Loja, Tenant


def abrir(tenant: Tenant, loja: Loja, cliente: Cliente, aparelho: Aparelho) -> OrdemServico:
    return OrdemServico.abrir(
        tenant=tenant,
        loja=loja,
        cliente=cliente,
        aparelho=aparelho,
        problema_relatado="Não liga",
    )


def levar_ate(ordem: OrdemServico, destino: str) -> OrdemServico:
    caminho = [
        StatusOS.EM_DIAGNOSTICO,
        StatusOS.ORCAMENTO_ENVIADO,
        StatusOS.APROVADO,
        StatusOS.EM_REPARO,
        StatusOS.PRONTO,
        StatusOS.ENTREGUE,
    ]
    for status in caminho:
        ordem.transicionar(status)
        if status == destino:
            break
    return ordem


@pytest.mark.django_db
def test_painel_conta_a_fila_de_trabalho(
    api_tecnico: APIClient, tenant: Tenant, loja: Loja, cliente: Cliente, aparelho: Aparelho
) -> None:
    levar_ate(abrir(tenant, loja, cliente, aparelho), StatusOS.ORCAMENTO_ENVIADO)
    levar_ate(abrir(tenant, loja, cliente, aparelho), StatusOS.PRONTO)
    abrir(tenant, loja, cliente, aparelho)

    corpo = api_tecnico.get("/api/ordens/painel/").json()

    assert corpo["abertas"] == 3
    assert corpo["aguardando_cliente"] == 1
    assert corpo["prontas"] == 1
    assert corpo["abertas_hoje"] == 3


@pytest.mark.django_db
def test_painel_conta_as_atrasadas_pela_data_prometida(
    api_tecnico: APIClient, ordem: OrdemServico
) -> None:
    OrdemServico.objects.filter(pk=ordem.pk).update(
        prometida_para=timezone.localdate() - timedelta(days=2)
    )

    assert api_tecnico.get("/api/ordens/painel/").json()["atrasadas"] == 1


@pytest.mark.django_db
def test_ordem_entregue_nao_conta_como_atrasada_no_painel(
    api_tecnico: APIClient, ordem: OrdemServico
) -> None:
    OrdemServico.objects.filter(pk=ordem.pk).update(
        prometida_para=timezone.localdate() - timedelta(days=2)
    )
    levar_ate(ordem, StatusOS.ENTREGUE)

    corpo = api_tecnico.get("/api/ordens/painel/").json()

    assert corpo["atrasadas"] == 0
    assert corpo["abertas"] == 0
    assert corpo["entregues_no_mes"] == 1


@pytest.mark.django_db
def test_painel_soma_apenas_o_orcamento_aprovado_do_que_esta_aberto(
    api_tecnico: APIClient, tenant: Tenant, loja: Loja, cliente: Cliente, aparelho: Aparelho
) -> None:
    aberta = abrir(tenant, loja, cliente, aparelho)
    ItemOrcamento.objects.create(ordem=aberta, descricao="Tela", valor="300.00", aprovado=True)
    ItemOrcamento.objects.create(ordem=aberta, descricao="Capa", valor="50.00", aprovado=False)

    entregue = levar_ate(abrir(tenant, loja, cliente, aparelho), StatusOS.ENTREGUE)
    ItemOrcamento.objects.create(ordem=entregue, descricao="Bateria", valor="90.00", aprovado=True)

    corpo = api_tecnico.get("/api/ordens/painel/").json()

    assert corpo["valor_aprovado_em_aberto"] == "300.00"


@pytest.mark.django_db
def test_painel_calcula_o_tempo_medio_de_reparo(
    api_tecnico: APIClient, ordem: OrdemServico
) -> None:
    levar_ate(ordem, StatusOS.ENTREGUE)
    OrdemServico.objects.filter(pk=ordem.pk).update(
        criado_em=timezone.now() - timedelta(days=4), entregue_em=timezone.now()
    )

    assert api_tecnico.get("/api/ordens/painel/").json()["dias_medios_de_reparo"] == 4.0


@pytest.mark.django_db
def test_sem_entregas_o_tempo_medio_fica_indefinido(
    api_tecnico: APIClient, ordem: OrdemServico
) -> None:
    assert api_tecnico.get("/api/ordens/painel/").json()["dias_medios_de_reparo"] is None


@pytest.mark.django_db
def test_painel_lista_todos_os_status_mesmo_os_vazios(
    api_tecnico: APIClient, ordem: OrdemServico
) -> None:
    por_status = api_tecnico.get("/api/ordens/painel/").json()["por_status"]

    assert len(por_status) == len(StatusOS.choices)
    assert por_status[0] == {"status": "recebido", "rotulo": "Recebido", "total": 1}


@pytest.mark.django_db
def test_painel_de_uma_assistencia_nao_enxerga_a_outra(
    api_intruso: APIClient, ordem: OrdemServico
) -> None:
    corpo = api_intruso.get("/api/ordens/painel/").json()

    assert corpo["abertas"] == 0
    assert corpo["valor_aprovado_em_aberto"] == "0.00"


@pytest.mark.django_db
def test_painel_exige_autenticacao(ordem: OrdemServico) -> None:
    assert APIClient().get("/api/ordens/painel/").status_code == 401
