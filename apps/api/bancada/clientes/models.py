from django.db import models

from bancada.core.fields import CampoCriptografado
from bancada.core.models import PertenceAoTenant


class Cliente(PertenceAoTenant):
    nome = models.CharField(max_length=140)
    telefone = models.CharField(max_length=20)
    email = models.EmailField(blank=True)
    documento = models.CharField(max_length=14, blank=True)

    class Meta:
        verbose_name = "cliente"
        verbose_name_plural = "clientes"
        ordering = ["nome"]
        indexes = [models.Index(fields=["tenant", "telefone"])]

    def __str__(self) -> str:
        return self.nome


class Aparelho(PertenceAoTenant):
    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE, related_name="aparelhos")
    marca = models.CharField(max_length=60)
    modelo = models.CharField(max_length=80)
    cor = models.CharField(max_length=40, blank=True)
    imei = models.CharField(max_length=20, blank=True)
    senha_desbloqueio = CampoCriptografado(blank=True, default="")

    class Meta:
        verbose_name = "aparelho"
        verbose_name_plural = "aparelhos"
        ordering = ["marca", "modelo"]

    def __str__(self) -> str:
        return f"{self.marca} {self.modelo}"

    @property
    def imei_mascarado(self) -> str:
        if not self.imei:
            return ""
        return f"{'*' * max(len(self.imei) - 4, 0)}{self.imei[-4:]}"
