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


class TransicaoInvalida(Exception):
    def __init__(self, de: str, para: str) -> None:
        permitidos = ", ".join(sorted(TRANSICOES.get(de, frozenset()))) or "nenhum"
        super().__init__(
            f"Não é possível ir de '{de}' para '{para}'. A partir de '{de}' só: {permitidos}."
        )
        self.de = de
        self.para = para


def pode_ir_de(de: str, para: str) -> bool:
    return para in TRANSICOES.get(de, frozenset())
