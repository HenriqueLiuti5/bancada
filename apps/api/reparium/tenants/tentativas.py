import hashlib
from datetime import timedelta

from django.core.cache import cache

FALHAS_ATE_BLOQUEAR = 10
DURACAO_DO_BLOQUEIO = timedelta(hours=1)
LOGIN_BLOQUEADO = (
    "Muitas tentativas erradas com este e-mail. Espere uma hora ou use “Esqueci minha senha”."
)


def _chave(email: str) -> str:
    return f"login-falhas:{hashlib.sha256(email.encode()).hexdigest()}"


def bloqueado(email: str) -> bool:
    return cache.get(_chave(email), 0) >= FALHAS_ATE_BLOQUEAR


def registrar_falha(email: str) -> None:
    chave = _chave(email)
    segundos = int(DURACAO_DO_BLOQUEIO.total_seconds())
    cache.add(chave, 0, timeout=segundos)
    try:
        cache.incr(chave)
    except ValueError:
        cache.set(chave, 1, timeout=segundos)


def esquecer_falhas(email: str) -> None:
    cache.delete(_chave(email))
