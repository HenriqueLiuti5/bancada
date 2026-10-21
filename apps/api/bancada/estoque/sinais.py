from typing import Any

from django.db.models.signals import post_save
from django.dispatch import receiver

from bancada.estoque.models import baixar_pecas_da_ordem, guardar_custo_das_pecas
from bancada.ordens.estados import StatusOS
from bancada.ordens.models import EventoOS


# A peça aprovada sai do estoque na hora da aprovação, na mesma transação que muda a etapa. Uma
# ordem aprovada só segue para o reparo e a entrega, então a peça não volta. Na entrega, o custo de
# cada peça fica guardado no item, para o lucro da ordem não mudar com as compras seguintes.
@receiver(post_save, sender=EventoOS)
def acompanhar_o_estoque_da_ordem(
    sender: type, instance: EventoOS, created: bool, **kwargs: Any
) -> None:
    if not created:
        return
    if instance.para_status == StatusOS.APROVADO:
        baixar_pecas_da_ordem(instance.ordem, instance.usuario_id)
    elif instance.para_status == StatusOS.ENTREGUE:
        guardar_custo_das_pecas(instance.ordem)
