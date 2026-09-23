import logging
from smtplib import SMTPException

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone

from bancada.avisos.models import AvisoDeStatus
from bancada.avisos.regras import modelo_para
from bancada.ordens.models import EventoOS

registrador = logging.getLogger(__name__)

EVENTO_SUMIU = "evento inexistente"
STATUS_NAO_AVISA = "status nao avisa"
CLIENTE_SEM_EMAIL = "cliente sem email"
JA_ENVIADO = "ja enviado"
ENVIADO = "enviado"


def _evento(evento_id: int) -> EventoOS | None:
    return (
        EventoOS.objects.select_related(
            "ordem__cliente",
            "ordem__aparelho",
            "ordem__tenant",
            "ordem__loja",
        )
        .filter(pk=evento_id)
        .first()
    )


@shared_task(
    name="avisos.avisar_cliente",
    autoretry_for=(SMTPException, OSError),
    retry_backoff=True,
    retry_jitter=True,
    retry_kwargs={"max_retries": 5},
)
def avisar_cliente(evento_id: int) -> str:
    evento = _evento(evento_id)
    if evento is None:
        return EVENTO_SUMIU

    modelo = modelo_para(evento.para_status)
    if modelo is None:
        return STATUS_NAO_AVISA

    ordem = evento.ordem
    destino = ordem.cliente.email.strip()
    if not destino:
        return CLIENTE_SEM_EMAIL

    aparelho = f"{ordem.aparelho.marca} {ordem.aparelho.modelo}"
    aviso, _ = AvisoDeStatus.objects.get_or_create(
        evento=evento,
        defaults={
            "tenant": ordem.tenant,
            "destino": destino,
            "assunto": modelo.assunto.format(aparelho=aparelho),
        },
    )
    if aviso.enviado_em:
        return JA_ENVIADO

    corpo = render_to_string(
        "avisos/aviso_de_status.txt",
        {
            "primeiro_nome": ordem.cliente.nome.split()[0],
            "chamada": modelo.chamada,
            "aparelho": aparelho,
            "link": f"{settings.APP_PUBLIC_URL}/os/{ordem.token_publico}",
            "numero": ordem.numero,
            "assistencia": ordem.tenant.nome,
            "telefone": ordem.loja.telefone,
        },
    )

    aviso.tentativas += 1
    try:
        send_mail(aviso.assunto, corpo, settings.DEFAULT_FROM_EMAIL, [destino])
    except Exception as erro:
        aviso.erro = str(erro)[:500]
        aviso.save(update_fields=["tentativas", "erro", "atualizado_em"])
        registrador.warning("Falha ao avisar %s sobre a OS #%s: %s", destino, ordem.numero, erro)
        raise

    aviso.enviado_em = timezone.now()
    aviso.erro = ""
    aviso.save(update_fields=["tentativas", "enviado_em", "erro", "atualizado_em"])
    return ENVIADO
