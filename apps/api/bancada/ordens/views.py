from collections.abc import Callable

from django.db.models import QuerySet
from django.http import HttpResponse
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.serializers import BaseSerializer

from bancada.core.api import ViewSetDoTenant, tenant_do_pedido
from bancada.ordens import documentos
from bancada.ordens.estados import TransicaoInvalida
from bancada.ordens.fotos import FotoInvalida
from bancada.ordens.models import FotoOS, OrdemServico
from bancada.ordens.serializers import (
    AberturaOrdemSerializer,
    EnvioDeFotoSerializer,
    FotoOSSerializer,
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
            consulta = consulta.prefetch_related(
                "itens", "eventos__usuario", "eventos__aviso", "fotos"
            )
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

    def _documento_em_pdf(
        self, gerar: Callable[[OrdemServico], bytes], documento: str
    ) -> HttpResponse:
        ordem = self.get_object()
        resposta = HttpResponse(gerar(ordem), content_type="application/pdf")
        nome = documentos.nome_do_arquivo(ordem, documento)
        resposta["Content-Disposition"] = f'inline; filename="{nome}"'
        return resposta

    @action(detail=True, methods=["get"])
    def comprovante(self, request: Request, pk: str | None = None) -> HttpResponse:
        return self._documento_em_pdf(documentos.comprovante_em_pdf, "comprovante")

    @action(detail=True, methods=["get"])
    def recibo(self, request: Request, pk: str | None = None) -> HttpResponse:
        return self._documento_em_pdf(documentos.recibo_em_pdf, "recibo")

    @action(
        detail=True,
        methods=["post"],
        url_path="fotos",
        parser_classes=[MultiPartParser, FormParser],
    )
    def enviar_foto(self, request: Request, pk: str | None = None) -> Response:
        entrada = EnvioDeFotoSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)

        ordem = self.get_object()
        usuario = request.user if isinstance(request.user, Usuario) else None
        try:
            foto = FotoOS.registrar(
                ordem=ordem,
                enviado=entrada.validated_data["arquivo"],
                momento=entrada.validated_data["momento"],
                legenda=entrada.validated_data["legenda"],
                enviada_por=usuario,
            )
        except FotoInvalida as erro:
            return Response({"arquivo": [str(erro)]}, status=status.HTTP_400_BAD_REQUEST)

        return Response(FotoOSSerializer(foto).data, status=status.HTTP_201_CREATED)

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


class FotoViewSet(ViewSetDoTenant):
    serializer_class = FotoOSSerializer
    queryset = FotoOS.objects.select_related("ordem")
    http_method_names = ["patch", "delete"]
