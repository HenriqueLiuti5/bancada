from typing import Any

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from bancada.orientacao.serializers import TOURS
from bancada.tenants.models import Usuario


class Command(BaseCommand):
    help = (
        "Deixa o dono da assistência de exemplo pronto para as capturas de tela da página inicial, "
        "sem tour nem primeiros passos na frente das telas"
    )

    def handle(self, *args: Any, **options: Any) -> None:
        if not settings.DEBUG:
            raise CommandError("Este comando só roda com DJANGO_DEBUG=1")

        preparados = Usuario.objects.filter(
            username="marcos", tenant__slug="assistencia-central"
        ).update(tours_vistos=TOURS, primeiros_passos_escondidos=True)
        if not preparados:
            raise CommandError("Rode make semear antes, para criar o dono de exemplo.")

        self.stdout.write(self.style.SUCCESS("O dono de exemplo está pronto para as capturas."))
