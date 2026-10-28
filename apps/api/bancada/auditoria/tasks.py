import logging

from celery import shared_task
from django.utils import timezone

from bancada.auditoria.models import Acao, RegistroDeAuditoria
from bancada.core.calendario import somar_meses

registrador = logging.getLogger(__name__)

# O Marco Civil da Internet (Lei nº 12.965/2014, art. 15) manda guardar os registros de acesso por
# seis meses. Depois disso, a política de privacidade promete apagá-los.
MESES_DOS_REGISTROS_DE_ACESSO = 6
REGISTROS_DE_ACESSO = (Acao.ENTRADA, Acao.LOGIN_RECUSADO)


@shared_task(name="auditoria.apagar_registros_de_acesso_vencidos")
def apagar_registros_de_acesso_vencidos() -> int:
    limite = somar_meses(timezone.now(), -MESES_DOS_REGISTROS_DE_ACESSO)
    apagados, _ = RegistroDeAuditoria.objects.filter(
        acao__in=REGISTROS_DE_ACESSO, criado_em__lt=limite
    ).delete()

    if apagados:
        registrador.info("Registros de acesso apagados: %s", apagados)

    return apagados
