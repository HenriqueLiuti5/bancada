import logging

from celery import shared_task
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from bancada.assinaturas import regras, servicos
from bancada.assinaturas.models import Assinatura, SituacaoDaAssinatura
from bancada.assinaturas.provedor import ErroNoProvedor, provedor_configurado
from bancada.tenants.models import Papel, Usuario
from bancada.tenants.tasks import REPETIR_SE_O_ENVIO_FALHAR, enviar

registrador = logging.getLogger(__name__)

SEM_DESTINO = "sem destino"
JA_ASSINOU = "ja assinou"
ENVIADO = "enviado"


def quando_termina(dias: int) -> str:
    if dias <= 0:
        return "hoje"
    if dias == 1:
        return "amanhã"
    return f"em {dias} dias"


@shared_task(name="assinaturas.avisar_fim_do_teste", **REPETIR_SE_O_ENVIO_FALHAR)
def avisar_fim_do_teste(assinatura_id: int) -> str:
    assinatura = Assinatura.objects.select_related("tenant").filter(pk=assinatura_id).first()
    if assinatura is None:
        return SEM_DESTINO
    if assinatura.contratada:
        return JA_ASSINOU

    donos = Usuario.objects.filter(
        tenant=assinatura.tenant, papel=Papel.DONO, is_active=True
    ).exclude(email="")
    quando = quando_termina((assinatura.teste_termina_em - timezone.localdate()).days)

    for dono in donos:
        enviar(
            dono.email,
            f"Seu teste grátis do Bancada termina {quando}",
            "assinaturas/fim_do_teste.txt",
            {
                "primeiro_nome": dono.nome_de_exibicao.split()[0],
                "assistencia": assinatura.tenant.nome,
                "quando": quando,
                "teste_termina_em": assinatura.teste_termina_em,
                "valor": settings.VALOR_DA_ASSINATURA,
                "link": f"{settings.APP_PUBLIC_URL}/assinatura",
            },
        )
    return ENVIADO if donos else SEM_DESTINO


@shared_task(name="assinaturas.revisar_assinaturas")
def revisar_assinaturas() -> int:
    hoje = timezone.localdate()
    mudaram = 0

    for assinatura in Assinatura.objects.exclude(situacao=SituacaoDaAssinatura.CANCELADA):
        antes = assinatura.situacao
        servicos.recalcular(assinatura, hoje)
        mudaram += assinatura.situacao != antes

        pendentes = regras.avisos_de_fim_do_teste_pendentes(assinatura, hoje)
        if pendentes:
            assinatura.avisos_de_fim_do_teste = [*assinatura.avisos_de_fim_do_teste, *pendentes]
            assinatura.save(update_fields=["avisos_de_fim_do_teste", "atualizado_em"])
            avisar_fim_do_teste.delay(assinatura.pk)

    return mudaram


@shared_task(name="assinaturas.sincronizar_cobrancas")
def sincronizar_cobrancas() -> int:
    hoje = timezone.localdate()
    provedor = provedor_configurado()
    sincronizadas = 0

    contratadas = (
        Assinatura.objects.select_related("tenant")
        .exclude(assinatura_no_provedor="")
        .exclude(situacao=SituacaoDaAssinatura.CANCELADA)
    )
    for assinatura in contratadas:
        try:
            with transaction.atomic():
                servicos.sincronizar(assinatura, provedor, hoje)
        except ErroNoProvedor as erro:
            registrador.warning(
                "Cobranças da %s não sincronizadas: %s", assinatura.tenant.nome, erro
            )
            continue
        sincronizadas += 1

    return sincronizadas
