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
        return health.CheckResult("redis", False, "connection refused")

    monkeypatch.setattr(health, "check_redis", redis_fora_do_ar)

    response = APIClient().get(reverse("health"))

    assert response.status_code == 503
    assert response.json()["status"] == "degraded"
