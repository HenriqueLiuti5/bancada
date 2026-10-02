from typing import Any

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

from bancada.assinaturas.servicos import abrir_teste
from bancada.tenants.models import Tenant


@receiver(post_save, sender=Tenant)
def abrir_teste_da_assistencia_nova(
    sender: type, instance: Tenant, created: bool, raw: bool = False, **kwargs: Any
) -> None:
    if created and not raw:
        abrir_teste(instance, timezone.localdate())
