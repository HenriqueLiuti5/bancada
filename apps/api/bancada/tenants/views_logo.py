from django.http import FileResponse, HttpResponseBase
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from bancada.auditoria.models import Acao
from bancada.auditoria.registro import origem_do_pedido, registrar
from bancada.core.api import AssinaturaPermiteEditar, PertenceAUmaAssistencia, tenant_obrigatorio
from bancada.tenants import logo
from bancada.tenants.models import Tenant, Usuario
from bancada.tenants.permissoes import ApenasDono
from bancada.tenants.serializers import AssistenciaSerializer, EnvioDeLogoSerializer

NAO_ENCONTRADA = {"detail": "Logo não encontrada ou link expirado."}


def _registrar(request: Request, tenant: Tenant, detalhe: str) -> None:
    registrar(
        tenant=tenant,
        usuario=request.user if isinstance(request.user, Usuario) else None,
        acao=Acao.ASSISTENCIA_ALTERADA,
        objeto="assistencia",
        objeto_id=tenant.pk,
        detalhe=detalhe,
        origem=origem_do_pedido(request),
    )


class LogoDaAssistenciaView(APIView):
    permission_classes = [
        IsAuthenticated,
        PertenceAUmaAssistencia,
        AssinaturaPermiteEditar,
        ApenasDono,
    ]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request: Request) -> Response:
        entrada = EnvioDeLogoSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)

        tenant = tenant_obrigatorio(request)
        try:
            logo.trocar(tenant, entrada.validated_data["arquivo"])
        except logo.LogoInvalida as erro:
            return Response({"arquivo": [str(erro)]}, status=status.HTTP_400_BAD_REQUEST)

        _registrar(request, tenant, "logo enviada")
        return Response(AssistenciaSerializer(tenant).data)

    def delete(self, request: Request) -> Response:
        tenant = tenant_obrigatorio(request)
        if tenant.logo:
            logo.remover(tenant)
            _registrar(request, tenant, "logo removida")
        return Response(status=status.HTTP_204_NO_CONTENT)


class ArquivoDaLogoView(APIView):
    permission_classes = [AllowAny]
    authentication_classes: list = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "arquivo_de_logo"

    def get(self, request: Request, assinatura: str) -> HttpResponseBase:
        tenant_id = logo.identificar(assinatura)
        tenant = Tenant.objects.filter(pk=tenant_id).first() if tenant_id else None
        if tenant is None or not tenant.logo:
            return Response(NAO_ENCONTRADA, status=status.HTTP_404_NOT_FOUND)

        try:
            conteudo = tenant.logo.open("rb")
        except OSError:
            return Response(NAO_ENCONTRADA, status=status.HTTP_404_NOT_FOUND)

        resposta = FileResponse(conteudo, content_type="image/png")
        resposta["Cache-Control"] = f"private, max-age={logo.SEGUNDOS_DE_VALIDADE_DO_LINK}"
        return resposta
