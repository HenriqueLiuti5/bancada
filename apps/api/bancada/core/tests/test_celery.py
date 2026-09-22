from bancada.core.tasks import ping


def test_ping_executa_localmente() -> None:
    assert ping.run() == "pong"
