import logging
from dataclasses import dataclass

import redis
from django.conf import settings
from django.db import connections

registrador = logging.getLogger(__name__)


@dataclass(frozen=True)
class CheckResult:
    name: str
    ok: bool


def check_database() -> CheckResult:
    try:
        with connections["default"].cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
    except Exception:
        registrador.warning("O banco de dados não respondeu ao health check.", exc_info=True)
        return CheckResult("database", False)
    return CheckResult("database", True)


def check_redis() -> CheckResult:
    try:
        client = redis.Redis.from_url(settings.REDIS_URL, socket_connect_timeout=2)
        client.ping()
    except Exception:
        registrador.warning("O Redis não respondeu ao health check.", exc_info=True)
        return CheckResult("redis", False)
    return CheckResult("redis", True)


def run_all_checks() -> list[CheckResult]:
    return [check_database(), check_redis()]
