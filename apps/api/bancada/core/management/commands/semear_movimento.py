from typing import Any

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from bancada.clientes.models import Cliente
from bancada.core.exemplo.oficina import PREFIXO_DOS_TELEFONES
from bancada.core.exemplo.simulacao import EquipeIncompleta, simular
from bancada.tenants.models import Tenant


class Command(BaseCommand):
    help = (
        "Cria seis meses de movimento fictício na assistência de demonstração: ordens, peças, "
        "vendas no balcão, contas e conferências do caixa"
    )

    def handle(self, *args: Any, **options: Any) -> None:
        if not settings.DEBUG:
            raise CommandError("Este comando só roda com DJANGO_DEBUG=1")

        tenant = Tenant.objects.filter(slug="assistencia-central").first()
        if tenant is None:
            raise CommandError("Rode make semear antes, para criar a assistência de exemplo.")

        if Cliente.objects.filter(
            tenant=tenant, telefone__startswith=PREFIXO_DOS_TELEFONES
        ).exists():
            self.stdout.write(self.style.WARNING("O movimento já foi criado; nada mudou."))
            return

        try:
            with transaction.atomic():
                resumo = simular(tenant, timezone.now())
        except EquipeIncompleta as erro:
            raise CommandError(
                "Rode make semear antes, para criar a equipe e a loja de exemplo."
            ) from erro

        self.stdout.write(
            self.style.SUCCESS(
                f"Movimento desde {resumo.inicio:%d/%m/%Y}: {resumo.ordens} ordens, "
                f"{resumo.vendas} vendas no balcão, {resumo.contas} contas e "
                f"{resumo.conferencias} conferências do caixa."
            )
        )
