from typing import Any

from django.db.models.signals import post_save
from django.dispatch import receiver

from reparium.assinaturas.servicos import abrir_teste
from reparium.core.fuso import hoje_no_reparium
from reparium.tenants.models import Tenant


@receiver(post_save, sender=Tenant)
def abrir_teste_da_assistencia_nova(
    sender: type, instance: Tenant, created: bool, raw: bool = False, **kwargs: Any
) -> None:
    if created and not raw:
        abrir_teste(instance, hoje_no_reparium())
