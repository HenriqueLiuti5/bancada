import calendar
from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal

from django.conf import settings
from django.db import models, transaction
from django.db.models import Q

from bancada.core.formatos import em_reais
from bancada.core.models import PertenceAoTenant
from bancada.tenants.models import Loja, Tenant, Usuario

# A conta fixa de cada mês aparece um mês antes de vencer, para o dono ver o que vem pela frente.
ANTECEDENCIA_DA_CONTA_FIXA = timedelta(days=31)


class CategoriaDaConta(models.TextChoices):
    ALUGUEL = "aluguel", "Aluguel e condomínio"
    CONTAS_DA_LOJA = "contas_da_loja", "Luz, água, internet e telefone"
    SALARIOS = "salarios", "Salários e pró-labore"
    IMPOSTOS = "impostos", "Impostos, taxas e encargos"
    COMPRAS = "compras", "Compras de peças e acessórios"
    FERRAMENTAS = "ferramentas", "Ferramentas e equipamentos"
    SISTEMAS = "sistemas", "Sistemas e assinaturas"
    PROPAGANDA = "propaganda", "Propaganda"
    SERVICOS = "servicos", "Contador e outros serviços"
    TARIFAS = "tarifas", "Tarifas do banco e da maquininha"
    TRANSPORTE = "transporte", "Transporte e entregas"
    MANUTENCAO = "manutencao", "Manutenção e limpeza"
    OUTRAS = "outras", "Outras despesas"


class FormaDePagamentoDaConta(models.TextChoices):
    PIX = "pix", "PIX"
    DINHEIRO = "dinheiro", "Dinheiro"
    DEBITO = "debito", "Débito"
    CREDITO = "credito", "Crédito"
    BOLETO = "boleto", "Boleto"


def no_dia(ano: int, mes: int, dia: int) -> date:
    # A conta fixa do dia 31 vence no último dia dos meses mais curtos.
    return date(ano, mes, min(dia, calendar.monthrange(ano, mes)[1]))


def no_mes_seguinte(vencimento: date, dia: int) -> date:
    if vencimento.month == 12:
        return no_dia(vencimento.year + 1, 1, dia)
    return no_dia(vencimento.year, vencimento.month + 1, dia)


@dataclass(frozen=True)
class PagamentoDaConta:
    paga_em: date
    forma: str


class ContaJaPaga(Exception):
    def __init__(self) -> None:
        super().__init__("Esta conta já foi paga.")


class ContaNaoPaga(Exception):
    def __init__(self) -> None:
        super().__init__("Esta conta ainda não foi paga.")


class ContaFixa(PertenceAoTenant):
    descricao = models.CharField("descrição", max_length=120)
    categoria = models.CharField(max_length=20, choices=CategoriaDaConta.choices)
    fornecedor = models.CharField("para quem", max_length=120, blank=True)
    valor = models.DecimalField(max_digits=10, decimal_places=2)
    dia = models.PositiveSmallIntegerField("dia do vencimento")
    loja = models.ForeignKey(
        Loja,
        on_delete=models.RESTRICT,
        related_name="contas_fixas",
        null=True,
        blank=True,
    )
    ativa = models.BooleanField(default=True)
    ultimo_vencimento = models.DateField("vencimento da última conta criada")
    criada_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="contas_fixas_criadas",
        null=True,
        blank=True,
    )

    class Meta:
        verbose_name = "conta fixa"
        verbose_name_plural = "contas fixas"
        ordering = ["dia", "pk"]
        constraints = [
            models.CheckConstraint(condition=Q(valor__gt=0), name="conta_fixa_com_valor_positivo"),
            models.CheckConstraint(
                condition=Q(dia__gte=1) & Q(dia__lte=31), name="conta_fixa_num_dia_do_mes"
            ),
        ]

    def __str__(self) -> str:
        return f"{self.descricao}, todo dia {self.dia}"

    # Cria as contas de cada mês que vencem até um mês à frente, a partir da última criada. A trava
    # faz duas execuções ao mesmo tempo esperarem uma pela outra, e a segunda não acha nada a criar.
    # O mês que já venceu antes de a repetição existir é pulado, para a conta não nascer atrasada.
    @transaction.atomic
    def criar_as_proximas(self, hoje: date) -> list["ContaAPagar"]:
        travada = ContaFixa.objects.select_for_update().get(pk=self.pk)
        if not travada.ativa:
            return []

        novas: list[ContaAPagar] = []
        vencimento = travada.ultimo_vencimento
        limite = hoje + ANTECEDENCIA_DA_CONTA_FIXA
        while (seguinte := no_mes_seguinte(vencimento, travada.dia)) <= limite:
            vencimento = seguinte
            if vencimento >= hoje:
                novas.append(travada.conta_que_vence_em(vencimento))

        if vencimento != travada.ultimo_vencimento:
            travada.ultimo_vencimento = vencimento
            travada.save(update_fields=["ultimo_vencimento", "atualizado_em"])
        self.ultimo_vencimento = vencimento
        return ContaAPagar.objects.bulk_create(novas)

    def conta_que_vence_em(self, vencimento: date) -> "ContaAPagar":
        return ContaAPagar(
            tenant_id=self.tenant_id,
            descricao=self.descricao,
            categoria=self.categoria,
            fornecedor=self.fornecedor,
            valor=self.valor,
            vencimento=vencimento,
            loja_id=self.loja_id,
            conta_fixa=self,
        )


class ContaAPagar(PertenceAoTenant):
    descricao = models.CharField("descrição", max_length=120)
    categoria = models.CharField(max_length=20, choices=CategoriaDaConta.choices)
    fornecedor = models.CharField("para quem", max_length=120, blank=True)
    valor = models.DecimalField(max_digits=10, decimal_places=2)
    vencimento = models.DateField()
    loja = models.ForeignKey(
        Loja,
        on_delete=models.RESTRICT,
        related_name="contas_a_pagar",
        null=True,
        blank=True,
    )
    observacao = models.CharField("observação", max_length=200, blank=True)
    conta_fixa = models.ForeignKey(
        ContaFixa,
        on_delete=models.SET_NULL,
        related_name="contas",
        null=True,
        blank=True,
    )
    paga_em = models.DateField(null=True, blank=True)
    forma = models.CharField(
        "forma de pagamento",
        max_length=10,
        choices=FormaDePagamentoDaConta.choices,
        blank=True,
    )
    lancada_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="contas_lancadas",
        null=True,
        blank=True,
    )
    paga_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="contas_pagas",
        null=True,
        blank=True,
    )

    class Meta:
        verbose_name = "conta a pagar"
        verbose_name_plural = "contas a pagar"
        ordering = ["vencimento", "pk"]
        constraints = [
            models.CheckConstraint(
                condition=Q(valor__gt=0), name="conta_a_pagar_com_valor_positivo"
            ),
            models.CheckConstraint(
                condition=(Q(paga_em__isnull=True) & Q(forma=""))
                | (Q(paga_em__isnull=False) & ~Q(forma="")),
                name="conta_paga_com_data_e_forma",
            ),
        ]
        indexes = [
            models.Index(fields=["tenant", "vencimento"]),
            models.Index(fields=["tenant", "paga_em"]),
        ]

    def __str__(self) -> str:
        return f"{self.descricao}, {em_reais(self.valor)} em {self.vencimento:%d/%m/%Y}"

    @property
    def paga(self) -> bool:
        return self.paga_em is not None

    @property
    def repete(self) -> bool:
        return self.conta_fixa is not None and self.conta_fixa.ativa

    @classmethod
    @transaction.atomic
    def lancar(
        cls,
        *,
        tenant: Tenant,
        descricao: str,
        categoria: str,
        valor: Decimal,
        vencimento: date,
        hoje: date,
        fornecedor: str = "",
        loja: Loja | None = None,
        observacao: str = "",
        pagamento: PagamentoDaConta | None = None,
        repetir: bool = False,
        usuario: Usuario | None = None,
    ) -> "ContaAPagar":
        conta_fixa = None
        if repetir:
            conta_fixa = ContaFixa.objects.create(
                tenant=tenant,
                descricao=descricao,
                categoria=categoria,
                fornecedor=fornecedor,
                valor=valor,
                dia=vencimento.day,
                loja=loja,
                ultimo_vencimento=vencimento,
                criada_por=usuario,
            )

        conta = cls.objects.create(
            tenant=tenant,
            descricao=descricao,
            categoria=categoria,
            fornecedor=fornecedor,
            valor=valor,
            vencimento=vencimento,
            loja=loja,
            observacao=observacao,
            conta_fixa=conta_fixa,
            lancada_por=usuario,
            paga_em=pagamento.paga_em if pagamento else None,
            forma=pagamento.forma if pagamento else "",
            paga_por=usuario if pagamento else None,
        )
        if conta_fixa is not None:
            conta_fixa.criar_as_proximas(hoje)
        return conta

    @transaction.atomic
    def pagar(
        self,
        pagamento: PagamentoDaConta,
        *,
        valor: Decimal | None = None,
        usuario: Usuario | None = None,
    ) -> None:
        travada = ContaAPagar.objects.select_for_update().get(pk=self.pk)
        if travada.paga:
            raise ContaJaPaga

        self.paga_em = pagamento.paga_em
        self.forma = pagamento.forma
        self.paga_por = usuario
        if valor is not None:
            self.valor = valor
        self.save(update_fields=["paga_em", "forma", "paga_por", "valor", "atualizado_em"])

    @transaction.atomic
    def desfazer_pagamento(self) -> None:
        travada = ContaAPagar.objects.select_for_update().get(pk=self.pk)
        if not travada.paga:
            raise ContaNaoPaga

        self.paga_em = None
        self.forma = ""
        self.paga_por = None
        self.save(update_fields=["paga_em", "forma", "paga_por", "atualizado_em"])

    # Leva a mudança desta conta para a repetição e para as contas dela que ainda não foram pagas e
    # vencem depois desta. O dia do vencimento passa a ser o desta conta, em cada mês.
    @transaction.atomic
    def mudar_tambem_as_proximas(self) -> None:
        if self.conta_fixa_id is None:
            return
        conta_fixa = ContaFixa.objects.select_for_update().get(pk=self.conta_fixa_id)
        campos = {
            "descricao": self.descricao,
            "categoria": self.categoria,
            "fornecedor": self.fornecedor,
            "valor": self.valor,
            "loja_id": self.loja_id,
        }
        for campo, valor in campos.items():
            setattr(conta_fixa, campo, valor)
        conta_fixa.dia = self.vencimento.day
        conta_fixa.save()

        for proxima in self.proximas_sem_pagamento():
            for campo, valor in campos.items():
                setattr(proxima, campo, valor)
            proxima.vencimento = no_dia(
                proxima.vencimento.year, proxima.vencimento.month, conta_fixa.dia
            )
            proxima.save()

    @transaction.atomic
    def parar_de_repetir(self) -> None:
        if self.conta_fixa_id is None:
            return
        ContaFixa.objects.filter(pk=self.conta_fixa_id).update(ativa=False)
        self.proximas_sem_pagamento().delete()
        if self.conta_fixa is not None:
            self.conta_fixa.ativa = False

    def proximas_sem_pagamento(self) -> "models.QuerySet[ContaAPagar]":
        return ContaAPagar.objects.filter(
            conta_fixa_id=self.conta_fixa_id,
            paga_em__isnull=True,
            vencimento__gt=self.vencimento,
        ).exclude(pk=self.pk)
