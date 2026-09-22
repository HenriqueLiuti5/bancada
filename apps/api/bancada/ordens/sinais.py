from typing import Any

from django.db.models.signals import post_save
from django.dispatch import receiver

from bancada.ordens import publico
from bancada.ordens.models import EventoOS, ItemOrcamento


@receiver(post_save, sender=EventoOS)
def limpar_cache_ao_mudar_status(sender: type, instance: EventoOS, **kwargs: Any) -> None:
    publico.invalidar(instance.ordem.token_publico)


@receiver(post_save, sender=ItemOrcamento)
def limpar_cache_ao_mudar_orcamento(sender: type, instance: ItemOrcamento, **kwargs: Any) -> None:
    publico.invalidar(instance.ordem.token_publico)
