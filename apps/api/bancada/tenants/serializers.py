from rest_framework import serializers

from bancada.tenants.models import Loja, Tenant, Usuario


class TenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = ["id", "nome", "slug"]


class LojaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Loja
        fields = ["id", "nome", "telefone", "endereco"]


class UsuarioSerializer(serializers.ModelSerializer):
    tenant = TenantSerializer(read_only=True)

    class Meta:
        model = Usuario
        fields = ["id", "username", "first_name", "email", "papel", "tenant"]


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True, style={"input_type": "password"})
