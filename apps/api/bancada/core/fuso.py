from collections.abc import Callable
from datetime import date
from zoneinfo import ZoneInfo

from django.conf import settings
from django.http import HttpRequest, HttpResponse
from django.utils import timezone

from bancada.core.telefones import telefone_brasileiro
from bancada.tenants.models import FusoHorario, Tenant

DDDS_FORA_DE_BRASILIA: dict[str, frozenset[int]] = {
    FusoHorario.AMAZONAS: frozenset([65, 66, 67, 69, 92, 95, 97]),
    FusoHorario.ACRE: frozenset([68]),
}


def fuso_pelo_telefone(telefone: str) -> str:
    digitos = telefone_brasileiro(telefone)
    if digitos is None:
        return FusoHorario.BRASILIA
    ddd = int(digitos[:2])
    for fuso, ddds in DDDS_FORA_DE_BRASILIA.items():
        if ddd in ddds:
            return fuso
    return FusoHorario.BRASILIA


def ativar_o_fuso_da(tenant: Tenant | None) -> None:
    if tenant is not None:
        timezone.activate(tenant.fuso_horario)


def hoje_no_bancada() -> date:
    return timezone.localdate(timezone=ZoneInfo(settings.TIME_ZONE))


class FusoDoPedido:
    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        timezone.deactivate()
        try:
            return self.get_response(request)
        finally:
            timezone.deactivate()
