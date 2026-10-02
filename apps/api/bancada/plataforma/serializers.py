from datetime import date
from decimal import Decimal

from django.utils import timezone
from rest_framework import serializers

from bancada.plataforma.meses import Mes, MesInvalido
from bancada.plataforma.models import Custo

VALOR_MAXIMO_DO_CUSTO = Decimal("99999.99")


def mes_valido(texto: str) -> Mes:
    try:
        mes = Mes.do_texto(texto)
    except MesInvalido as erro:
        raise serializers.ValidationError(str(erro)) from erro
    if mes > Mes.de(timezone.localdate()):
        raise serializers.ValidationError("Esse mês ainda não chegou.")
    return mes


class FiltroDoPainelSerializer(serializers.Serializer):
    mes = serializers.CharField(required=False)

    def validate_mes(self, valor: str) -> Mes:
        return mes_valido(valor)


class NovoCustoSerializer(serializers.Serializer):
    mes = serializers.CharField()
    descricao = serializers.CharField(max_length=80)
    valor = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        min_value=Decimal("0.01"),
        max_value=VALOR_MAXIMO_DO_CUSTO,
    )

    def validate_mes(self, valor: str) -> date:
        return mes_valido(valor).inicio


class CustoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Custo
        fields = ["id", "mes", "descricao", "valor"]
