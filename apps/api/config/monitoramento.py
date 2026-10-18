import os
from typing import Any

import sentry_sdk


def _sem_dados_do_pedido(evento: Any, dica: Any) -> Any:
    pedido = evento.get("request")
    if pedido:
        for campo in ("query_string", "data", "cookies", "headers", "env"):
            pedido.pop(campo, None)
        if evento.get("transaction"):
            pedido["url"] = evento["transaction"]
    return evento


def iniciar_monitoramento(dsn: str) -> None:
    """Manda os erros da API, do worker e do agendador para o serviço de monitoramento.

    O aviso de erro leva o tipo, a mensagem e as linhas de código, nunca o que identifica pessoas:
    sem cookies, cabeçalhos, endereço de quem acessa, corpo dos pedidos, variáveis locais nem o
    rastro do que aconteceu antes do erro, porque nele vão as chaves do Redis, e a do limite de
    acessos leva o endereço do visitante. O corpo de uma abertura de ordem traz CPF, telefone e a
    senha de desbloqueio do aparelho, e o endereço de um pedido pode trazer o token do link do
    cliente, por isso a URL vai só com o desenho da rota.
    """
    sentry_sdk.init(
        dsn=dsn,
        environment=os.environ.get("SENTRY_ENVIRONMENT", "producao"),
        release=os.environ.get("VERSAO") or None,
        send_default_pii=False,
        include_local_variables=False,
        max_request_body_size="never",
        max_breadcrumbs=0,
        traces_sample_rate=0,
        before_send=_sem_dados_do_pedido,
    )
