from typing import Any

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as ErroDeValidacaoDoDjango
from django.utils import timezone
from rest_framework import serializers

from bancada.assinaturas.models import Assinatura
from bancada.assinaturas.serializers import resumo_da_assinatura
from bancada.core.telefones import telefone_brasileiro
from bancada.tenants import logo
from bancada.tenants.links import link_do_convite
from bancada.tenants.models import Convite, Loja, Papel, Tenant, Usuario, normalizar_email

TAMANHO_MAXIMO_DO_EMAIL = 150


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
    email_confirmado = serializers.BooleanField(read_only=True)

    class Meta:
        model = Usuario
        fields = [
            "id",
            "username",
            "first_name",
            "email",
            "email_confirmado",
            "papel",
            "tenant",
            "da_plataforma",
        ]
        read_only_fields = ["da_plataforma"]


class EuSerializer(UsuarioSerializer):
    assinatura = serializers.SerializerMethodField()

    class Meta(UsuarioSerializer.Meta):
        fields = [
            *UsuarioSerializer.Meta.fields,
            "tours_vistos",
            "primeiros_passos_escondidos",
            "assinatura",
        ]

    def get_assinatura(self, usuario: Usuario) -> dict[str, Any] | None:
        if usuario.tenant_id is None:
            return None
        assinatura = Assinatura.objects.filter(tenant_id=usuario.tenant_id).first()
        if assinatura is None:
            return None
        return resumo_da_assinatura(assinatura, timezone.localdate())


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, style={"input_type": "password"})


def conferir_senha(valor: str, usuario: Usuario | None = None) -> str:
    try:
        validate_password(valor, usuario)
    except ErroDeValidacaoDoDjango as erro:
        raise serializers.ValidationError(list(erro.messages)) from erro
    return valor


def _conferir_senha_de_conta_nova(dados: dict, nome: str, email: str) -> None:
    rascunho = Usuario(username=email, email=email, first_name=nome)
    try:
        conferir_senha(dados["senha"], rascunho)
    except serializers.ValidationError as erro:
        raise serializers.ValidationError({"senha": erro.detail}) from erro


def _conferir_email_livre(valor: str) -> str:
    endereco = normalizar_email(valor)
    if Usuario.email_em_uso(endereco):
        raise serializers.ValidationError("Já existe uma conta com esse e-mail.")
    return endereco


def _conferir_whatsapp(valor: str) -> str:
    digitos = telefone_brasileiro(valor)
    if digitos is None:
        raise serializers.ValidationError("Informe o número com DDD, por exemplo (11) 91234-5678.")
    return digitos


class CadastroSerializer(serializers.Serializer):
    assistencia = serializers.CharField(max_length=120)
    nome = serializers.CharField(max_length=150)
    email = serializers.EmailField(max_length=TAMANHO_MAXIMO_DO_EMAIL)
    whatsapp = serializers.CharField(max_length=30)
    senha = serializers.CharField(write_only=True)
    aceite_dos_termos = serializers.BooleanField()

    def validate_email(self, valor: str) -> str:
        return _conferir_email_livre(valor)

    def validate_whatsapp(self, valor: str) -> str:
        return _conferir_whatsapp(valor)

    def validate_aceite_dos_termos(self, valor: bool) -> bool:
        if not valor:
            raise serializers.ValidationError(
                "Para criar a conta, aceite os termos de uso e a política de privacidade."
            )
        return valor

    def validate(self, dados: dict) -> dict:
        _conferir_senha_de_conta_nova(dados, dados["nome"], dados["email"])
        return dados


class EsqueciASenhaSerializer(serializers.Serializer):
    email = serializers.EmailField()


class RedefinicaoDeSenhaSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    senha = serializers.CharField(write_only=True)


class ConfirmacaoDeEmailSerializer(serializers.Serializer):
    token = serializers.CharField()


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


class EdicaoDeUsuarioSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    papel = serializers.ChoiceField(choices=Papel.choices, required=False)
    is_active = serializers.BooleanField(required=False)


class NovaSenhaSerializer(serializers.Serializer):
    senha = serializers.CharField(write_only=True)

    def validate_senha(self, valor: str) -> str:
        return conferir_senha(valor)


class ConviteSerializer(serializers.ModelSerializer):
    papel_rotulo = serializers.CharField(source="get_papel_display", read_only=True)
    link = serializers.SerializerMethodField()
    expirado = serializers.BooleanField(read_only=True)

    class Meta:
        model = Convite
        fields = [
            "id",
            "nome",
            "papel",
            "papel_rotulo",
            "email",
            "link",
            "expira_em",
            "expirado",
            "criado_em",
        ]

    def get_link(self, convite: Convite) -> str:
        return link_do_convite(convite)


class NovoConviteSerializer(serializers.Serializer):
    nome = serializers.CharField(max_length=150)
    papel = serializers.ChoiceField(choices=Papel.choices)
    email = serializers.EmailField(
        max_length=TAMANHO_MAXIMO_DO_EMAIL, required=False, allow_blank=True, default=""
    )

    def validate_email(self, valor: str) -> str:
        return _conferir_email_livre(valor) if valor else ""


class ConvitePublicoSerializer(serializers.ModelSerializer):
    assistencia = serializers.CharField(source="tenant.nome", read_only=True)
    papel_rotulo = serializers.CharField(source="get_papel_display", read_only=True)

    class Meta:
        model = Convite
        fields = ["assistencia", "nome", "email", "papel", "papel_rotulo", "expira_em"]


class AceiteDeConviteSerializer(serializers.Serializer):
    nome = serializers.CharField(max_length=150)
    email = serializers.EmailField(max_length=TAMANHO_MAXIMO_DO_EMAIL)
    senha = serializers.CharField(write_only=True)

    def validate_email(self, valor: str) -> str:
        return _conferir_email_livre(valor)

    def validate(self, dados: dict) -> dict:
        _conferir_senha_de_conta_nova(dados, dados["nome"], dados["email"])
        return dados


class AssistenciaSerializer(serializers.ModelSerializer):
    logo = serializers.SerializerMethodField()

    class Meta:
        model = Tenant
        fields = ["nome", "documento", "whatsapp", "logo"]
        extra_kwargs = {"whatsapp": {"allow_blank": False}}

    def get_logo(self, tenant: Tenant) -> dict[str, Any] | None:
        return logo.para_exibir(tenant)

    def validate_nome(self, valor: str) -> str:
        return valor.strip()

    def validate_whatsapp(self, valor: str) -> str:
        return _conferir_whatsapp(valor)


class EnvioDeLogoSerializer(serializers.Serializer):
    arquivo = serializers.FileField()


class EdicaoDeLojaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Loja
        fields = ["nome", "telefone", "endereco"]

    def validate_telefone(self, valor: str) -> str:
        return _conferir_whatsapp(valor) if valor.strip() else ""
