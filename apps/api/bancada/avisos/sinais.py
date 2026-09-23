from typing import Any

from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from bancada.avisos.regras import modelo_para
from bancada.avisos.tasks import avisar_cliente
from bancada.ordens.models import EventoOS


@receiver(post_save, sender=EventoOS)
def avisar_cliente_ao_mudar_status(
    sender: type, instance: EventoOS, created: bool, **kwargs: Any
) -> None:
    if not created or modelo_para(instance.para_status) is None:
        return

    evento_id = instance.pk
    transaction.on_commit(lambda: avisar_cliente.delay(evento_id))
