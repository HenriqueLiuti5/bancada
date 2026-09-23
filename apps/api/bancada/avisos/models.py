from django.db import models

from bancada.core.models import PertenceAoTenant


class AvisoDeStatus(PertenceAoTenant):
    evento = models.OneToOneField(
        "ordens.EventoOS",
        on_delete=models.CASCADE,
        related_name="aviso",
    )
    destino = models.EmailField()
    assunto = models.CharField(max_length=200)
    enviado_em = models.DateTimeField(null=True, blank=True)
    tentativas = models.PositiveSmallIntegerField(default=0)
    erro = models.TextField(blank=True)

    class Meta:
        verbose_name = "aviso ao cliente"
        verbose_name_plural = "avisos ao cliente"
        ordering = ["-criado_em"]
        indexes = [models.Index(fields=["tenant", "enviado_em"])]

    def __str__(self) -> str:
        situacao = "enviado" if self.enviado_em else "pendente"
        return f"{self.assunto} ({situacao})"
