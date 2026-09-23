from django.conf import settings
from django.db import models

from bancada.core.models import PertenceAoTenant


class Acao(models.TextChoices):
    SENHA_VISTA = "senha_vista", "Senha de desbloqueio consultada"
    SENHA_NEGADA = "senha_negada", "Consulta à senha negada"
    SENHA_PURGADA = "senha_purgada", "Senha de desbloqueio removida"


class RegistroDeAuditoria(PertenceAoTenant):
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="registros_de_auditoria",
        null=True,
        blank=True,
    )
    acao = models.CharField(max_length=30, choices=Acao.choices)
    objeto = models.CharField(max_length=40)
    objeto_id = models.PositiveBigIntegerField()
    detalhe = models.CharField(max_length=200, blank=True)
    origem = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        verbose_name = "registro de auditoria"
        verbose_name_plural = "registros de auditoria"
        ordering = ["-criado_em"]
        indexes = [
            models.Index(fields=["tenant", "-criado_em"]),
            models.Index(fields=["objeto", "objeto_id"]),
        ]

    def __str__(self) -> str:
        quem = self.usuario.get_username() if self.usuario else "sistema"
        return f"{self.get_acao_display()} — {self.objeto} {self.objeto_id} por {quem}"
