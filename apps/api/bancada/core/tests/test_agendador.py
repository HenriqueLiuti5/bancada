from collections.abc import Iterator
from datetime import timedelta
from pathlib import Path
from typing import Any, cast
from uuid import uuid4

import pytest
import redis
from celery import beat
from django.conf import settings
from redis.exceptions import ConnectionError as RedisFora

from bancada.core import agendador
from bancada.core.agendador import SEGUNDOS_ENTRE_RENOVACOES, AgendadorComTrava
from config.celery import app


@pytest.fixture
def nome_da_trava(monkeypatch: pytest.MonkeyPatch) -> Iterator[str]:
    nome = f"teste:agendador:{uuid4().hex}"
    monkeypatch.setattr(agendador, "NOME_DA_TRAVA", nome)
    yield nome
    redis.Redis.from_url(settings.REDIS_URL).delete(nome)


@pytest.fixture
def disparos(monkeypatch: pytest.MonkeyPatch) -> list[str]:
    chamados: list[str] = []

    def tick_registrado(self: beat.Scheduler, *args: Any, **kwargs: Any) -> float:
        chamados.append(self.schedule_filename)
        return 5.0

    monkeypatch.setattr(beat.Scheduler, "tick", tick_registrado)
    return chamados


def novo_agendador(pasta: Path, nome: str) -> AgendadorComTrava:
    return AgendadorComTrava(app=app, schedule_filename=str(pasta / nome))


def test_so_o_agendador_com_a_trava_dispara_tarefas(
    tmp_path: Path, nome_da_trava: str, disparos: list[str]
) -> None:
    primeiro = novo_agendador(tmp_path, "primeiro")
    segundo = novo_agendador(tmp_path, "segundo")

    assert primeiro.tick() == 5.0
    assert segundo.tick() == SEGUNDOS_ENTRE_RENOVACOES

    assert disparos == [str(tmp_path / "primeiro")]
    assert primeiro.no_comando
    assert not segundo.no_comando


def test_a_reserva_assume_quando_o_primeiro_sai(
    tmp_path: Path, nome_da_trava: str, disparos: list[str]
) -> None:
    primeiro = novo_agendador(tmp_path, "primeiro")
    segundo = novo_agendador(tmp_path, "segundo")
    primeiro.tick()
    segundo.tick()

    primeiro.close()
    segundo.tick()

    assert segundo.no_comando
    assert disparos[-1] == str(tmp_path / "segundo")


def test_a_reserva_assume_quando_a_trava_vence(
    tmp_path: Path, nome_da_trava: str, disparos: list[str]
) -> None:
    primeiro = novo_agendador(tmp_path, "primeiro")
    segundo = novo_agendador(tmp_path, "segundo")
    primeiro.tick()

    redis.Redis.from_url(settings.REDIS_URL).delete(nome_da_trava)
    segundo.tick()
    primeiro.tick()

    assert segundo.no_comando
    assert not primeiro.no_comando
    assert disparos == [str(tmp_path / "primeiro"), str(tmp_path / "segundo")]


def test_quem_assume_conta_os_prazos_a_partir_de_agora(
    tmp_path: Path, nome_da_trava: str, disparos: list[str]
) -> None:
    reserva = novo_agendador(tmp_path, "reserva")
    for entrada in reserva.schedule.values():
        entrada.last_run_at = entrada.default_now() - timedelta(days=2)

    reserva.tick()

    limite = app.now() - timedelta(minutes=1)
    assert reserva.schedule
    assert all(entrada.last_run_at > limite for entrada in reserva.schedule.values())


def test_a_trava_e_renovada_a_cada_volta(
    tmp_path: Path, nome_da_trava: str, disparos: list[str]
) -> None:
    primeiro = novo_agendador(tmp_path, "primeiro")
    primeiro.tick()
    cliente = redis.Redis.from_url(settings.REDIS_URL)
    cliente.pexpire(nome_da_trava, 1000)

    primeiro.tick()

    assert cast(int, cliente.pttl(nome_da_trava)) > 1000 * 60


def test_redis_fora_do_ar_nao_derruba_o_agendador(
    tmp_path: Path,
    nome_da_trava: str,
    disparos: list[str],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    primeiro = novo_agendador(tmp_path, "primeiro")

    def recusar(*args: object, **kwargs: object) -> bool:
        raise RedisFora("sem conexão")

    monkeypatch.setattr(primeiro.trava, "acquire", recusar)

    assert primeiro.tick() == SEGUNDOS_ENTRE_RENOVACOES
    assert disparos == []
