import calendar
import logging
from datetime import datetime

from celery import shared_task
from django.utils import timezone

from bancada.auditoria.models import Acao, RegistroDeAuditoria

registrador = logging.getLogger(__name__)

# O Marco Civil da Internet (Lei nº 12.965/2014, art. 15) manda guardar os registros de acesso por
# seis meses. Depois disso, a política de privacidade promete apagá-los.
MESES_DOS_REGISTROS_DE_ACESSO = 6
REGISTROS_DE_ACESSO = (Acao.ENTRADA, Acao.LOGIN_RECUSADO)


def meses_antes(momento: datetime, meses: int) -> datetime:
    ano, indice_do_mes = divmod(momento.year * 12 + momento.month - 1 - meses, 12)
    mes = indice_do_mes + 1
    dia = min(momento.day, calendar.monthrange(ano, mes)[1])
    return momento.replace(year=ano, month=mes, day=dia)


@shared_task(name="auditoria.apagar_registros_de_acesso_vencidos")
def apagar_registros_de_acesso_vencidos() -> int:
    limite = meses_antes(timezone.now(), MESES_DOS_REGISTROS_DE_ACESSO)
    apagados, _ = RegistroDeAuditoria.objects.filter(
        acao__in=REGISTROS_DE_ACESSO, criado_em__lt=limite
    ).delete()

    if apagados:
        registrador.info("Registros de acesso apagados: %s", apagados)

    return apagados
