from datetime import timedelta

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core import signing
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode

from bancada.tenants.models import Convite, Usuario, normalizar_email

SAL_DA_CONFIRMACAO = "bancada.tenants.confirmacao-de-email"
VALIDADE_DA_CONFIRMACAO = timedelta(days=7)
SEPARADOR_QUE_NAO_PRECISA_DE_ESCAPE_NA_URL = "."


def _assinador_da_confirmacao() -> signing.TimestampSigner:
    return signing.TimestampSigner(
        salt=SAL_DA_CONFIRMACAO, sep=SEPARADOR_QUE_NAO_PRECISA_DE_ESCAPE_NA_URL
    )


def link_de_confirmacao(usuario: Usuario) -> str:
    token = _assinador_da_confirmacao().sign_object(
        {"usuario": usuario.pk, "email": normalizar_email(usuario.email)}
    )
    return f"{settings.APP_PUBLIC_URL}/confirmar-email/{token}"


def usuario_da_confirmacao(token: str) -> Usuario | None:
    try:
        dados = _assinador_da_confirmacao().unsign_object(token, max_age=VALIDADE_DA_CONFIRMACAO)
    except signing.BadSignature:
        return None

    usuario = Usuario.objects.filter(pk=dados.get("usuario"), is_active=True).first()
    if usuario is None or normalizar_email(usuario.email) != dados.get("email"):
        return None
    return usuario


def link_de_recuperacao(usuario: Usuario) -> str:
    uid = urlsafe_base64_encode(force_bytes(usuario.pk))
    token = default_token_generator.make_token(usuario)
    return f"{settings.APP_PUBLIC_URL}/redefinir-senha/{uid}/{token}"


def usuario_da_recuperacao(uid: str, token: str) -> Usuario | None:
    try:
        pk = int(force_str(urlsafe_base64_decode(uid)))
    except (ValueError, TypeError, OverflowError):
        return None

    usuario = Usuario.objects.filter(pk=pk, is_active=True, tenant__isnull=False).first()
    if usuario is None or not default_token_generator.check_token(usuario, token):
        return None
    return usuario


def link_do_convite(convite: Convite) -> str:
    return f"{settings.APP_PUBLIC_URL}/convite/{convite.token}"
