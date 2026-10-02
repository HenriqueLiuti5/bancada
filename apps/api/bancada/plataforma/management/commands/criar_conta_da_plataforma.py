from getpass import getpass
from typing import Any

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError, CommandParser
from django.core.validators import validate_email
from django.utils import timezone

from bancada.tenants.models import Usuario, normalizar_email


class Command(BaseCommand):
    help = "Cria a conta da plataforma, que vê o painel com os números de todas as assistências"

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("--nome", help="Seu nome, como aparece nas mensagens")
        parser.add_argument("--email", help="E-mail para entrar e para receber os avisos")

    def handle(self, *args: Any, **options: Any) -> None:
        nome = (options["nome"] or input("Nome: ")).strip()
        email = normalizar_email(options["email"] or input("E-mail: "))
        if not nome:
            raise CommandError("Informe o nome.")
        try:
            validate_email(email)
        except ValidationError as erro:
            raise CommandError("Esse e-mail não parece válido.") from erro
        if Usuario.email_em_uso(email):
            raise CommandError("Já existe uma conta com esse e-mail.")

        senha = getpass("Senha: ")
        if senha != getpass("Repita a senha: "):
            raise CommandError("As duas senhas não são iguais.")
        try:
            validate_password(senha, Usuario(username=email, email=email, first_name=nome))
        except ValidationError as erro:
            raise CommandError(" ".join(erro.messages)) from erro

        Usuario.objects.create_user(
            username=email,
            email=email,
            password=senha,
            first_name=nome,
            da_plataforma=True,
            email_confirmado_em=timezone.now(),
        )
        self.stdout.write(
            self.style.SUCCESS(f"Conta da plataforma criada. Entre com {email} na tela de login.")
        )
