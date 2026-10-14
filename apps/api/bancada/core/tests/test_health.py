import pytest
from django.urls import reverse
from rest_framework.test import APIClient


@pytest.mark.django_db
def test_health_retorna_ok_quando_servicos_respondem() -> None:
    response = APIClient().get(reverse("health"))

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


@pytest.mark.django_db
def test_health_lista_os_servicos_verificados() -> None:
    response = APIClient().get(reverse("health"))

    assert set(response.json()["checks"]) == {"database", "redis"}


@pytest.mark.django_db
def test_health_reporta_degraded_quando_um_servico_falha(monkeypatch: pytest.MonkeyPatch) -> None:
    from bancada.core import health

    def redis_fora_do_ar() -> health.CheckResult:
        return health.CheckResult("redis", False)

    monkeypatch.setattr(health, "check_redis", redis_fora_do_ar)

    response = APIClient().get(reverse("health"))

    assert response.status_code == 503
    assert response.json()["status"] == "degraded"


@pytest.mark.django_db
def test_health_nao_mostra_o_erro_interno(monkeypatch: pytest.MonkeyPatch) -> None:
    from bancada.core import health

    def recusar(*args: object, **kwargs: object) -> None:
        raise ConnectionError("redis://:senha-secreta@redis-interno:6379 recusou a conexão")

    monkeypatch.setattr(health.redis.Redis, "from_url", recusar)

    response = APIClient().get(reverse("health"))

    assert response.status_code == 503
    assert response.json()["checks"]["redis"] == {"ok": False}
    assert b"senha-secreta" not in response.content
    assert b"redis-interno" not in response.content
