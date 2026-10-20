from datetime import timedelta
from typing import Any

from django.utils import timezone
from rest_framework.authentication import TokenAuthentication
from rest_framework.authtoken.models import Token
from rest_framework.exceptions import AuthenticationFailed

from bancada.core.fuso import ativar_o_fuso_da
from bancada.tenants.models import Usuario

INTERVALO_ENTRE_REGISTROS_DE_ACESSO = timedelta(minutes=15)
VALIDADE_DO_TOKEN = timedelta(days=30)


def token_vencido(token: Token) -> bool:
    return timezone.now() - token.created > VALIDADE_DO_TOKEN


def registrar_acesso(usuario: Usuario) -> None:
    agora = timezone.now()
    ultimo = usuario.ultimo_acesso
    if ultimo is not None and agora - ultimo < INTERVALO_ENTRE_REGISTROS_DE_ACESSO:
        return
    Usuario.objects.filter(pk=usuario.pk).update(ultimo_acesso=agora)
    usuario.ultimo_acesso = agora


class TokenQueRegistraAcesso(TokenAuthentication):
    def authenticate_credentials(self, key: str) -> tuple[Any, Any]:
        usuario, token = super().authenticate_credentials(key)
        if token_vencido(token):
            raise AuthenticationFailed("Sua sessão expirou. Entre de novo.")
        if isinstance(usuario, Usuario):
            registrar_acesso(usuario)
            ativar_o_fuso_da(usuario.tenant)
        return usuario, token
