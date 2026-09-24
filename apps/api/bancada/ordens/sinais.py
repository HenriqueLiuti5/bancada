from typing import Any

from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from bancada.ordens import publico
from bancada.ordens.models import EventoOS, FotoOS, ItemOrcamento


@receiver(post_save, sender=EventoOS)
def limpar_cache_ao_mudar_status(sender: type, instance: EventoOS, **kwargs: Any) -> None:
    publico.invalidar(instance.ordem.token_publico)


@receiver(post_save, sender=ItemOrcamento)
@receiver(post_delete, sender=ItemOrcamento)
def limpar_cache_ao_mudar_orcamento(sender: type, instance: ItemOrcamento, **kwargs: Any) -> None:
    publico.invalidar(instance.ordem.token_publico)


@receiver(post_save, sender=FotoOS)
@receiver(post_delete, sender=FotoOS)
def limpar_cache_ao_mudar_fotos(sender: type, instance: FotoOS, **kwargs: Any) -> None:
    publico.invalidar(instance.ordem.token_publico)


@receiver(post_delete, sender=FotoOS)
def apagar_arquivo_da_foto(sender: type, instance: FotoOS, **kwargs: Any) -> None:
    instance.arquivo.delete(save=False)
