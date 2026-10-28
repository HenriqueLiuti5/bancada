from typing import Any

from django.core.management.base import BaseCommand, CommandError, CommandParser

from bancada.clientes.models import Cliente
from bancada.ordens.models import OrdemServico
from bancada.plataforma import exclusao


class Command(BaseCommand):
    help = (
        "Apaga uma assistência com todos os dados, a pedido do dono. Ficam só as cobranças, pela "
        "lei fiscal, e os registros de acesso, até completarem 6 meses"
    )

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("email", help="E-mail do dono da assistência")
        parser.add_argument(
            "--confirmar",
            metavar="NOME",
            help="Nome da assistência, para confirmar sem a pergunta",
        )

    def handle(self, *args: Any, email: str, confirmar: str | None, **options: Any) -> None:
        tenant = exclusao.assistencia_do_dono(email)
        if tenant is None:
            raise CommandError(f"Nenhum dono de assistência com o e-mail {email}.")

        ordens = OrdemServico.objects.filter(tenant=tenant).count()
        clientes = Cliente.objects.filter(tenant=tenant).count()
        self.stdout.write(f"{tenant.nome}: {ordens} ordens e {clientes} clientes.")

        nome = confirmar
        if nome is None:
            nome = input("Para apagar tudo, digite o nome da assistência: ")
        if nome.strip() != tenant.nome:
            raise CommandError("O nome não confere. Nada foi apagado.")

        exclusao.apagar_assistencia(tenant, motivo=exclusao.A_PEDIDO_DO_DONO)
        self.stdout.write(self.style.SUCCESS(f"{tenant.nome} apagada."))
