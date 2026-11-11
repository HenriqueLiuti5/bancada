from django.db import models


class StatusOS(models.TextChoices):
    RECEBIDO = "recebido", "Recebido"
    EM_DIAGNOSTICO = "em_diagnostico", "Em diagnóstico"
    ORCAMENTO_ENVIADO = "orcamento_enviado", "Orçamento enviado"
    APROVADO = "aprovado", "Aprovado"
    REPROVADO = "reprovado", "Reprovado"
    EM_REPARO = "em_reparo", "Em reparo"
    AGUARDANDO_PECA = "aguardando_peca", "Aguardando peça"
    PRONTO = "pronto", "Pronto"
    ENTREGUE = "entregue", "Entregue"
    DEVOLVIDO_SEM_REPARO = "devolvido_sem_reparo", "Devolvido sem reparo"


TRANSICOES: dict[str, frozenset[str]] = {
    StatusOS.RECEBIDO: frozenset({StatusOS.EM_DIAGNOSTICO}),
    StatusOS.EM_DIAGNOSTICO: frozenset({StatusOS.ORCAMENTO_ENVIADO}),
    StatusOS.ORCAMENTO_ENVIADO: frozenset({StatusOS.APROVADO, StatusOS.REPROVADO}),
    StatusOS.APROVADO: frozenset({StatusOS.EM_REPARO}),
    StatusOS.REPROVADO: frozenset({StatusOS.DEVOLVIDO_SEM_REPARO}),
    StatusOS.EM_REPARO: frozenset({StatusOS.AGUARDANDO_PECA, StatusOS.PRONTO}),
    StatusOS.AGUARDANDO_PECA: frozenset({StatusOS.EM_REPARO}),
    StatusOS.PRONTO: frozenset({StatusOS.ENTREGUE}),
    StatusOS.ENTREGUE: frozenset(),
    StatusOS.DEVOLVIDO_SEM_REPARO: frozenset(),
}

ESTADOS_FINAIS: frozenset[str] = frozenset({StatusOS.ENTREGUE, StatusOS.DEVOLVIDO_SEM_REPARO})

ESTADOS_COM_ORCAMENTO_EDITAVEL: frozenset[str] = frozenset(
    {StatusOS.RECEBIDO, StatusOS.EM_DIAGNOSTICO}
)

ESTADOS_COM_ORCAMENTO_APROVADO: frozenset[str] = frozenset(
    {
        StatusOS.APROVADO,
        StatusOS.EM_REPARO,
        StatusOS.AGUARDANDO_PECA,
        StatusOS.PRONTO,
        StatusOS.ENTREGUE,
    }
)


def nome_da_etapa(status: str) -> str:
    return StatusOS(status).label if status in StatusOS.values else status


class TransicaoInvalida(Exception):
    def __init__(self, de: str, para: str) -> None:
        etapa = nome_da_etapa(de)
        super().__init__(
            f"Esta ordem já está na etapa {etapa}."
            if de == para
            else f"Esta ordem está na etapa {etapa} e não pode passar para {nome_da_etapa(para)}."
        )
        self.de = de
        self.para = para


def pode_ir_de(de: str, para: str) -> bool:
    return para in TRANSICOES.get(de, frozenset())
