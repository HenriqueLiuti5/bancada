from collections.abc import Callable
from decimal import Decimal
from typing import Any

from django.db.models import QuerySet

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


def _dinheiro(
    consulta: QuerySet[OrdemServico], atual: Periodo, anterior: Periodo
) -> dict[str, Any]:
    return {
        "recebido": comparar(dinheiro.recebido, consulta, atual, anterior),
        "por_forma": dinheiro.recebido_por_forma(consulta, atual),
        "descontos": comparar(dinheiro.descontos, consulta, atual, anterior),
        "ticket_medio": comparar(dinheiro.ticket_medio, consulta, atual, anterior),
        "taxa_de_aprovacao": comparar(dinheiro.taxa_de_aprovacao, consulta, atual, anterior),
        "a_receber": agora.a_receber(consulta),
        "aprovado_em_aberto": str(agora.valor_aprovado_em_aberto(consulta)),
    }


def numeros(
    consulta: QuerySet[OrdemServico],
    *,
    chave: str,
    atual: Periodo,
    anterior: Periodo,
    com_dinheiro: bool,
) -> dict[str, Any]:
    resposta: dict[str, Any] = {
        "periodo": {"chave": chave, **atual.em_texto(), "anterior": anterior.em_texto()},
        "agora": agora.numeros(consulta),
        "operacao": _operacao(consulta, atual, anterior),
        "atendimento": _atendimento(consulta, atual),
    }
    if com_dinheiro:
        resposta["dinheiro"] = _dinheiro(consulta, atual, anterior)
        resposta["equipe"] = equipe.por_tecnico(consulta, atual)
    return resposta
