import heapq
import itertools
import random
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import date, datetime, time, timedelta
from typing import Any

from django.db.models import QuerySet
from django.utils import timezone

ABERTURA = time(9)
# A loja de exemplo abre de segunda a sábado, e no sábado só de manhã.
FECHAMENTO = {0: time(18), 1: time(18), 2: time(18), 3: time(18), 4: time(18), 5: time(13)}

Tarefa = Callable[[datetime], None]


def aberta(dia: date) -> bool:
    return dia.weekday() in FECHAMENTO


def no_horario(dia: date, hora: time) -> datetime:
    return timezone.make_aware(datetime.combine(dia, hora))


def fechamento(dia: date) -> datetime:
    return no_horario(dia, FECHAMENTO[dia.weekday()])


def a_qualquer_hora(dia: date, de: time = ABERTURA, ate: time | None = None) -> datetime:
    inicio = no_horario(dia, de)
    fim = no_horario(dia, ate) if ate is not None else fechamento(dia)
    return inicio + timedelta(seconds=random.uniform(0, (fim - inicio).total_seconds()))


def _aberta_as(momento: datetime) -> bool:
    local = timezone.localtime(momento)
    return aberta(local.date()) and ABERTURA <= local.time() < FECHAMENTO[local.weekday()]


def _proxima_abertura(momento: datetime) -> datetime:
    local = timezone.localtime(momento)
    dia = local.date() if local.time() < ABERTURA else local.date() + timedelta(days=1)
    while not aberta(dia):
        dia += timedelta(days=1)
    return no_horario(dia, ABERTURA)


# O que cairia com a loja fechada fica para a manhã do próximo dia aberto.
def no_expediente(momento: datetime) -> datetime:
    if _aberta_as(momento):
        return momento
    return _proxima_abertura(momento) + timedelta(minutes=random.randint(5, 50))


# O tempo entre uma etapa e outra conta só as horas com a loja aberta.
def depois(momento: datetime, horas_minimas: float, horas_maximas: float) -> datetime:
    resta = timedelta(hours=random.uniform(horas_minimas, horas_maximas))
    atual = momento if _aberta_as(momento) else _proxima_abertura(momento)
    while True:
        fecha = fechamento(timezone.localdate(atual))
        if atual + resta < fecha:
            return atual + resta
        resta -= fecha - atual
        atual = _proxima_abertura(fecha)


# As funções do sistema carimbam a hora de agora. O exemplo leva cada registro para a hora em que
# ele aconteceu na história da loja.
def datar(consulta: QuerySet[Any], momento: datetime) -> None:
    consulta.update(criado_em=momento)


@dataclass(order=True)
class _Compromisso:
    momento: datetime
    chegada: int
    tarefa: Tarefa = field(compare=False)


# Os acontecimentos rodam na ordem do tempo, para cada um encontrar o estoque, as contas e a gaveta
# como estavam naquela hora. O que cairia depois de agora não acontece: a ordem fica na etapa em
# que estava, e a conta, sem pagar.
class Agenda:
    def __init__(self, agora: datetime) -> None:
        self.agora = agora
        self._fila: list[_Compromisso] = []
        self._chegadas = itertools.count()

    def marcar(self, momento: datetime, tarefa: Tarefa) -> None:
        if momento <= self.agora:
            heapq.heappush(self._fila, _Compromisso(momento, next(self._chegadas), tarefa))

    def cumprir(self) -> None:
        while self._fila:
            compromisso = heapq.heappop(self._fila)
            compromisso.tarefa(compromisso.momento)
