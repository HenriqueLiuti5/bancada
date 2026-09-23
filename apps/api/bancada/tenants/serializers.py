from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as ErroDeValidacaoDoDjango
from rest_framework import serializers

from bancada.tenants.models import Loja, Papel, Tenant, Usuario


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


def _conferir_senha(valor: str) -> str:
    try:
        validate_password(valor)
    except ErroDeValidacaoDoDjango as erro:
        raise serializers.ValidationError(list(erro.messages)) from erro
    return valor


class UsuarioDaEquipeSerializer(serializers.ModelSerializer):
    papel_rotulo = serializers.CharField(source="get_papel_display", read_only=True)

    class Meta:
        model = Usuario
        fields = [
            "id",
            "username",
            "first_name",
            "email",
            "papel",
            "papel_rotulo",
            "is_active",
            "last_login",
        ]


class CriacaoDeUsuarioSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True, default="")
    email = serializers.EmailField(required=False, allow_blank=True, default="")
    papel = serializers.ChoiceField(choices=Papel.choices)
    senha = serializers.CharField(write_only=True)

    def validate_username(self, valor: str) -> str:
        if Usuario.objects.filter(username__iexact=valor).exists():
            raise serializers.ValidationError("Esse nome de usuário já está em uso.")
        return valor

    def validate_senha(self, valor: str) -> str:
        return _conferir_senha(valor)


class EdicaoDeUsuarioSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    papel = serializers.ChoiceField(choices=Papel.choices, required=False)
    is_active = serializers.BooleanField(required=False)


class NovaSenhaSerializer(serializers.Serializer):
    senha = serializers.CharField(write_only=True)

    def validate_senha(self, valor: str) -> str:
        return _conferir_senha(valor)
