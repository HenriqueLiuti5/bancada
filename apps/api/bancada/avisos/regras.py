from typing import NamedTuple

from bancada.ordens.estados import StatusOS


class ModeloDeAviso(NamedTuple):
    assunto: str
    chamada: str


AVISOS: dict[str, ModeloDeAviso] = {
    StatusOS.RECEBIDO: ModeloDeAviso(
        "Recebemos seu {aparelho}",
        "Recebemos seu aparelho e abrimos uma ordem de serviço. Você acompanha cada passo do "
        "reparo pelo link abaixo, sem precisar criar conta nem instalar nada.",
    ),
    StatusOS.ORCAMENTO_ENVIADO: ModeloDeAviso(
        "Orçamento do seu {aparelho}",
        "Terminamos a avaliação e o orçamento já está disponível. Abra o link para ver os "
        "valores e nos dar uma resposta.",
    ),
    StatusOS.AGUARDANDO_PECA: ModeloDeAviso(
        "Uma peça do seu {aparelho} está a caminho",
        "O reparo começou, mas depende de uma peça que ainda não chegou. Assim que ela chegar, "
        "retomamos o serviço e avisamos você.",
    ),
    StatusOS.PRONTO: ModeloDeAviso(
        "Seu {aparelho} está pronto para retirada",
        "Terminamos o reparo e o aparelho já pode ser retirado. Leve um documento com foto.",
    ),
}


def modelo_para(status: str) -> ModeloDeAviso | None:
    return AVISOS.get(status)
