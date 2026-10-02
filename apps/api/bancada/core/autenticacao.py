from datetime import timedelta
from typing import Any

from django.utils import timezone
from rest_framework.authentication import TokenAuthentication

from bancada.tenants.models import Usuario

INTERVALO_ENTRE_REGISTROS_DE_ACESSO = timedelta(minutes=15)


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
        if isinstance(usuario, Usuario):
            registrar_acesso(usuario)
        return usuario, token
