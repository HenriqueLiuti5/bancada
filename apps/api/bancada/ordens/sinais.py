from typing import Any

from django.db import transaction
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from bancada.clientes.models import Aparelho, Cliente
from bancada.ordens import publico
from bancada.ordens.models import EventoOS, FotoOS, ItemOrcamento


@receiver(post_save, sender=Cliente)
@receiver(post_save, sender=Aparelho)
def limpar_cache_ao_corrigir_cadastro(
    sender: type, instance: Cliente | Aparelho, created: bool, **kwargs: Any
) -> None:
    if created:
        return
    for token in instance.ordens.values_list("token_publico", flat=True):
        publico.invalidar(token)


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
    nome = instance.arquivo.name
    armazenamento = instance.arquivo.storage
    if nome:
        transaction.on_commit(lambda: armazenamento.delete(nome))
