from django.conf import settings
from django.db import models

from bancada.core.models import Carimbado


class Custo(Carimbado):
    mes = models.DateField(help_text="Primeiro dia do mês em que o custo foi pago.")
    descricao = models.CharField(max_length=80)
    valor = models.DecimalField(max_digits=10, decimal_places=2)
    lancado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="custos_lancados",
        null=True,
        blank=True,
    )

    class Meta:
        verbose_name = "custo da plataforma"
        verbose_name_plural = "custos da plataforma"
        ordering = ["-mes", "criado_em"]
        constraints = [
            models.CheckConstraint(condition=models.Q(valor__gt=0), name="custo_positivo"),
        ]

    def __str__(self) -> str:
        return f"{self.descricao} ({self.mes:%m/%Y})"
