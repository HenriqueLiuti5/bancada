from typing import Any

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.text import slugify

from bancada.core.models import Carimbado


class Tenant(Carimbado):
    nome = models.CharField(max_length=120)
    slug = models.SlugField(max_length=140, unique=True)
    documento = models.CharField(max_length=18, blank=True)
    ativo = models.BooleanField(default=True)

    class Meta:
        verbose_name = "assistência"
        verbose_name_plural = "assistências"
        ordering = ["nome"]

    def __str__(self) -> str:
        return self.nome

    def save(self, *args: Any, **kwargs: Any) -> None:
        if not self.slug:
            self.slug = slugify(self.nome)[:140]
        super().save(*args, **kwargs)


class Loja(Carimbado):
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="lojas")
    nome = models.CharField(max_length=120)
    telefone = models.CharField(max_length=20, blank=True)
    endereco = models.CharField(max_length=255, blank=True)

    class Meta:
        verbose_name = "loja"
        verbose_name_plural = "lojas"
        ordering = ["nome"]

    def __str__(self) -> str:
        return f"{self.nome} ({self.tenant.nome})"


class Papel(models.TextChoices):
    DONO = "dono", "Dono"
    TECNICO = "tecnico", "Técnico"
    ATENDENTE = "atendente", "Atendente"


class Usuario(AbstractUser):
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="usuarios",
        null=True,
        blank=True,
    )
    papel = models.CharField(max_length=20, choices=Papel.choices, blank=True)

    class Meta:
        verbose_name = "usuário"
        verbose_name_plural = "usuários"

    def __str__(self) -> str:
        return self.get_username()

    @property
    def e_tecnico(self) -> bool:
        return self.papel in {Papel.TECNICO, Papel.DONO}
