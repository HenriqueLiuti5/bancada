from rest_framework import permissions
from rest_framework.request import Request
from rest_framework.views import APIView

from bancada.tenants.models import Papel, Usuario


def papel_do_pedido(request: Request) -> str | None:
    usuario = request.user
    if isinstance(usuario, Usuario) and usuario.tenant_id is not None:
        return usuario.papel
    return None


class ApenasDono(permissions.BasePermission):
    message = "Só o dono da assistência pode fazer isso."

    def has_permission(self, request: Request, view: APIView) -> bool:
        return papel_do_pedido(request) == Papel.DONO


class DonoOuTecnico(permissions.BasePermission):
    message = "Essa ação é restrita ao dono e aos técnicos."

    def has_permission(self, request: Request, view: APIView) -> bool:
        return papel_do_pedido(request) in {Papel.DONO, Papel.TECNICO}


class ApagarSoDonoOuTecnico(permissions.BasePermission):
    message = "Só o dono e os técnicos podem apagar."

    def has_permission(self, request: Request, view: APIView) -> bool:
        if request.method != "DELETE":
            return True
        return papel_do_pedido(request) in {Papel.DONO, Papel.TECNICO}
