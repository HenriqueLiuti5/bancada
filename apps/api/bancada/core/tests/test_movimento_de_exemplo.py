from datetime import datetime
from io import StringIO
from zoneinfo import ZoneInfo

import pytest
from django.core.management import call_command
from django.test import override_settings
from django.utils import timezone

from bancada.clientes.models import Cliente
from bancada.core.exemplo.oficina import PREFIXO_DOS_TELEFONES
from bancada.core.exemplo.simulacao import simular
from bancada.estoque.models import Produto, TipoDeProduto, Venda, com_quantidade
from bancada.financeiro.models import CategoriaDaConta, ConferenciaDoCaixa, ContaAPagar
from bancada.ordens.estados import ESTADOS_FINAIS, StatusOS
from bancada.ordens.models import EventoOS, OrdemServico, Pagamento
from bancada.ordens.painel import lucro
from bancada.ordens.painel.periodo import Periodo
from bancada.tenants.models import Loja, Papel, Tenant, Usuario

# Quarta-feira, 14 de outubro de 2026, às 15h em Brasília.
AGORA = datetime(2026, 10, 14, 15, tzinfo=ZoneInfo("America/Sao_Paulo"))
HOJE = AGORA.date()


@pytest.fixture
def assistencia_de_exemplo(
    tenant: Tenant, loja: Loja, tecnico: Usuario, atendente_do_tenant: Usuario
) -> Tenant:
    Usuario.objects.create_user(
        username="marcos", password="senha-de-teste", tenant=tenant, papel=Papel.DONO
    )
    return tenant


def test_o_movimento_de_exemplo_segue_as_regras_do_sistema(assistencia_de_exemplo: Tenant) -> None:
    tenant = assistencia_de_exemplo
    resumo = simular(tenant, AGORA, meses=1)

    ordens = OrdemServico.objects.filter(tenant=tenant)
    assert resumo.ordens == ordens.count() > 50
    assert ordens.filter(status=StatusOS.ENTREGUE).exists()
    assert ordens.exclude(status__in=ESTADOS_FINAIS).exists()
    assert Loja.objects.filter(tenant=tenant).count() == 2

    momentos = [
        *ordens.values_list("criado_em", flat=True),
        *EventoOS.objects.filter(ordem__tenant=tenant).values_list("criado_em", flat=True),
        *Pagamento.objects.filter(tenant=tenant).values_list("recebido_em", flat=True),
        *Venda.objects.filter(tenant=tenant).values_list("criado_em", flat=True),
    ]
    with timezone.override(tenant.fuso_horario):
        assert max(momentos) <= AGORA
        assert all(timezone.localtime(momento).weekday() != 6 for momento in momentos)

    # Toda peça das ordens tem custo, e o painel de exemplo não mostra o aviso das peças sem custo.
    no_mes = lucro.no_periodo(
        ordens,
        Venda.objects.filter(tenant=tenant),
        ContaAPagar.objects.filter(tenant=tenant),
        Periodo(HOJE.replace(day=1), HOJE),
    )
    assert no_mes["pecas_sem_custo"] == 0

    acessorios = Produto.objects.filter(tenant=tenant, tipo=TipoDeProduto.ACESSORIO)
    for loja in Loja.objects.filter(tenant=tenant):
        assert all(
            getattr(produto, "quantidade", 0) >= 0 for produto in com_quantidade(acessorios, loja)
        )
        conferencias = ConferenciaDoCaixa.objects.filter(loja=loja)
        assert conferencias.count() > 10
        ultima = ConferenciaDoCaixa.ultima(loja)
        assert ultima is not None and ultima.diferenca == 0

    contas = ContaAPagar.objects.filter(tenant=tenant)
    assert contas.filter(categoria=CategoriaDaConta.COMPRAS).exists()
    assert contas.filter(paga_em__isnull=True, vencimento__gt=HOJE).exists()
    vencidas = contas.filter(paga_em__isnull=True, vencimento__lt=HOJE)
    assert list(vencidas.values_list("descricao", flat=True)) == ["Troca da fechadura da porta"]


def test_o_comando_nao_cria_o_movimento_duas_vezes(assistencia_de_exemplo: Tenant) -> None:
    Cliente.objects.create(
        tenant=assistencia_de_exemplo,
        nome="Ana Ribeiro",
        telefone=f"{PREFIXO_DOS_TELEFONES}0001",
    )
    saida = StringIO()
    with override_settings(DEBUG=True):
        call_command("semear_movimento", stdout=saida)

    assert "nada mudou" in saida.getvalue()
    assert not Produto.objects.filter(tenant=assistencia_de_exemplo).exists()
