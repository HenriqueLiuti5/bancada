from typing import Any

from django.core.management.base import BaseCommand

from bancada.assinaturas.tasks import sincronizar_cobrancas


class Command(BaseCommand):
    help = "Busca no Asaas as faturas das assinaturas, sem esperar a tarefa de hora em hora"

    def handle(self, *args: Any, **options: Any) -> None:
        sincronizadas = sincronizar_cobrancas()
        self.stdout.write(f"Assinaturas sincronizadas com o Asaas: {sincronizadas}")
