from rest_framework import serializers

from bancada.clientes.models import Aparelho, Cliente


class AparelhoSerializer(serializers.ModelSerializer):
    descricao = serializers.CharField(source="__str__", read_only=True)
    imei_mascarado = serializers.CharField(read_only=True)
    senha_desbloqueio = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Aparelho
        fields = [
            "id",
            "cliente",
            "descricao",
            "marca",
            "modelo",
            "cor",
            "imei",
            "imei_mascarado",
            "senha_desbloqueio",
        ]


class ClienteSerializer(serializers.ModelSerializer):
    aparelhos = AparelhoSerializer(many=True, read_only=True)

    class Meta:
        model = Cliente
        fields = ["id", "nome", "telefone", "email", "documento", "aparelhos"]
