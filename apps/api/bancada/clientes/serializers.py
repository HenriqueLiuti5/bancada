from rest_framework import serializers

from bancada.clientes.models import Aparelho, Cliente
from bancada.core.cpf_cnpj import conferir_documento_opcional
from bancada.core.telefones import conferir_telefone, so_digitos


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

    def validate_cliente(self, valor: Cliente) -> Cliente:
        if self.instance is not None and valor != self.instance.cliente:
            raise serializers.ValidationError("O aparelho não pode mudar de cliente.")
        return valor

    def validate_imei(self, valor: str) -> str:
        return so_digitos(valor)


class ClienteSerializer(serializers.ModelSerializer):
    aparelhos = AparelhoSerializer(many=True, read_only=True)
    telefone = serializers.CharField(max_length=30)
    documento = serializers.CharField(max_length=24, required=False, allow_blank=True)

    class Meta:
        model = Cliente
        fields = ["id", "nome", "telefone", "email", "documento", "aparelhos"]

    def validate_telefone(self, valor: str) -> str:
        return conferir_telefone(valor)

    def validate_documento(self, valor: str) -> str:
        return conferir_documento_opcional(valor)
