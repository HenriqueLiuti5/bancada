from typing import Any

from django.db.models import ProtectedError, QuerySet
from rest_framework import permissions, status, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.serializers import BaseSerializer
from rest_framework.views import APIView

from bancada.core.rls import aplicar_tenant
from bancada.tenants.models import Tenant, Usuario


def tenant_do_pedido(request: Request) -> Tenant | None:
    usuario = request.user
    if isinstance(usuario, Usuario):
        return usuario.tenant
    return None


SEM_ASSISTENCIA = "Seu usuário não está vinculado a nenhuma assistência."


def tenant_obrigatorio(request: Request) -> Tenant:
    tenant = tenant_do_pedido(request)
    if tenant is None:
        raise PermissionDenied(SEM_ASSISTENCIA)
    return tenant


def usuario_obrigatorio(request: Request) -> Usuario:
    usuario = request.user
    if not isinstance(usuario, Usuario):
        raise PermissionDenied(SEM_ASSISTENCIA)
    return usuario


class PertenceAUmaAssistencia(permissions.BasePermission):
    message = SEM_ASSISTENCIA

    def has_permission(self, request: Request, view: APIView) -> bool:
        return tenant_do_pedido(request) is not None


class ViewSetDoTenant(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, PertenceAUmaAssistencia]

    def initial(self, request: Request, *args: Any, **kwargs: Any) -> None:
        super().initial(request, *args, **kwargs)
        tenant = tenant_do_pedido(request)
        aplicar_tenant(tenant.pk if tenant else -1)

    def get_queryset(self) -> QuerySet[Any]:
        return super().get_queryset().filter(tenant=tenant_do_pedido(self.request))

    def perform_create(self, serializer: BaseSerializer) -> None:
        serializer.save(tenant=tenant_do_pedido(self.request))

    def destroy(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {"detail": "Não dá para apagar: há ordens de serviço ligadas a este registro."},
                status=status.HTTP_409_CONFLICT,
            )
