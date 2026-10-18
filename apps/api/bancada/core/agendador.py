import logging
from typing import Any

import redis
from celery.beat import PersistentScheduler
from django.conf import settings
from redis.exceptions import LockError, RedisError

registrador = logging.getLogger(__name__)

NOME_DA_TRAVA = "bancada:agendador"
SEGUNDOS_DE_VALIDADE_DA_TRAVA = 300
SEGUNDOS_ENTRE_RENOVACOES = 60


class AgendadorComTrava(PersistentScheduler):
    """Celery Beat que só dispara tarefas enquanto segura uma trava no Redis.

    Um segundo agendador no ar fica de reserva, sem disparar nada, e assume quando a trava vence,
    o que só acontece se o primeiro parar de renová-la.
    """

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        cliente = redis.Redis.from_url(settings.REDIS_URL, socket_connect_timeout=5)
        self.trava = cliente.lock(
            NOME_DA_TRAVA, timeout=SEGUNDOS_DE_VALIDADE_DA_TRAVA, thread_local=False
        )
        self.no_comando = False
        self.reserva_avisada = False
        super().__init__(*args, **kwargs)

    def tick(self, *args: Any, **kwargs: Any) -> float:
        if not self._segurar_a_trava():
            return SEGUNDOS_ENTRE_RENOVACOES
        return min(super().tick(*args, **kwargs), SEGUNDOS_ENTRE_RENOVACOES)

    def close(self) -> None:
        super().close()
        if self.no_comando:
            self.no_comando = False
            try:
                self.trava.release()
            except (LockError, RedisError):
                registrador.warning("O agendador não conseguiu soltar a trava ao sair.")

    def _segurar_a_trava(self) -> bool:
        try:
            if self.no_comando:
                try:
                    self.trava.reacquire()
                    return True
                except LockError:
                    registrador.warning("O agendador perdeu a trava e parou de disparar tarefas.")
                    self.no_comando = False
            if self.trava.acquire(blocking=False):
                self._assumir()
                return True
        except RedisError:
            registrador.warning("O agendador não alcançou o Redis para renovar a trava.")
            return False

        if not self.reserva_avisada:
            registrador.info("Outro agendador está no ar. Este fica de reserva.")
            self.reserva_avisada = True
        return False

    def _assumir(self) -> None:
        # Quem assume conta os prazos a partir de agora, como num reinício, para não repetir de
        # uma vez o que o agendador anterior já disparou.
        for entrada in self.schedule.values():
            entrada.last_run_at = entrada.default_now()
        self._heap = None
        self.no_comando = True
        self.reserva_avisada = False
        registrador.info("O agendador está no comando das tarefas periódicas.")
