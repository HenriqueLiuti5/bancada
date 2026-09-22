from dataclasses import dataclass

import redis
from django.conf import settings
from django.db import connections


@dataclass(frozen=True)
class CheckResult:
    name: str
    ok: bool
    detail: str


def check_database() -> CheckResult:
    try:
        with connections["default"].cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
    except Exception as exc:
        return CheckResult("database", False, str(exc))
    return CheckResult("database", True, "ok")


def check_redis() -> CheckResult:
    try:
        client = redis.Redis.from_url(settings.REDIS_URL, socket_connect_timeout=2)
        client.ping()
    except Exception as exc:
        return CheckResult("redis", False, str(exc))
    return CheckResult("redis", True, "ok")


def run_all_checks() -> list[CheckResult]:
    return [check_database(), check_redis()]
