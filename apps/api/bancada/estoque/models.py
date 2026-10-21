from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal

from django.conf import settings
from django.db import models, transaction
from django.db.models import F, OuterRef, Q, Subquery, Sum
from django.db.models.functions import Coalesce, Lower
from django.utils import timezone

from bancada.core.formatos import em_reais
from bancada.core.models import PertenceAoTenant
from bancada.ordens.models import FormaDePagamento, OrdemServico, Recebimento
from bancada.tenants.models import Loja, Tenant, Usuario

CENTAVO = Decimal("0.01")
ZERO = Decimal("0.00")


class TipoDeProduto(models.TextChoices):
    PECA = "peca", "Peça"
    ACESSORIO = "acessorio", "Acessório"


class TipoDeMovimento(models.TextChoices):
    INICIAL = "inicial", "Estoque inicial"
    ENTRADA = "entrada", "Entrada de compra"
    ORDEM = "ordem", "Peça usada em ordem"
    VENDA = "venda", "Venda no balcão"
    VENDA_DESFEITA = "venda_desfeita", "Venda desfeita"
    AJUSTE = "ajuste", "Correção da contagem"
    TRANSFERENCIA = "transferencia", "Transferência entre lojas"


def unidades(quantidade: int) -> str:
    return f"{quantidade} {'unidade' if abs(quantidade) == 1 else 'unidades'}"


def custo_medio(
    atual: Decimal, quantidade_antes: int, entrada: int, custo_da_entrada: Decimal
) -> Decimal:
    # Com o estoque zerado ou negativo, as peças que chegam cobrem o que já foi prometido às ordens,
    # e o custo passa a ser o da compra.
    if quantidade_antes <= 0:
        return custo_da_entrada
    total = atual * quantidade_antes + custo_da_entrada * entrada
    return (total / (quantidade_antes + entrada)).quantize(CENTAVO, rounding=ROUND_HALF_UP)


def soma_dos_movimentos(loja: Loja | None = None) -> Coalesce:
    movimentos = MovimentoDeEstoque.objects.filter(produto=OuterRef("pk"))
    if loja is not None:
        movimentos = movimentos.filter(loja=loja)
    soma = movimentos.order_by().values("produto").annotate(total=Sum("quantidade")).values("total")
    return Coalesce(Subquery(soma, output_field=models.IntegerField()), 0)


def com_quantidade(
    consulta: "models.QuerySet[Produto]", loja: Loja | None = None
) -> "models.QuerySet[Produto]":
    return consulta.annotate(quantidade=soma_dos_movimentos(loja))


# Precisa repor o produto ativo que tem menos que o mínimo somando todas as lojas. Com o mínimo
# zero, só o que ficou negativo: peças já prometidas às ordens que ainda não chegaram.
def para_repor(consulta: "models.QuerySet[Produto]") -> "models.QuerySet[Produto]":
    return consulta.alias(total_em_estoque=soma_dos_movimentos()).filter(
        Q(total_em_estoque__lt=F("minimo")), ativo=True
    )


class TransferenciaAcimaDoDisponivel(Exception):
    def __init__(self, loja: Loja, disponivel: int) -> None:
        if disponivel <= 0:
            mensagem = f"{loja.nome} não tem este produto para transferir."
        else:
            mensagem = f"{loja.nome} só tem {unidades(disponivel)} deste produto."
        super().__init__(mensagem)


class Produto(PertenceAoTenant):
    nome = models.CharField(max_length=120)
    tipo = models.CharField(
        max_length=10, choices=TipoDeProduto.choices, default=TipoDeProduto.PECA
    )
    codigo = models.CharField("código", max_length=60, blank=True)
    custo = models.DecimalField(max_digits=10, decimal_places=2, default=ZERO)
    preco = models.DecimalField("preço de venda", max_digits=10, decimal_places=2, default=ZERO)
    minimo = models.PositiveIntegerField("estoque mínimo", default=0)
    ativo = models.BooleanField(default=True)

    class Meta:
        verbose_name = "produto"
        verbose_name_plural = "produtos"
        ordering = [Lower("nome"), "pk"]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "codigo"],
                condition=~Q(codigo=""),
                name="produto_com_codigo_unico",
            ),
            models.CheckConstraint(condition=Q(custo__gte=0), name="produto_com_custo_positivo"),
            models.CheckConstraint(condition=Q(preco__gte=0), name="produto_com_preco_positivo"),
        ]
        indexes = [models.Index(fields=["tenant", "ativo"])]

    def __str__(self) -> str:
        return self.nome

    def quantidade_na_loja(self, loja: Loja) -> int:
        total = self.movimentos.filter(loja=loja).aggregate(total=Sum("quantidade"))["total"]
        return total or 0

    def quantidade_total(self) -> int:
        total = self.movimentos.aggregate(total=Sum("quantidade"))["total"]
        return total or 0

    def quantidades_por_loja(self) -> dict[int, int]:
        linhas = self.movimentos.order_by().values("loja").annotate(total=Sum("quantidade"))
        return {linha["loja"]: linha["total"] for linha in linhas}

    def _movimento(self, **campos: object) -> "MovimentoDeEstoque":
        return MovimentoDeEstoque(tenant_id=self.tenant_id, produto=self, **campos)

    @transaction.atomic
    def registrar_estoque_inicial(
        self, *, loja: Loja, quantidade: int, usuario: Usuario | None = None
    ) -> "MovimentoDeEstoque":
        movimento = self._movimento(
            loja=loja,
            tipo=TipoDeMovimento.INICIAL,
            quantidade=quantidade,
            custo_unitario=self.custo,
            usuario=usuario,
        )
        movimento.save()
        return movimento

    @transaction.atomic
    def registrar_entrada(
        self,
        *,
        loja: Loja,
        quantidade: int,
        custo_unitario: Decimal,
        fornecedor: str = "",
        usuario: Usuario | None = None,
    ) -> "MovimentoDeEstoque":
        travado = Produto.objects.select_for_update().get(pk=self.pk)
        self.custo = custo_medio(
            travado.custo, travado.quantidade_total(), quantidade, custo_unitario
        )
        self.save(update_fields=["custo", "atualizado_em"])

        movimento = self._movimento(
            loja=loja,
            tipo=TipoDeMovimento.ENTRADA,
            quantidade=quantidade,
            custo_unitario=custo_unitario,
            fornecedor=fornecedor,
            usuario=usuario,
        )
        movimento.save()
        return movimento

    @transaction.atomic
    def corrigir_contagem(
        self, *, loja: Loja, contada: int, observacao: str = "", usuario: Usuario | None = None
    ) -> "MovimentoDeEstoque | None":
        Produto.objects.select_for_update().get(pk=self.pk)
        diferenca = contada - self.quantidade_na_loja(loja)
        if diferenca == 0:
            return None

        movimento = self._movimento(
            loja=loja,
            tipo=TipoDeMovimento.AJUSTE,
            quantidade=diferenca,
            observacao=observacao,
            usuario=usuario,
        )
        movimento.save()
        return movimento

    @transaction.atomic
    def transferir(
        self, *, de: Loja, para: Loja, quantidade: int, usuario: Usuario | None = None
    ) -> list["MovimentoDeEstoque"]:
        Produto.objects.select_for_update().get(pk=self.pk)
        disponivel = self.quantidade_na_loja(de)
        if quantidade > disponivel:
            raise TransferenciaAcimaDoDisponivel(de, disponivel)

        return MovimentoDeEstoque.objects.bulk_create(
            [
                self._movimento(
                    loja=de,
                    tipo=TipoDeMovimento.TRANSFERENCIA,
                    quantidade=-quantidade,
                    observacao=f"Para {para.nome}",
                    usuario=usuario,
                ),
                self._movimento(
                    loja=para,
                    tipo=TipoDeMovimento.TRANSFERENCIA,
                    quantidade=quantidade,
                    observacao=f"De {de.nome}",
                    usuario=usuario,
                ),
            ]
        )


# Cada movimento trava o produto antes de contar o que há, para duas mudanças ao mesmo tempo não
# partirem da mesma quantidade. A ordem pelo id evita que duas vendas se esperem uma à outra.
def travar(produtos: Iterable[int]) -> None:
    list(Produto.objects.select_for_update().filter(pk__in=set(produtos)).order_by("pk"))


def proximo_numero_de_venda(tenant: Tenant) -> int:
    Tenant.objects.select_for_update().get(pk=tenant.pk)
    ultimo = Venda.objects.filter(tenant=tenant).aggregate(models.Max("numero"))
    return (ultimo["numero__max"] or 0) + 1


@dataclass(frozen=True)
class LinhaDaVenda:
    produto: Produto
    quantidade: int


class VendaJaDesfeita(Exception):
    def __init__(self) -> None:
        super().__init__("Esta venda já foi desfeita.")


class Venda(PertenceAoTenant):
    numero = models.PositiveIntegerField()
    loja = models.ForeignKey(Loja, on_delete=models.RESTRICT, related_name="vendas")
    vendida_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="vendas",
        null=True,
        blank=True,
    )
    total = models.DecimalField(max_digits=10, decimal_places=2)
    valor_cobrado = models.DecimalField(max_digits=10, decimal_places=2)
    observacao = models.CharField("observação", max_length=200, blank=True)
    desfeita_em = models.DateTimeField(null=True, blank=True)
    desfeita_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="vendas_desfeitas",
        null=True,
        blank=True,
    )

    class Meta:
        verbose_name = "venda no balcão"
        verbose_name_plural = "vendas no balcão"
        ordering = ["-criado_em", "-pk"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "numero"], name="venda_com_numero_unico"),
            models.CheckConstraint(
                condition=Q(valor_cobrado__gte=0) & Q(valor_cobrado__lte=F("total")),
                name="venda_cobrada_ate_o_total",
            ),
        ]
        indexes = [models.Index(fields=["tenant", "criado_em"])]

    def __str__(self) -> str:
        return f"Venda #{self.numero}"

    @property
    def desfeita(self) -> bool:
        return self.desfeita_em is not None

    @property
    def desconto(self) -> Decimal:
        return self.total - self.valor_cobrado

    @property
    def custo(self) -> Decimal:
        return sum((item.custo * item.quantidade for item in self.itens.all()), ZERO)

    @property
    def lucro(self) -> Decimal:
        return self.valor_cobrado - self.custo

    @classmethod
    @transaction.atomic
    def registrar(
        cls,
        *,
        tenant: Tenant,
        loja: Loja,
        linhas: Sequence[LinhaDaVenda],
        valor_cobrado: Decimal,
        pagamentos: Sequence[Recebimento],
        observacao: str = "",
        usuario: Usuario | None = None,
    ) -> "Venda":
        travar(linha.produto.pk for linha in linhas)
        total = sum((linha.produto.preco * linha.quantidade for linha in linhas), ZERO)
        venda = cls.objects.create(
            tenant=tenant,
            numero=proximo_numero_de_venda(tenant),
            loja=loja,
            vendida_por=usuario,
            total=total,
            valor_cobrado=valor_cobrado,
            observacao=observacao,
        )
        ItemDaVenda.objects.bulk_create(
            ItemDaVenda(
                tenant=tenant,
                venda=venda,
                produto=linha.produto,
                descricao=linha.produto.nome,
                quantidade=linha.quantidade,
                preco=linha.produto.preco,
                custo=linha.produto.custo,
            )
            for linha in linhas
        )
        PagamentoDaVenda.objects.bulk_create(
            PagamentoDaVenda(
                tenant=tenant, venda=venda, forma=pagamento.forma, valor=pagamento.valor
            )
            for pagamento in pagamentos
        )
        MovimentoDeEstoque.objects.bulk_create(
            MovimentoDeEstoque(
                tenant=tenant,
                produto=linha.produto,
                loja=loja,
                tipo=TipoDeMovimento.VENDA,
                quantidade=-linha.quantidade,
                venda=venda,
                usuario=usuario,
            )
            for linha in linhas
        )
        return venda

    @transaction.atomic
    def desfazer(self, *, usuario: Usuario | None = None) -> None:
        travada = Venda.objects.select_for_update().get(pk=self.pk)
        if travada.desfeita:
            raise VendaJaDesfeita

        self.desfeita_em = timezone.now()
        self.desfeita_por = usuario
        self.save(update_fields=["desfeita_em", "desfeita_por", "atualizado_em"])

        itens = list(self.itens.all())
        travar(item.produto_id for item in itens)
        MovimentoDeEstoque.objects.bulk_create(
            MovimentoDeEstoque(
                tenant_id=self.tenant_id,
                produto_id=item.produto_id,
                loja_id=self.loja_id,
                tipo=TipoDeMovimento.VENDA_DESFEITA,
                quantidade=item.quantidade,
                venda=self,
                usuario=usuario,
            )
            for item in itens
        )


class ItemDaVenda(PertenceAoTenant):
    venda = models.ForeignKey(Venda, on_delete=models.CASCADE, related_name="itens")
    produto = models.ForeignKey(Produto, on_delete=models.RESTRICT, related_name="itens_vendidos")
    descricao = models.CharField("descrição", max_length=120)
    quantidade = models.PositiveIntegerField()
    preco = models.DecimalField("preço", max_digits=10, decimal_places=2)
    custo = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        verbose_name = "item da venda"
        verbose_name_plural = "itens da venda"
        ordering = ["pk"]
        constraints = [
            models.CheckConstraint(
                condition=Q(quantidade__gte=1), name="item_da_venda_com_quantidade"
            ),
        ]

    def __str__(self) -> str:
        return f"{self.quantidade}× {self.descricao}"

    @property
    def subtotal(self) -> Decimal:
        return self.preco * self.quantidade


class PagamentoDaVenda(PertenceAoTenant):
    venda = models.ForeignKey(Venda, on_delete=models.CASCADE, related_name="pagamentos")
    forma = models.CharField(max_length=10, choices=FormaDePagamento.choices)
    valor = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        verbose_name = "pagamento da venda"
        verbose_name_plural = "pagamentos da venda"
        ordering = ["pk"]
        constraints = [
            models.CheckConstraint(
                condition=Q(valor__gt=0), name="pagamento_da_venda_com_valor_positivo"
            ),
        ]

    def __str__(self) -> str:
        return f"{self.get_forma_display()} {em_reais(self.valor)} na venda #{self.venda.numero}"


class MovimentoDeEstoque(PertenceAoTenant):
    produto = models.ForeignKey(Produto, on_delete=models.RESTRICT, related_name="movimentos")
    loja = models.ForeignKey(Loja, on_delete=models.RESTRICT, related_name="movimentos_de_estoque")
    tipo = models.CharField(max_length=20, choices=TipoDeMovimento.choices)
    quantidade = models.IntegerField()
    custo_unitario = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    fornecedor = models.CharField(max_length=120, blank=True)
    observacao = models.CharField("observação", max_length=200, blank=True)
    ordem = models.ForeignKey(
        OrdemServico,
        on_delete=models.RESTRICT,
        related_name="movimentos_de_estoque",
        null=True,
        blank=True,
    )
    venda = models.ForeignKey(
        Venda,
        on_delete=models.RESTRICT,
        related_name="movimentos",
        null=True,
        blank=True,
    )
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="movimentos_de_estoque",
        null=True,
        blank=True,
    )

    class Meta:
        verbose_name = "movimento de estoque"
        verbose_name_plural = "movimentos de estoque"
        ordering = ["-criado_em", "-pk"]
        constraints = [
            models.CheckConstraint(condition=~Q(quantidade=0), name="movimento_com_quantidade"),
        ]
        indexes = [
            models.Index(fields=["produto", "loja"]),
            models.Index(fields=["tenant", "criado_em"]),
        ]

    def __str__(self) -> str:
        return f"{self.get_tipo_display()}: {self.quantidade:+d} {self.produto}"


def baixar_pecas_da_ordem(ordem: OrdemServico, usuario_id: int | None) -> None:
    aprovados = ordem.itens.filter(aprovado=True, produto__isnull=False)
    pecas = [item.produto_id for item in aprovados if item.produto_id is not None]
    travar(pecas)
    MovimentoDeEstoque.objects.bulk_create(
        MovimentoDeEstoque(
            tenant_id=ordem.tenant_id,
            produto_id=produto_id,
            loja_id=ordem.loja_id,
            tipo=TipoDeMovimento.ORDEM,
            quantidade=-1,
            ordem=ordem,
            usuario_id=usuario_id,
        )
        for produto_id in pecas
    )


def guardar_custo_das_pecas(ordem: OrdemServico) -> None:
    custo_de_agora = Produto.objects.filter(pk=OuterRef("produto_id")).values("custo")[:1]
    ordem.itens.filter(aprovado=True, produto__isnull=False, custo__isnull=True).update(
        custo=Subquery(custo_de_agora)
    )
