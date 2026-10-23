import logging

from celery import shared_task

from bancada.core.fuso import hoje_no_bancada
from bancada.financeiro.models import ContaFixa

registrador = logging.getLogger(__name__)


@shared_task(name="financeiro.criar_contas_fixas")
def criar_contas_fixas() -> int:
    hoje = hoje_no_bancada()
    criadas = 0
    for conta_fixa in ContaFixa.objects.filter(ativa=True):
        criadas += len(conta_fixa.criar_as_proximas(hoje))

    if criadas:
        registrador.info("Contas fixas criadas para os próximos meses: %s", criadas)

    return criadas
