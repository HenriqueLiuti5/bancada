from django.db.models import QuerySet
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.serializers import BaseSerializer

from bancada.core.api import ViewSetDoTenant, tenant_do_pedido
from bancada.ordens.estados import TransicaoInvalida
from bancada.ordens.models import OrdemServico
from bancada.ordens.serializers import (
    AberturaOrdemSerializer,
    OrdemServicoDetailSerializer,
    OrdemServicoListSerializer,
    TransicaoSerializer,
)
from bancada.tenants.models import Usuario


class OrdemServicoViewSet(ViewSetDoTenant):
    queryset = OrdemServico.objects.select_related("cliente", "aparelho", "tecnico", "loja")

    def get_serializer_class(self) -> type[BaseSerializer]:
        if self.action == "list":
            return OrdemServicoListSerializer
        return OrdemServicoDetailSerializer

    def get_queryset(self) -> QuerySet[OrdemServico]:
        consulta = super().get_queryset()
        if self.action != "list":
            consulta = consulta.prefetch_related("itens", "eventos__usuario")
        situacao = self.request.query_params.get("status")
        if situacao:
            consulta = consulta.filter(status=situacao)
        return consulta

    def create(self, request: Request, *args: object, **kwargs: object) -> Response:
        tenant = tenant_do_pedido(request)
        if tenant is None:
            return Response(status=status.HTTP_403_FORBIDDEN)
        entrada = AberturaOrdemSerializer(data=request.data, context={"tenant": tenant})
        entrada.is_valid(raise_exception=True)

        usuario = request.user if isinstance(request.user, Usuario) else None
        ordem = OrdemServico.abrir(
            tenant=tenant,
            loja=entrada.validated_data["loja"],
            cliente=entrada.validated_data["cliente"],
            aparelho=entrada.validated_data["aparelho"],
            problema_relatado=entrada.validated_data["problema_relatado"],
            aberta_por=usuario,
            tecnico=usuario,
        )
        saida = OrdemServicoDetailSerializer(ordem, context=self.get_serializer_context())
        return Response(saida.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def transicionar(self, request: Request, pk: str | None = None) -> Response:
        entrada = TransicaoSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)

        ordem = self.get_object()
        usuario = request.user if isinstance(request.user, Usuario) else None
        try:
            ordem.transicionar(
                entrada.validated_data["status"],
                usuario=usuario,
                nota=entrada.validated_data["nota"],
            )
        except TransicaoInvalida as erro:
            return Response({"detail": str(erro)}, status=status.HTTP_409_CONFLICT)

        ordem = self.get_queryset().get(pk=ordem.pk)
        saida = OrdemServicoDetailSerializer(ordem, context=self.get_serializer_context())
        return Response(saida.data)
