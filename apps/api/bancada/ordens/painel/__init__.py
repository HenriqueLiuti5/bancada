from collections.abc import Callable
from decimal import Decimal
from typing import Any

from django.db.models import QuerySet
from django.utils import timezone

from bancada.estoque.models import Produto, Venda, para_repor
from bancada.financeiro import consultas as contas_a_pagar
from bancada.financeiro.models import ContaAPagar
from bancada.ordens.models import OrdemServico
from bancada.ordens.painel import agora, atendimento, dinheiro, equipe, operacao
from bancada.ordens.painel.periodo import Periodo


def serializavel(valor: object) -> object:
    return str(valor) if isinstance(valor, Decimal) else valor


def comparar(
    calcular: Callable[[QuerySet[OrdemServico], Periodo], object],
    consulta: QuerySet[OrdemServico],
    atual: Periodo,
    anterior: Periodo,
) -> dict[str, Any]:
    return {
        "atual": serializavel(calcular(consulta, atual)),
        "anterior": serializavel(calcular(consulta, anterior)),
    }


def _operacao(
    consulta: QuerySet[OrdemServico], atual: Periodo, anterior: Periodo
) -> dict[str, Any]:
    movimento_atual = operacao.movimento(consulta, atual)
    movimento_anterior = operacao.movimento(consulta, anterior)
    return {
        "abertas": {"atual": movimento_atual["abertas"], "anterior": movimento_anterior["abertas"]},
        "entregues": {
            "atual": movimento_atual["entregues"],
            "anterior": movimento_anterior["entregues"],
        },
        "dias_medios_de_reparo": comparar(
            operacao.dias_medios_de_reparo, consulta, atual, anterior
        ),
        "tempo_por_etapa": operacao.tempo_por_etapa(consulta, atual),
    }


def _atendimento(consulta: QuerySet[OrdemServico], atual: Periodo) -> dict[str, Any]:
    return {
        "aparelhos": atendimento.aparelhos(consulta, atual),
        "defeitos": atendimento.defeitos_mais_comuns(consulta, atual),
        "clientes": atendimento.clientes(consulta, atual),
    }


def _recebido(consulta: QuerySet[OrdemServico], vendas: QuerySet[Venda], periodo: Periodo) -> str:
    return str(dinheiro.recebido(consulta, periodo) + dinheiro.recebido_no_balcao(vendas, periodo))


def _a_pagar(contas: QuerySet[ContaAPagar]) -> dict[str, Any]:
    resumo = contas_a_pagar.resumo(contas, timezone.localdate())
    return {"vencidas": resumo["vencidas"], "proximos_dias": resumo["proximos_dias"]}


# O recebido soma o que entrou pelas ordens e pelas vendas no balcão. O balcão também aparece à
# parte, para o dono ver quanto dele veio das vendas de acessórios.
def _dinheiro(
    consulta: QuerySet[OrdemServico],
    vendas: QuerySet[Venda],
    contas: QuerySet[ContaAPagar],
    atual: Periodo,
    anterior: Periodo,
) -> dict[str, Any]:
    return {
        "recebido": {
            "atual": _recebido(consulta, vendas, atual),
            "anterior": _recebido(consulta, vendas, anterior),
        },
        "por_forma": dinheiro.recebido_por_forma(consulta, vendas, atual),
        "balcao": {
            "recebido": {
                "atual": str(dinheiro.recebido_no_balcao(vendas, atual)),
                "anterior": str(dinheiro.recebido_no_balcao(vendas, anterior)),
            },
            "vendas": dinheiro.vendas_no_balcao(vendas, atual),
        },
        "descontos": comparar(dinheiro.descontos, consulta, atual, anterior),
        "ticket_medio": comparar(dinheiro.ticket_medio, consulta, atual, anterior),
        "taxa_de_aprovacao": comparar(dinheiro.taxa_de_aprovacao, consulta, atual, anterior),
        "a_receber": agora.a_receber(consulta),
        "a_pagar": _a_pagar(contas),
        "aprovado_em_aberto": str(agora.valor_aprovado_em_aberto(consulta)),
    }


def numeros(
    consulta: QuerySet[OrdemServico],
    *,
    vendas: QuerySet[Venda],
    produtos: QuerySet[Produto],
    contas: QuerySet[ContaAPagar],
    chave: str,
    atual: Periodo,
    anterior: Periodo,
    com_dinheiro: bool,
) -> dict[str, Any]:
    resposta: dict[str, Any] = {
        "periodo": {"chave": chave, **atual.em_texto(), "anterior": anterior.em_texto()},
        "agora": agora.numeros(consulta),
        "estoque": {"para_repor": para_repor(produtos).count()},
        "operacao": _operacao(consulta, atual, anterior),
        "atendimento": _atendimento(consulta, atual),
    }
    if com_dinheiro:
        resposta["dinheiro"] = _dinheiro(consulta, vendas, contas, atual, anterior)
        resposta["equipe"] = equipe.por_tecnico(consulta, atual)
    return resposta
