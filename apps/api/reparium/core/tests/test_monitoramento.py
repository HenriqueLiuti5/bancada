from config.monitoramento import _sem_dados_do_pedido


def test_o_aviso_de_erro_leva_so_o_desenho_da_rota() -> None:
    evento = {
        "transaction": "/api/publico/os/{token}/",
        "request": {
            "url": "http://api:8000/api/publico/os/token-secreto-do-cliente/",
            "method": "GET",
            "query_string": "busca=Maria",
            "data": {"senha_de_desbloqueio": "1234"},
            "cookies": {"sessionid": "abc"},
            "headers": {"User-Agent": "Mozilla/5.0", "X-Forwarded-For": "200.100.50.25"},
            "env": {"REMOTE_ADDR": "10.0.0.1"},
        },
    }

    limpo = _sem_dados_do_pedido(evento, {})

    assert limpo["request"] == {"url": "/api/publico/os/{token}/", "method": "GET"}


def test_erro_fora_de_um_pedido_passa_intacto() -> None:
    evento = {"message": "falha na tarefa", "extra": {"celery-job": {"args": [42]}}}

    assert _sem_dados_do_pedido(evento, {}) == evento
