from datetime import date
from decimal import Decimal
from typing import Any

from django.utils import timezone
from rest_framework import serializers

from bancada.financeiro.models import (
    ConferenciaDoCaixa,
    ContaAPagar,
    FormaDePagamentoDaConta,
    MovimentoDoCaixa,
    PagamentoDaConta,
)
from bancada.ordens.models import OrdemServico
from bancada.tenants.models import Loja, Papel, Tenant

ESCOLHA_A_FORMA = "Escolha como a conta foi paga."


def campo_de_valor(
    obrigatorio: str = "Informe o valor da conta.",
    minimo: Decimal = Decimal("0.01"),
    **opcoes: Any,
) -> serializers.DecimalField:
    return serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        min_value=minimo,
        error_messages={
            "required": obrigatorio,
            "null": obrigatorio,
            "invalid": "Escreva só o número, como 150,00.",
            "min_value": (
                "O valor precisa ser maior que zero."
                if minimo
                else "O valor não pode ser negativo."
            ),
            "max_digits": "Valor alto demais.",
            "max_whole_digits": "Valor alto demais.",
        },
        **opcoes,
    )


def campo_de_forma(**opcoes: Any) -> serializers.ChoiceField:
    return serializers.ChoiceField(
        choices=FormaDePagamentoDaConta.choices,
        error_messages={"required": ESCOLHA_A_FORMA, "invalid_choice": ESCOLHA_A_FORMA},
        **opcoes,
    )


def data_do_pagamento(informada: Any) -> Any:
    hoje = timezone.localdate()
    paga_em = informada or hoje
    if paga_em > hoje:
        raise serializers.ValidationError(
            {"paga_em": "A data do pagamento não pode ser depois de hoje."}
        )
    return paga_em


class CamposDaConta(serializers.ModelSerializer):
    valor = campo_de_valor()

    class Meta:
        model = ContaAPagar
        fields = [
            "descricao",
            "categoria",
            "fornecedor",
            "valor",
            "vencimento",
            "loja",
            "observacao",
        ]
        extra_kwargs = {
            "descricao": {
                "error_messages": {
                    "required": "Escreva o que é a conta.",
                    "blank": "Escreva o que é a conta.",
                }
            },
            "categoria": {
                "error_messages": {
                    "required": "Escolha a categoria.",
                    "invalid_choice": "Escolha a categoria.",
                }
            },
            "vencimento": {
                "error_messages": {
                    "required": "Informe o vencimento.",
                    "null": "Informe o vencimento.",
                    "invalid": "Informe o vencimento.",
                }
            },
        }

    # A loja desativada não recebe conta nova, mas a conta que já era dela continua com ela.
    def validate_loja(self, loja: Loja | None) -> Loja | None:
        if loja is None:
            return None
        tenant: Tenant = self.context["tenant"]
        if loja.tenant_id != tenant.pk:
            raise serializers.ValidationError("Não pertence à sua assistência.")
        atual = getattr(self.instance, "loja_id", None)
        if not loja.ativa and loja.pk != atual:
            raise serializers.ValidationError("Esta loja foi desativada. Escolha uma loja ativa.")
        return loja


class NovaContaSerializer(CamposDaConta):
    paga = serializers.BooleanField(required=False, default=False)
    paga_em = serializers.DateField(
        required=False,
        allow_null=True,
        default=None,
        error_messages={"invalid": "Informe a data do pagamento."},
    )
    forma = campo_de_forma(required=False, allow_blank=True, default="")
    repetir = serializers.BooleanField(required=False, default=False)

    class Meta(CamposDaConta.Meta):
        fields = [*CamposDaConta.Meta.fields, "paga", "paga_em", "forma", "repetir"]

    def validate(self, attrs: dict) -> dict:
        paga = attrs.pop("paga")
        paga_em = attrs.pop("paga_em")
        forma = attrs.pop("forma")
        attrs["pagamento"] = None
        if paga:
            if not forma:
                raise serializers.ValidationError({"forma": ESCOLHA_A_FORMA})
            attrs["pagamento"] = PagamentoDaConta(data_do_pagamento(paga_em), forma)

        if attrs["repetir"] and self.context["papel"] != Papel.DONO:
            raise serializers.ValidationError(
                {"repetir": "Só o dono lança contas que se repetem todo mês."}
            )
        return attrs


class EdicaoDaContaSerializer(CamposDaConta):
    tambem_nas_proximas = serializers.BooleanField(required=False, default=False)

    class Meta(CamposDaConta.Meta):
        fields = [*CamposDaConta.Meta.fields, "tambem_nas_proximas"]

    def update(self, instance: ContaAPagar, validated_data: dict) -> ContaAPagar:
        tambem_nas_proximas = validated_data.pop("tambem_nas_proximas", False)
        conta = super().update(instance, validated_data)
        if tambem_nas_proximas:
            conta.mudar_tambem_as_proximas()
        return conta


class PagamentoSerializer(serializers.Serializer):
    paga_em = serializers.DateField(
        required=False,
        allow_null=True,
        default=None,
        error_messages={"invalid": "Informe a data do pagamento."},
    )
    forma = campo_de_forma()
    valor = campo_de_valor(required=False)

    def validate(self, attrs: dict) -> dict:
        pagamento = PagamentoDaConta(data_do_pagamento(attrs["paga_em"]), attrs["forma"])
        return {"pagamento": pagamento, "valor": attrs.get("valor")}


class ContaAPagarSerializer(serializers.ModelSerializer):
    categoria_rotulo = serializers.CharField(source="get_categoria_display", read_only=True)
    forma_rotulo = serializers.CharField(source="get_forma_display", read_only=True)
    loja_nome = serializers.CharField(source="loja.nome", read_only=True, default=None)
    paga = serializers.BooleanField(read_only=True)
    repete = serializers.BooleanField(read_only=True)
    dia_da_repeticao = serializers.SerializerMethodField()
    lancada_por = serializers.CharField(
        source="lancada_por.nome_de_exibicao", read_only=True, default=None
    )
    paga_por = serializers.CharField(
        source="paga_por.nome_de_exibicao", read_only=True, default=None
    )

    class Meta:
        model = ContaAPagar
        fields = [
            "id",
            "descricao",
            "categoria",
            "categoria_rotulo",
            "fornecedor",
            "valor",
            "vencimento",
            "loja",
            "loja_nome",
            "observacao",
            "paga",
            "paga_em",
            "forma",
            "forma_rotulo",
            "repete",
            "dia_da_repeticao",
            "lancada_por",
            "paga_por",
            "criado_em",
        ]

    def get_dia_da_repeticao(self, obj: ContaAPagar) -> int | None:
        return obj.conta_fixa.dia if obj.repete and obj.conta_fixa is not None else None


def loja_ativa_da_assistencia(loja: Loja, tenant: Tenant) -> Loja:
    if loja.tenant_id != tenant.pk:
        raise serializers.ValidationError("Não pertence à sua assistência.")
    if not loja.ativa:
        raise serializers.ValidationError("Esta loja foi desativada.")
    return loja


class MovimentoDoCaixaSerializer(serializers.ModelSerializer):
    valor = campo_de_valor("Informe o valor.")
    tipo_rotulo = serializers.CharField(source="get_tipo_display", read_only=True)
    registrado_por = serializers.CharField(
        source="registrado_por.nome_de_exibicao", read_only=True, default=None
    )

    class Meta:
        model = MovimentoDoCaixa
        fields = [
            "id",
            "loja",
            "tipo",
            "tipo_rotulo",
            "valor",
            "motivo",
            "registrado_por",
            "criado_em",
        ]
        extra_kwargs = {
            "tipo": {
                "error_messages": {
                    "required": "Escolha retirada ou reforço.",
                    "invalid_choice": "Escolha retirada ou reforço.",
                }
            },
            "motivo": {"required": False},
        }

    def validate_loja(self, loja: Loja) -> Loja:
        return loja_ativa_da_assistencia(loja, self.context["tenant"])


class NovaConferenciaSerializer(serializers.Serializer):
    loja = serializers.PrimaryKeyRelatedField(queryset=Loja.objects.all())
    contado = campo_de_valor("Informe quanto dinheiro tem na gaveta.", minimo=Decimal("0"))
    retirado = campo_de_valor(
        "Informe quanto vai tirar.", minimo=Decimal("0"), required=False, default=Decimal("0")
    )
    observacao = serializers.CharField(max_length=200, required=False, allow_blank=True, default="")

    def validate_loja(self, loja: Loja) -> Loja:
        return loja_ativa_da_assistencia(loja, self.context["tenant"])

    def validate(self, attrs: dict) -> dict:
        if attrs["retirado"] > attrs["contado"]:
            raise serializers.ValidationError(
                {"retirado": "Não dá para tirar mais do que tem na gaveta."}
            )
        return attrs


# A equipe conta o dinheiro sem ver quanto devia ter: o esperado e a diferença são só do dono.
class ConferenciaDaEquipeSerializer(serializers.ModelSerializer):
    retirado = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    conferida_por = serializers.CharField(
        source="conferida_por.nome_de_exibicao", read_only=True, default=None
    )

    class Meta:
        model = ConferenciaDoCaixa
        fields = [
            "id",
            "loja",
            "dia",
            "contado",
            "na_gaveta",
            "retirado",
            "observacao",
            "conferida_por",
            "criado_em",
        ]


class ConferenciaSerializer(ConferenciaDaEquipeSerializer):
    diferenca = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True, allow_null=True
    )

    class Meta(ConferenciaDaEquipeSerializer.Meta):
        fields = [*ConferenciaDaEquipeSerializer.Meta.fields, "esperado", "diferenca"]


class MovimentoDoDiaSerializer(serializers.Serializer):
    momento = serializers.DateTimeField(allow_null=True)
    tipo = serializers.CharField()
    descricao = serializers.CharField()
    forma = serializers.CharField()
    forma_rotulo = serializers.SerializerMethodField()
    valor = serializers.DecimalField(max_digits=12, decimal_places=2)
    usuario = serializers.CharField(allow_null=True)
    ordem = serializers.IntegerField(allow_null=True)
    venda = serializers.IntegerField(allow_null=True)
    conta = serializers.IntegerField(allow_null=True)
    movimento = serializers.IntegerField(allow_null=True)

    def get_forma_rotulo(self, obj: Any) -> str:
        return str(FormaDePagamentoDaConta(obj.forma).label)


ESCOLHA_A_LOJA = "Escolha a loja."


class FiltroDoCaixaSerializer(serializers.Serializer):
    loja = serializers.PrimaryKeyRelatedField(
        queryset=Loja.objects.all(),
        error_messages={
            "required": ESCOLHA_A_LOJA,
            "null": ESCOLHA_A_LOJA,
            "does_not_exist": ESCOLHA_A_LOJA,
            "incorrect_type": ESCOLHA_A_LOJA,
        },
    )
    dia = serializers.DateField(required=False, error_messages={"invalid": "Escolha o dia."})

    def validate_loja(self, loja: Loja) -> Loja:
        if loja.tenant_id != self.context["tenant"].pk:
            raise serializers.ValidationError("Não pertence à sua assistência.")
        return loja

    def validate_dia(self, dia: date) -> date:
        if dia > timezone.localdate():
            raise serializers.ValidationError("O caixa de um dia que ainda não chegou está vazio.")
        return dia


class ContaAReceberSerializer(serializers.ModelSerializer):
    cliente_nome = serializers.CharField(source="cliente.nome", read_only=True)
    cliente_telefone = serializers.CharField(source="cliente.telefone", read_only=True)
    aparelho_descricao = serializers.CharField(source="aparelho.__str__", read_only=True)
    loja_nome = serializers.CharField(source="loja.nome", read_only=True)
    valor_pago = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    saldo = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    quitada_em = serializers.DateTimeField(read_only=True)

    class Meta:
        model = OrdemServico
        fields = [
            "id",
            "numero",
            "cliente_nome",
            "cliente_telefone",
            "aparelho_descricao",
            "loja",
            "loja_nome",
            "valor_cobrado",
            "valor_pago",
            "saldo",
            "pagamento_combinado_para",
            "entregue_em",
            "quitada_em",
        ]
