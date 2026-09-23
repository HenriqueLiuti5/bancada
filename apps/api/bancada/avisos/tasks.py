import logging
from datetime import timedelta
from smtplib import SMTPException

from celery import shared_task
from django.conf import settings
from django.core.mail import EmailMessage
from django.db.models import F, Q
from django.template.loader import render_to_string
from django.utils import timezone

from bancada.avisos.models import AvisoDeStatus
from bancada.avisos.regras import AVISOS, ModeloDeAviso, modelo_para
from bancada.ordens import documentos
from bancada.ordens.models import EventoOS, OrdemServico

registrador = logging.getLogger(__name__)

EVENTO_SUMIU = "evento inexistente"
STATUS_NAO_AVISA = "status nao avisa"
CLIENTE_SEM_EMAIL = "cliente sem email"
JA_ENVIADO = "ja enviado"
ENVIADO = "enviado"

HORAS_PARA_RECUPERAR_UM_AVISO = 24
TENTATIVAS_ANTES_DE_DESISTIR = 5


def montar_mensagem(
    ordem: OrdemServico, modelo: ModeloDeAviso, assunto: str, corpo: str, destino: str
) -> EmailMessage:
    mensagem = EmailMessage(
        subject=assunto,
        body=corpo,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[destino],
    )
    if modelo.anexa_recibo:
        mensagem.attach(
            documentos.nome_do_arquivo(ordem, "recibo"),
            documentos.recibo_em_pdf(ordem),
            "application/pdf",
        )
    return mensagem


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
        montar_mensagem(ordem, modelo, aviso.assunto, corpo, destino).send()
    except Exception as erro:
        aviso.erro = str(erro)[:500]
        aviso.save(update_fields=["tentativas", "erro", "atualizado_em"])
        registrador.warning("Falha ao avisar %s sobre a OS #%s: %s", destino, ordem.numero, erro)
        raise

    aviso.enviado_em = timezone.now()
    aviso.erro = ""
    aviso.save(update_fields=["tentativas", "enviado_em", "erro", "atualizado_em"])
    return ENVIADO


def eventos_sem_aviso() -> list[int]:
    limite = timezone.now() - timedelta(hours=HORAS_PARA_RECUPERAR_UM_AVISO)

    consulta = (
        EventoOS.objects.filter(
            para_status__in=list(AVISOS),
            para_status=F("ordem__status"),
            criado_em__gte=limite,
        )
        .exclude(ordem__cliente__email="")
        .filter(
            Q(aviso__isnull=True)
            | Q(
                aviso__enviado_em__isnull=True,
                aviso__tentativas__lt=TENTATIVAS_ANTES_DE_DESISTIR,
            )
        )
    )

    return list(consulta.values_list("pk", flat=True))


@shared_task(name="avisos.recuperar_avisos_perdidos")
def recuperar_avisos_perdidos() -> int:
    pendentes = eventos_sem_aviso()

    for evento_id in pendentes:
        avisar_cliente.delay(evento_id)

    if pendentes:
        registrador.info("Avisos recolocados na fila: %s", len(pendentes))

    return len(pendentes)
