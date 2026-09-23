import logging
from datetime import timedelta

from celery import shared_task
from django.db.models import Count, Max, Q
from django.utils import timezone

from bancada.auditoria.models import Acao
from bancada.auditoria.registro import registrar
from bancada.clientes.models import Aparelho
from bancada.ordens.estados import ESTADOS_FINAIS

registrador = logging.getLogger(__name__)

DIAS_DE_CARENCIA_APOS_A_ENTREGA = 7


def aparelhos_com_senha_vencida() -> list[Aparelho]:
    limite = timezone.now() - timedelta(days=DIAS_DE_CARENCIA_APOS_A_ENTREGA)

    consulta = (
        Aparelho.objects.exclude(senha_desbloqueio="")
        .annotate(
            abertas=Count("ordens", filter=~Q(ordens__status__in=ESTADOS_FINAIS)),
            encerradas=Count("ordens", filter=Q(ordens__status__in=ESTADOS_FINAIS)),
            ultimo_encerramento=Max(
                "ordens__atualizado_em", filter=Q(ordens__status__in=ESTADOS_FINAIS)
            ),
        )
        .filter(abertas=0, encerradas__gt=0, ultimo_encerramento__lte=limite)
    )

    return list(consulta.select_related("tenant"))


@shared_task(name="clientes.purgar_senhas_de_desbloqueio")
def purgar_senhas_de_desbloqueio() -> int:
    purgados = 0

    for aparelho in aparelhos_com_senha_vencida():
        aparelho.senha_desbloqueio = ""
        aparelho.save(update_fields=["senha_desbloqueio", "atualizado_em"])
        registrar(
            tenant=aparelho.tenant,
            acao=Acao.SENHA_PURGADA,
            objeto="aparelho",
            objeto_id=aparelho.pk,
            detalhe=f"{aparelho} — {DIAS_DE_CARENCIA_APOS_A_ENTREGA} dias após a entrega",
        )
        purgados += 1

    if purgados:
        registrador.info("Senhas de desbloqueio removidas: %s", purgados)

    return purgados
