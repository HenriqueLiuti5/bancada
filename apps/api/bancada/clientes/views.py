from django.db.models import QuerySet
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response

from bancada.clientes.models import Aparelho, Cliente
from bancada.clientes.serializers import AparelhoSerializer, ClienteSerializer
from bancada.core.api import ViewSetDoTenant
from bancada.tenants.models import Usuario


class ClienteViewSet(ViewSetDoTenant):
    serializer_class = ClienteSerializer
    queryset = Cliente.objects.prefetch_related("aparelhos")

    def get_queryset(self) -> QuerySet[Cliente]:
        consulta = super().get_queryset()
        busca = self.request.query_params.get("busca")
        if busca:
            consulta = consulta.filter(nome__icontains=busca)
        return consulta


class AparelhoViewSet(ViewSetDoTenant):
    serializer_class = AparelhoSerializer
    queryset = Aparelho.objects.select_related("cliente")

    def get_queryset(self) -> QuerySet[Aparelho]:
        consulta = super().get_queryset()
        cliente = self.request.query_params.get("cliente")
        if cliente:
            consulta = consulta.filter(cliente_id=cliente)
        return consulta

    @action(detail=True, methods=["get"], url_path="senha")
    def senha(self, request: Request, pk: str | None = None) -> Response:
        usuario = request.user
        if not isinstance(usuario, Usuario) or not usuario.e_tecnico:
            return Response(
                {"detail": "Apenas técnicos podem ver a senha de desbloqueio."},
                status=status.HTTP_403_FORBIDDEN,
            )
        aparelho = self.get_object()
        return Response({"senha_desbloqueio": aparelho.senha_desbloqueio})
