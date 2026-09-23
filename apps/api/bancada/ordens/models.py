import secrets
from decimal import Decimal
from typing import Any
from uuid import uuid4

from django.conf import settings
from django.core.files import File
from django.db import models, transaction

from bancada.clientes.models import Aparelho, Cliente
from bancada.core.models import Carimbado, PertenceAoTenant
from bancada.ordens.estados import (
    ESTADOS_FINAIS,
    TRANSICOES,
    StatusOS,
    TransicaoInvalida,
    pode_ir_de,
)
from bancada.ordens.fotos import MomentoDaFoto, normalizar
from bancada.tenants.models import Loja, Tenant, Usuario


def gerar_token_publico() -> str:
    return secrets.token_urlsafe(9)


def proximo_numero(tenant: Tenant) -> int:
    Tenant.objects.select_for_update().get(pk=tenant.pk)
    ultimo = OrdemServico.objects.filter(tenant=tenant).aggregate(models.Max("numero"))
    return (ultimo["numero__max"] or 0) + 1


class OrdemServico(PertenceAoTenant):
    numero = models.PositiveIntegerField()
    loja = models.ForeignKey(Loja, on_delete=models.PROTECT, related_name="ordens")
    cliente = models.ForeignKey(Cliente, on_delete=models.PROTECT, related_name="ordens")
    aparelho = models.ForeignKey(Aparelho, on_delete=models.PROTECT, related_name="ordens")
    tecnico = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="ordens",
        null=True,
        blank=True,
    )

    status = models.CharField(max_length=30, choices=StatusOS.choices, default=StatusOS.RECEBIDO)
    problema_relatado = models.TextField()
    diagnostico = models.TextField(blank=True)
    laudo = models.TextField(blank=True)

    token_publico = models.CharField(
        max_length=24,
        unique=True,
        default=gerar_token_publico,
        editable=False,
    )

    prometida_para = models.DateField(null=True, blank=True)
    entregue_em = models.DateTimeField(null=True, blank=True)
    garantia_ate = models.DateField(null=True, blank=True)

    class Meta:
        verbose_name = "ordem de serviço"
        verbose_name_plural = "ordens de serviço"
        ordering = ["-criado_em"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "numero"], name="numero_unico_por_tenant"),
        ]
        indexes = [
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["token_publico"]),
        ]

    def __str__(self) -> str:
        return f"OS #{self.numero} — {self.aparelho}"

    @transaction.atomic
    def save(self, *args: Any, **kwargs: Any) -> None:
        if self._state.adding and not self.numero:
            self.numero = proximo_numero(self.tenant)
        super().save(*args, **kwargs)

    @classmethod
    @transaction.atomic
    def abrir(
        cls,
        *,
        tenant: Tenant,
        loja: Loja,
        cliente: Cliente,
        aparelho: Aparelho,
        problema_relatado: str,
        aberta_por: Usuario | None = None,
        tecnico: Usuario | None = None,
    ) -> "OrdemServico":
        ordem = cls.objects.create(
            tenant=tenant,
            loja=loja,
            cliente=cliente,
            aparelho=aparelho,
            problema_relatado=problema_relatado,
            tecnico=tecnico,
        )
        EventoOS.objects.create(
            ordem=ordem,
            usuario=aberta_por,
            de_status="",
            para_status=ordem.status,
            nota="Ordem aberta",
        )
        return ordem

    @transaction.atomic
    def transicionar(
        self,
        novo_status: str,
        *,
        usuario: Usuario | None = None,
        nota: str = "",
    ) -> "EventoOS":
        anterior = self.status
        if not pode_ir_de(anterior, novo_status):
            raise TransicaoInvalida(anterior, novo_status)

        self.status = novo_status
        campos = ["status", "atualizado_em"]

        if novo_status == StatusOS.ENTREGUE:
            from django.utils import timezone

            self.entregue_em = timezone.now()
            campos.append("entregue_em")

        self.save(update_fields=campos)

        return EventoOS.objects.create(
            ordem=self,
            usuario=usuario,
            de_status=anterior,
            para_status=novo_status,
            nota=nota,
        )

    @property
    def transicoes_possiveis(self) -> list[str]:
        return sorted(TRANSICOES.get(self.status, frozenset()))

    @property
    def encerrada(self) -> bool:
        return self.status in ESTADOS_FINAIS

    @property
    def total_orcamento(self) -> Decimal:
        total = self.itens.aggregate(models.Sum("valor"))["valor__sum"]
        return total or Decimal("0.00")

    @property
    def total_aprovado(self) -> Decimal:
        total = self.itens.filter(aprovado=True).aggregate(models.Sum("valor"))["valor__sum"]
        return total or Decimal("0.00")


class TipoItem(models.TextChoices):
    PECA = "peca", "Peça"
    SERVICO = "servico", "Serviço"


class ItemOrcamento(Carimbado):
    ordem = models.ForeignKey(OrdemServico, on_delete=models.CASCADE, related_name="itens")
    tipo = models.CharField(max_length=10, choices=TipoItem.choices, default=TipoItem.PECA)
    descricao = models.CharField(max_length=180)
    valor = models.DecimalField(max_digits=10, decimal_places=2)
    aprovado = models.BooleanField(default=False)

    class Meta:
        verbose_name = "item do orçamento"
        verbose_name_plural = "itens do orçamento"
        ordering = ["criado_em"]

    def __str__(self) -> str:
        return f"{self.descricao} — R$ {self.valor}"


class EventoOS(models.Model):
    ordem = models.ForeignKey(OrdemServico, on_delete=models.CASCADE, related_name="eventos")
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="eventos",
        null=True,
        blank=True,
    )
    de_status = models.CharField(max_length=30, blank=True)
    para_status = models.CharField(max_length=30)
    nota = models.TextField(blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "evento da ordem"
        verbose_name_plural = "eventos da ordem"
        ordering = ["criado_em"]
        indexes = [models.Index(fields=["ordem", "criado_em"])]

    def __str__(self) -> str:
        origem = self.de_status or "início"
        return f"OS #{self.ordem.numero}: {origem} → {self.para_status}"


def caminho_da_foto(instancia: "FotoOS", nome_enviado: str) -> str:
    return f"fotos/{instancia.tenant_id}/{instancia.ordem_id}/{uuid4().hex}.jpg"


class FotoOS(PertenceAoTenant):
    ordem = models.ForeignKey(OrdemServico, on_delete=models.CASCADE, related_name="fotos")
    momento = models.CharField(
        max_length=10,
        choices=MomentoDaFoto.choices,
        default=MomentoDaFoto.ENTRADA,
    )
    arquivo = models.ImageField(upload_to=caminho_da_foto)
    legenda = models.CharField(max_length=140, blank=True)
    largura = models.PositiveIntegerField()
    altura = models.PositiveIntegerField()
    visivel_ao_cliente = models.BooleanField(default=True)
    enviada_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="fotos_enviadas",
        null=True,
        blank=True,
    )

    class Meta:
        verbose_name = "foto da ordem"
        verbose_name_plural = "fotos da ordem"
        ordering = ["criado_em"]
        indexes = [models.Index(fields=["ordem", "momento"])]

    def __str__(self) -> str:
        return f"Foto {self.get_momento_display().lower()} da OS #{self.ordem.numero}"

    @classmethod
    @transaction.atomic
    def registrar(
        cls,
        *,
        ordem: OrdemServico,
        enviado: File,
        momento: str = MomentoDaFoto.ENTRADA,
        legenda: str = "",
        enviada_por: Usuario | None = None,
    ) -> "FotoOS":
        normalizada = normalizar(enviado)
        foto = cls(
            tenant=ordem.tenant,
            ordem=ordem,
            momento=momento,
            legenda=legenda,
            largura=normalizada.largura,
            altura=normalizada.altura,
            enviada_por=enviada_por,
        )
        foto.arquivo.save(f"{uuid4().hex}.jpg", normalizada.conteudo, save=True)
        return foto
