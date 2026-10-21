from collections import defaultdict
from decimal import Decimal
from typing import Any

from django.db.models import Q, Sum
from rest_framework import serializers

from bancada.core.formatos import em_reais
from bancada.estoque.models import (
    ZERO,
    ItemDaVenda,
    LinhaDaVenda,
    MovimentoDeEstoque,
    PagamentoDaVenda,
    Produto,
    Venda,
)
from bancada.ordens.models import Recebimento
from bancada.ordens.serializers import RecebimentoSerializer
from bancada.tenants.models import Loja, Tenant

QUANTIDADE_MAXIMA = 100_000


def lojas_do_estoque(tenant: Tenant) -> list[Loja]:
    lojas = list(
        Loja.objects.filter(tenant=tenant)
        .filter(Q(ativa=True) | Q(movimentos_de_estoque__isnull=False))
        .distinct()
    )
    return lojas if len(lojas) > 1 else []


def contexto_das_lojas(tenant: Tenant, produtos: list[Produto]) -> dict[str, Any]:
    lojas = lojas_do_estoque(tenant)
    por_loja: dict[int, dict[int, int]] = defaultdict(dict)
    if lojas:
        linhas = (
            MovimentoDeEstoque.objects.filter(produto__in=produtos)
            .order_by()
            .values("produto", "loja")
            .annotate(total=Sum("quantidade"))
        )
        for linha in linhas:
            por_loja[linha["produto"]][linha["loja"]] = linha["total"]
    return {"lojas": lojas, "por_loja": por_loja}


def loja_do_movimento(loja: Loja | None, tenant: Tenant, campo: str = "loja") -> Loja:
    if loja is None:
        ativas = list(Loja.objects.filter(tenant=tenant, ativa=True)[:2])
        if len(ativas) == 1:
            return ativas[0]
        raise serializers.ValidationError({campo: "Escolha a loja."})
    if loja.tenant_id != tenant.pk:
        raise serializers.ValidationError({campo: "Não pertence à sua assistência."})
    if not loja.ativa:
        raise serializers.ValidationError(
            {campo: "Esta loja foi desativada. Escolha uma loja ativa."}
        )
    return loja


def campo_de_dinheiro(**opcoes: Any) -> serializers.DecimalField:
    return serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        min_value=Decimal("0"),
        error_messages={"min_value": "O valor não pode ser negativo."},
        **opcoes,
    )


def campo_de_quantidade(minimo: int = 1, **opcoes: Any) -> serializers.IntegerField:
    return serializers.IntegerField(
        min_value=minimo,
        max_value=QUANTIDADE_MAXIMA,
        error_messages={
            "min_value": "A quantidade precisa ser maior que zero."
            if minimo
            else "A quantidade não pode ser negativa.",
            "max_value": "Quantidade alta demais.",
            "invalid": "Escreva a quantidade só com números.",
        },
        **opcoes,
    )


class ProdutoSerializer(serializers.ModelSerializer):
    tipo_rotulo = serializers.CharField(source="get_tipo_display", read_only=True)
    quantidade = serializers.IntegerField(read_only=True)
    para_repor = serializers.SerializerMethodField()
    por_loja = serializers.SerializerMethodField()

    class Meta:
        model = Produto
        fields = [
            "id",
            "nome",
            "tipo",
            "tipo_rotulo",
            "codigo",
            "custo",
            "preco",
            "minimo",
            "ativo",
            "quantidade",
            "para_repor",
            "por_loja",
        ]

    def get_para_repor(self, obj: Produto) -> bool:
        return obj.ativo and getattr(obj, "quantidade", 0) < obj.minimo

    def get_por_loja(self, obj: Produto) -> list[dict[str, Any]]:
        lojas: list[Loja] = self.context.get("lojas", [])
        quantidades = self.context.get("por_loja", {}).get(obj.pk, {})
        linhas = [
            {
                "loja": loja.pk,
                "nome": loja.nome,
                "ativa": loja.ativa,
                "quantidade": quantidades.get(loja.pk, 0),
            }
            for loja in lojas
        ]
        return [linha for linha in linhas if linha["ativa"] or linha["quantidade"]]


class EdicaoDeProdutoSerializer(serializers.ModelSerializer):
    custo = campo_de_dinheiro(required=False)
    preco = campo_de_dinheiro(required=False)
    minimo = campo_de_quantidade(minimo=0, required=False)

    class Meta:
        model = Produto
        fields = ["nome", "tipo", "codigo", "custo", "preco", "minimo", "ativo"]
        extra_kwargs = {
            "nome": {"error_messages": {"blank": "Escreva o nome do produto."}},
            "tipo": {"error_messages": {"invalid_choice": "Escolha peça ou acessório."}},
        }

    def validate_nome(self, valor: str) -> str:
        return valor.strip()

    def validate_codigo(self, valor: str) -> str:
        codigo = valor.strip()
        if not codigo:
            return codigo
        repetidos = Produto.objects.filter(tenant=self.context["tenant"], codigo=codigo)
        if self.instance is not None:
            repetidos = repetidos.exclude(pk=self.instance.pk)
        if repetidos.exists():
            raise serializers.ValidationError("Já existe um produto com esse código.")
        return codigo


class NovoProdutoSerializer(EdicaoDeProdutoSerializer):
    quantidade = campo_de_quantidade(minimo=0, required=False, default=0)
    loja = serializers.PrimaryKeyRelatedField(
        queryset=Loja.objects.all(), required=False, allow_null=True
    )

    class Meta(EdicaoDeProdutoSerializer.Meta):
        fields = [*EdicaoDeProdutoSerializer.Meta.fields, "quantidade", "loja"]

    def validate(self, attrs: dict) -> dict:
        loja = attrs.pop("loja", None)
        if attrs.get("quantidade"):
            attrs["loja"] = loja_do_movimento(loja, self.context["tenant"])
        return attrs

    def create(self, validated_data: dict) -> Produto:
        quantidade = validated_data.pop("quantidade", 0)
        loja = validated_data.pop("loja", None)
        produto = super().create(validated_data)
        if quantidade and loja is not None:
            produto.registrar_estoque_inicial(
                loja=loja, quantidade=quantidade, usuario=self.context.get("usuario")
            )
        return produto


class EntradaSerializer(serializers.Serializer):
    loja = serializers.PrimaryKeyRelatedField(
        queryset=Loja.objects.all(), required=False, allow_null=True
    )
    quantidade = campo_de_quantidade()
    custo_unitario = campo_de_dinheiro()
    fornecedor = serializers.CharField(max_length=120, required=False, allow_blank=True, default="")

    def validate_fornecedor(self, valor: str) -> str:
        return valor.strip()

    def validate(self, attrs: dict) -> dict:
        attrs["loja"] = loja_do_movimento(attrs.get("loja"), self.context["tenant"])
        return attrs


class ContagemSerializer(serializers.Serializer):
    loja = serializers.PrimaryKeyRelatedField(
        queryset=Loja.objects.all(), required=False, allow_null=True
    )
    contada = campo_de_quantidade(minimo=0)
    observacao = serializers.CharField(max_length=200, required=False, allow_blank=True, default="")

    def validate_observacao(self, valor: str) -> str:
        return valor.strip()

    def validate(self, attrs: dict) -> dict:
        attrs["loja"] = loja_do_movimento(attrs.get("loja"), self.context["tenant"])
        return attrs


class TransferenciaSerializer(serializers.Serializer):
    de = serializers.PrimaryKeyRelatedField(queryset=Loja.objects.all())
    para = serializers.PrimaryKeyRelatedField(queryset=Loja.objects.all())
    quantidade = campo_de_quantidade()

    def validate(self, attrs: dict) -> dict:
        tenant = self.context["tenant"]
        attrs["de"] = loja_do_movimento(attrs["de"], tenant, "de")
        attrs["para"] = loja_do_movimento(attrs["para"], tenant, "para")
        if attrs["de"].pk == attrs["para"].pk:
            raise serializers.ValidationError({"para": "Escolha outra loja para receber."})
        return attrs


class MovimentoSerializer(serializers.ModelSerializer):
    tipo_rotulo = serializers.CharField(source="get_tipo_display", read_only=True)
    loja_nome = serializers.CharField(source="loja.nome", read_only=True)
    ordem_numero = serializers.IntegerField(source="ordem.numero", read_only=True, default=None)
    venda_numero = serializers.IntegerField(source="venda.numero", read_only=True, default=None)
    usuario = serializers.CharField(source="usuario.nome_de_exibicao", read_only=True, default=None)

    class Meta:
        model = MovimentoDeEstoque
        fields = [
            "id",
            "tipo",
            "tipo_rotulo",
            "quantidade",
            "loja",
            "loja_nome",
            "custo_unitario",
            "fornecedor",
            "observacao",
            "ordem",
            "ordem_numero",
            "venda",
            "venda_numero",
            "usuario",
            "criado_em",
        ]


class EscolhaDeProdutoSerializer(serializers.ModelSerializer):
    quantidade = serializers.IntegerField(read_only=True)
    por_loja = serializers.SerializerMethodField()

    class Meta:
        model = Produto
        fields = ["id", "nome", "tipo", "codigo", "custo", "preco", "quantidade", "por_loja"]

    def get_por_loja(self, obj: Produto) -> dict[str, int]:
        quantidades = self.context.get("por_loja", {}).get(obj.pk, {})
        return {str(loja): total for loja, total in quantidades.items()}


class LinhaDaVendaSerializer(serializers.Serializer):
    produto = serializers.PrimaryKeyRelatedField(queryset=Produto.objects.all())
    quantidade = campo_de_quantidade()


class NovaVendaSerializer(serializers.Serializer):
    loja = serializers.PrimaryKeyRelatedField(
        queryset=Loja.objects.all(), required=False, allow_null=True
    )
    itens = LinhaDaVendaSerializer(
        many=True,
        allow_empty=False,
        error_messages={"empty": "Escolha ao menos um produto."},
    )
    valor_cobrado = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        min_value=Decimal("0"),
        error_messages={"min_value": "O valor cobrado não pode ser negativo."},
    )
    pagamentos = RecebimentoSerializer(many=True, required=False, default=list)
    observacao = serializers.CharField(max_length=200, required=False, allow_blank=True, default="")

    def _linhas(self, itens: list[dict]) -> list[LinhaDaVenda]:
        tenant = self.context["tenant"]
        quantidades: dict[int, int] = {}
        produtos: dict[int, Produto] = {}
        for item in itens:
            produto: Produto = item["produto"]
            if produto.tenant_id != tenant.pk:
                raise serializers.ValidationError({"itens": "Há produtos de outra assistência."})
            if not produto.ativo:
                raise serializers.ValidationError(
                    {"itens": f"{produto.nome} foi desativado e não pode ser vendido."}
                )
            produtos[produto.pk] = produto
            quantidades[produto.pk] = quantidades.get(produto.pk, 0) + item["quantidade"]
        return [LinhaDaVenda(produtos[pk], quantidade) for pk, quantidade in quantidades.items()]

    def validate(self, attrs: dict) -> dict:
        attrs["loja"] = loja_do_movimento(attrs.get("loja"), self.context["tenant"])
        attrs["linhas"] = self._linhas(attrs.pop("itens"))
        attrs["recebimentos"] = [Recebimento(**pagamento) for pagamento in attrs.pop("pagamentos")]

        total = sum((linha.produto.preco * linha.quantidade for linha in attrs["linhas"]), ZERO)
        cobrado = attrs["valor_cobrado"]
        if cobrado > total:
            raise serializers.ValidationError(
                {
                    "valor_cobrado": "O valor cobrado não pode passar do total, que é "
                    f"{em_reais(total)}."
                }
            )

        pago = sum((recebimento.valor for recebimento in attrs["recebimentos"]), ZERO)
        if pago != cobrado:
            raise serializers.ValidationError(
                {
                    "pagamentos": f"Os pagamentos somam {em_reais(pago)}, e o valor cobrado é "
                    f"{em_reais(cobrado)}."
                }
            )
        return attrs


class ItemDaVendaSerializer(serializers.ModelSerializer):
    subtotal = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = ItemDaVenda
        fields = ["id", "produto", "descricao", "quantidade", "preco", "custo", "subtotal"]


class PagamentoDaVendaSerializer(serializers.ModelSerializer):
    forma_rotulo = serializers.CharField(source="get_forma_display", read_only=True)

    class Meta:
        model = PagamentoDaVenda
        fields = ["id", "forma", "forma_rotulo", "valor"]


class VendaResumoSerializer(serializers.ModelSerializer):
    loja_nome = serializers.CharField(source="loja.nome", read_only=True)
    vendida_por = serializers.CharField(
        source="vendida_por.nome_de_exibicao", read_only=True, default=None
    )
    resumo = serializers.SerializerMethodField()
    formas = serializers.SerializerMethodField()
    desfeita = serializers.BooleanField(read_only=True)

    class Meta:
        model = Venda
        fields = [
            "id",
            "numero",
            "loja",
            "loja_nome",
            "vendida_por",
            "valor_cobrado",
            "resumo",
            "formas",
            "desfeita",
            "criado_em",
        ]

    def get_resumo(self, obj: Venda) -> str:
        partes = [
            item.descricao if item.quantidade == 1 else f"{item.descricao} ×{item.quantidade}"
            for item in obj.itens.all()
        ]
        return ", ".join(partes)

    def get_formas(self, obj: Venda) -> str:
        rotulos = dict.fromkeys(pagamento.get_forma_display() for pagamento in obj.pagamentos.all())
        return ", ".join(rotulos)


class VendaSerializer(VendaResumoSerializer):
    itens = ItemDaVendaSerializer(many=True, read_only=True)
    pagamentos = PagamentoDaVendaSerializer(many=True, read_only=True)
    total = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    desconto = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    custo = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    lucro = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    desfeita_por = serializers.CharField(
        source="desfeita_por.nome_de_exibicao", read_only=True, default=None
    )

    class Meta(VendaResumoSerializer.Meta):
        fields = [
            *VendaResumoSerializer.Meta.fields,
            "total",
            "desconto",
            "custo",
            "lucro",
            "observacao",
            "desfeita_em",
            "desfeita_por",
            "itens",
            "pagamentos",
        ]
