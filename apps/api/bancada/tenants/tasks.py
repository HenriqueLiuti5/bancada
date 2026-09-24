import logging
from smtplib import SMTPException
from typing import Any

from celery import shared_task
from django.conf import settings
from django.core.mail import EmailMessage
from django.template.loader import render_to_string

from bancada.tenants.links import link_de_confirmacao, link_de_recuperacao, link_do_convite
from bancada.tenants.models import Convite, Usuario

registrador = logging.getLogger(__name__)

SEM_DESTINO = "sem destino"
JA_CONFIRMADO = "ja confirmado"
CONVITE_INDISPONIVEL = "convite indisponivel"
ENVIADO = "enviado"

REPETIR_SE_O_ENVIO_FALHAR: dict[str, Any] = {
    "autoretry_for": (SMTPException, OSError),
    "retry_backoff": True,
    "retry_jitter": True,
    "retry_kwargs": {"max_retries": 5},
}


def enviar(destino: str, assunto: str, modelo: str, contexto: dict[str, Any]) -> None:
    corpo = render_to_string(modelo, contexto)
    EmailMessage(
        subject=assunto,
        body=corpo,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[destino],
    ).send()


def _usuario_ativo(usuario_id: int) -> Usuario | None:
    return (
        Usuario.objects.select_related("tenant")
        .filter(pk=usuario_id, is_active=True, tenant__isnull=False)
        .exclude(email="")
        .first()
    )


@shared_task(name="tenants.enviar_confirmacao_de_email", **REPETIR_SE_O_ENVIO_FALHAR)
def enviar_confirmacao_de_email(usuario_id: int) -> str:
    usuario = _usuario_ativo(usuario_id)
    if usuario is None:
        return SEM_DESTINO
    if usuario.email_confirmado:
        return JA_CONFIRMADO

    enviar(
        usuario.email,
        "Confirme seu e-mail no Bancada",
        "contas/confirmacao_de_email.txt",
        {
            "primeiro_nome": usuario.nome_de_exibicao.split()[0],
            "assistencia": usuario.tenant.nome if usuario.tenant else "",
            "link": link_de_confirmacao(usuario),
        },
    )
    return ENVIADO


@shared_task(name="tenants.enviar_recuperacao_de_senha", **REPETIR_SE_O_ENVIO_FALHAR)
def enviar_recuperacao_de_senha(usuario_id: int) -> str:
    usuario = _usuario_ativo(usuario_id)
    if usuario is None:
        return SEM_DESTINO

    enviar(
        usuario.email,
        "Crie uma nova senha no Bancada",
        "contas/recuperacao_de_senha.txt",
        {
            "primeiro_nome": usuario.nome_de_exibicao.split()[0],
            "link": link_de_recuperacao(usuario),
            "horas_de_validade": settings.PASSWORD_RESET_TIMEOUT // 3600,
        },
    )
    return ENVIADO


@shared_task(name="tenants.enviar_convite", **REPETIR_SE_O_ENVIO_FALHAR)
def enviar_convite(convite_id: int) -> str:
    convite = (
        Convite.objects.select_related("tenant", "criado_por")
        .filter(pk=convite_id)
        .exclude(email="")
        .first()
    )
    if convite is None:
        return SEM_DESTINO
    if convite.aceito or convite.expirado:
        return CONVITE_INDISPONIVEL

    quem_convidou = convite.criado_por.nome_de_exibicao if convite.criado_por else ""
    enviar(
        convite.email,
        f"Convite para a equipe da {convite.tenant.nome} no Bancada",
        "contas/convite.txt",
        {
            "primeiro_nome": convite.nome.split()[0],
            "quem_convidou": quem_convidou,
            "assistencia": convite.tenant.nome,
            "papel": convite.get_papel_display().lower(),
            "link": link_do_convite(convite),
            "expira_em": convite.expira_em,
        },
    )
    return ENVIADO
