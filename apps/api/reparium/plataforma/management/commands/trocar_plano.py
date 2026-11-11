from typing import Any

from django.core.management.base import BaseCommand, CommandError, CommandParser
from django.db import transaction

from reparium.assinaturas import servicos
from reparium.assinaturas.models import Ciclo, Plano
from reparium.assinaturas.provedor import ErroNoProvedor
from reparium.auditoria.models import Acao
from reparium.auditoria.registro import registrar
from reparium.core.formatos import em_reais
from reparium.plataforma import exclusao


class Command(BaseCommand):
    help = (
        "Troca o plano da assinatura de uma assistência, no mesmo ciclo. O valor novo vale a "
        "partir da próxima fatura, também no Asaas"
    )

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("email", help="E-mail do dono da assistência")
        parser.add_argument("plano", choices=Plano.values, help="Plano novo")

    def handle(self, *args: Any, email: str, plano: str, **options: Any) -> None:
        tenant = exclusao.assistencia_do_dono(email)
        if tenant is None:
            raise CommandError(f"Nenhum dono de assistência com o e-mail {email}.")

        try:
            with transaction.atomic():
                troca = servicos.trocar_plano(tenant, plano)
                assinatura = troca.assinatura
                anterior = Plano(troca.plano_anterior).label
                registrar(
                    tenant=tenant,
                    acao=Acao.PLANO_TROCADO,
                    objeto="assinatura",
                    objeto_id=assinatura.pk,
                    detalhe=f"{anterior} para {servicos.resumo_do_preco(assinatura)}",
                )
        except (servicos.AssinaturaIndisponivel, servicos.PlanoNaoCabe, ErroNoProvedor) as erro:
            raise CommandError(f"{erro} Nada foi trocado.") from erro

        novo = assinatura.get_plano_display()
        periodo = "ano" if assinatura.ciclo == Ciclo.ANUAL else "mês"
        self.stdout.write(
            self.style.SUCCESS(
                f"{tenant.nome} passou do plano {anterior} para o {novo}: "
                f"{em_reais(troca.valor)} por {periodo} a partir da próxima fatura."
            )
        )
