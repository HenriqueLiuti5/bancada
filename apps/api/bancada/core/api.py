from typing import Any

from django.db.models import QuerySet
from rest_framework import permissions, viewsets
from rest_framework.request import Request
from rest_framework.serializers import BaseSerializer
from rest_framework.views import APIView

from bancada.core.rls import aplicar_tenant
from bancada.tenants.models import Tenant, Usuario


def tenant_do_pedido(request: Request) -> Tenant | None:
    usuario = request.user
    if isinstance(usuario, Usuario):
        return usuario.tenant
    return None


class PertenceAUmaAssistencia(permissions.BasePermission):
    message = "Seu usuário não está vinculado a nenhuma assistência."

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
