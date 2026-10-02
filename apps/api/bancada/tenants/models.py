import secrets
from datetime import datetime, timedelta
from typing import Any

from django.contrib.auth.models import AbstractUser
from django.contrib.postgres.fields import ArrayField
from django.db import models
from django.db.models.functions import Lower
from django.utils import timezone
from django.utils.text import slugify

from bancada.core.models import Carimbado, PertenceAoTenant

VALIDADE_DO_CONVITE = timedelta(days=7)


def normalizar_email(valor: str) -> str:
    return valor.strip().lower()


class Tenant(Carimbado):
    nome = models.CharField(max_length=120)
    slug = models.SlugField(max_length=140, unique=True)
    documento = models.CharField(max_length=18, blank=True)
    whatsapp = models.CharField(max_length=20, blank=True)
    ativo = models.BooleanField(default=True)
    termos_aceitos_em = models.DateTimeField(null=True, blank=True)
    versao_dos_termos = models.CharField(max_length=40, blank=True)

    class Meta:
        verbose_name = "assistência"
        verbose_name_plural = "assistências"
        ordering = ["nome"]

    def __str__(self) -> str:
        return self.nome

    def save(self, *args: Any, **kwargs: Any) -> None:
        if not self.slug:
            self.slug = self._slug_livre()
        super().save(*args, **kwargs)

    def _slug_livre(self) -> str:
        base = slugify(self.nome)[:120] or "assistencia"
        candidato = base
        while Tenant.objects.filter(slug=candidato).exists():
            candidato = f"{base}-{secrets.token_hex(3)}"
        return candidato


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
    email_confirmado_em = models.DateTimeField(null=True, blank=True)
    tours_vistos = ArrayField(models.CharField(max_length=30), default=list, blank=True)
    primeiros_passos_escondidos = models.BooleanField(default=False)
    da_plataforma = models.BooleanField("conta da plataforma", default=False)
    ultimo_acesso = models.DateTimeField("último acesso", null=True, blank=True)

    class Meta:
        verbose_name = "usuário"
        verbose_name_plural = "usuários"
        constraints = [
            models.UniqueConstraint(
                Lower("email"),
                condition=~models.Q(email=""),
                name="email_unico_entre_usuarios",
                violation_error_message="Já existe uma conta com esse e-mail.",
            ),
            models.CheckConstraint(
                condition=models.Q(da_plataforma=False) | models.Q(tenant__isnull=True, papel=""),
                name="conta_da_plataforma_fora_das_assistencias",
                violation_error_message="A conta da plataforma não pertence a nenhuma assistência.",
            ),
        ]

    def __str__(self) -> str:
        return self.get_username()

    @property
    def nome_de_exibicao(self) -> str:
        return self.first_name or self.get_username()

    @property
    def e_tecnico(self) -> bool:
        return self.papel in {Papel.TECNICO, Papel.DONO}

    @property
    def email_confirmado(self) -> bool:
        return self.email_confirmado_em is not None

    @classmethod
    def email_em_uso(cls, email: str) -> bool:
        return cls.objects.filter(email__iexact=normalizar_email(email)).exists()

    @classmethod
    def pelo_email(cls, email: str) -> "Usuario | None":
        return cls.objects.filter(email__iexact=normalizar_email(email)).first()


def gerar_token_de_convite() -> str:
    return secrets.token_urlsafe(24)


def validade_padrao_do_convite() -> datetime:
    return timezone.now() + VALIDADE_DO_CONVITE


class Convite(PertenceAoTenant):
    nome = models.CharField(max_length=150)
    papel = models.CharField(max_length=20, choices=Papel.choices)
    email = models.EmailField(blank=True)
    token = models.CharField(max_length=64, unique=True, default=gerar_token_de_convite)
    expira_em = models.DateTimeField(default=validade_padrao_do_convite)
    criado_por = models.ForeignKey(
        Usuario,
        on_delete=models.SET_NULL,
        related_name="convites_enviados",
        null=True,
        blank=True,
    )
    aceito_em = models.DateTimeField(null=True, blank=True)
    usuario = models.OneToOneField(
        Usuario,
        on_delete=models.SET_NULL,
        related_name="convite_de_origem",
        null=True,
        blank=True,
    )

    class Meta:
        verbose_name = "convite"
        verbose_name_plural = "convites"
        ordering = ["-criado_em"]

    def __str__(self) -> str:
        return f"Convite de {self.nome} para {self.tenant.nome}"

    @property
    def expirado(self) -> bool:
        return self.expira_em <= timezone.now()

    @property
    def aceito(self) -> bool:
        return self.aceito_em is not None
