from django.contrib.postgres.fields import ArrayField
from django.db import models

from bancada.core.models import PertenceAoTenant


class SituacaoDaAssinatura(models.TextChoices):
    TESTE = "teste", "Em teste grátis"
    ATIVA = "ativa", "Ativa"
    INADIMPLENTE = "inadimplente", "Pagamento atrasado"
    SUSPENSA = "suspensa", "Suspensa"
    CANCELADA = "cancelada", "Cancelada"


class SituacaoDaFatura(models.TextChoices):
    ABERTA = "aberta", "Aguardando pagamento"
    PAGA = "paga", "Paga"
    VENCIDA = "vencida", "Vencida"
    ESTORNADA = "estornada", "Estornada"
    CANCELADA = "cancelada", "Cancelada"


class FormaDeCobranca(models.TextChoices):
    A_ESCOLHER = "", "A escolher"
    PIX = "pix", "PIX"
    BOLETO = "boleto", "Boleto"
    CARTAO = "cartao", "Cartão"


class Plano(models.TextChoices):
    SOLO = "solo", "Solo"
    EQUIPE = "equipe", "Equipe"
    REDE = "rede", "Rede"


class Ciclo(models.TextChoices):
    MENSAL = "mensal", "Mensal"
    ANUAL = "anual", "Anual"


class Assinatura(PertenceAoTenant):
    tenant = models.OneToOneField(
        "tenants.Tenant", on_delete=models.CASCADE, related_name="assinatura"
    )
    situacao = models.CharField(
        max_length=20, choices=SituacaoDaAssinatura.choices, default=SituacaoDaAssinatura.TESTE
    )
    teste_termina_em = models.DateField()
    plano = models.CharField(max_length=20, choices=Plano.choices, blank=True)
    ciclo = models.CharField(max_length=20, choices=Ciclo.choices, blank=True)
    # O que cada cobrança leva, no ciclo da assinatura: por mês no mensal, por ano no anual.
    valor = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    documento_do_pagador = models.CharField(max_length=14, blank=True)
    cliente_no_provedor = models.CharField(max_length=60, blank=True)
    assinatura_no_provedor = models.CharField(max_length=60, blank=True, db_index=True)
    assinada_em = models.DateTimeField(null=True, blank=True)
    cancelada_em = models.DateTimeField(null=True, blank=True)
    acesso_ate = models.DateField(null=True, blank=True)
    avisos_de_fim_do_teste = ArrayField(
        models.PositiveSmallIntegerField(), default=list, blank=True
    )
    aviso_de_exclusao_em = models.DateField(null=True, blank=True)

    class Meta:
        verbose_name = "assinatura"
        verbose_name_plural = "assinaturas"
        ordering = ["-criado_em"]

    def __str__(self) -> str:
        return f"Assinatura da {self.tenant.nome}"

    @property
    def contratada(self) -> bool:
        return bool(self.assinatura_no_provedor) and self.situacao != SituacaoDaAssinatura.CANCELADA


class Fatura(PertenceAoTenant):
    assinatura = models.ForeignKey(Assinatura, on_delete=models.CASCADE, related_name="faturas")
    id_no_provedor = models.CharField(max_length=60, unique=True)
    valor = models.DecimalField(max_digits=8, decimal_places=2)
    valor_liquido = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    vencimento = models.DateField()
    situacao = models.CharField(max_length=20, choices=SituacaoDaFatura.choices)
    forma_de_pagamento = models.CharField(
        max_length=20, choices=FormaDeCobranca.choices, blank=True
    )
    paga_em = models.DateField(null=True, blank=True)
    link_de_pagamento = models.URLField(max_length=300, blank=True)
    # O boleto não volta sozinho: quem pagou informa a conta neste link do Asaas.
    link_da_devolucao = models.URLField(max_length=300, blank=True)

    class Meta:
        verbose_name = "fatura"
        verbose_name_plural = "faturas"
        ordering = ["-vencimento"]

    def __str__(self) -> str:
        return f"Fatura de {self.vencimento:%d/%m/%Y} da {self.tenant.nome}"


class EventoDoProvedor(models.Model):
    id_no_provedor = models.CharField(max_length=120, unique=True)
    tipo = models.CharField(max_length=60)
    conteudo = models.JSONField()
    recebido_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "evento do provedor de cobrança"
        verbose_name_plural = "eventos do provedor de cobrança"
        ordering = ["-recebido_em"]

    def __str__(self) -> str:
        return f"{self.tipo} ({self.id_no_provedor})"
