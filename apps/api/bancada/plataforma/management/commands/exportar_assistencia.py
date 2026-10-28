from typing import Any

from django.core.management.base import BaseCommand, CommandError, CommandParser

from bancada.plataforma import copia
from bancada.plataforma.exclusao import assistencia_do_dono


class Command(BaseCommand):
    help = "Grava num .zip a cópia dos dados de uma assistência, para o dono que pedir"

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("email", help="E-mail do dono da assistência")
        parser.add_argument("--saida", required=True, help="Caminho do .zip a gravar")

    def handle(self, *args: Any, email: str, saida: str, **options: Any) -> None:
        tenant = assistencia_do_dono(email)
        if tenant is None:
            raise CommandError(f"Nenhum dono de assistência com o e-mail {email}.")

        with open(saida, "wb") as arquivo:
            copia.exportar(tenant, arquivo)

        self.stdout.write(self.style.SUCCESS(f"Cópia da {tenant.nome} gravada em {saida}."))
