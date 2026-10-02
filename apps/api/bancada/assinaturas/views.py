from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from bancada.assinaturas import servicos
from bancada.assinaturas.models import Assinatura, EventoDoProvedor
from bancada.assinaturas.provedor import (
    CABECALHO_DO_TOKEN_DO_WEBHOOK,
    ErroNoProvedor,
    evento_do_asaas,
    token_do_webhook_valido,
)
from bancada.assinaturas.serializers import AssinarSerializer, detalhe_da_assinatura
from bancada.auditoria.models import Acao
from bancada.auditoria.registro import origem_do_pedido, registrar
from bancada.core.api import (
    PertenceAUmaAssistencia,
    ViewDoTenant,
    tenant_obrigatorio,
    usuario_obrigatorio,
)
from bancada.tenants.permissoes import ApenasDono


class ViewDaAssinatura(ViewDoTenant):
    permission_classes = [IsAuthenticated, PertenceAUmaAssistencia, ApenasDono]

    def _registrar(self, request: Request, assinatura: Assinatura, acao: str, detalhe: str) -> None:
        registrar(
            tenant=tenant_obrigatorio(request),
            usuario=usuario_obrigatorio(request),
            acao=acao,
            objeto="assinatura",
            objeto_id=assinatura.pk,
            detalhe=detalhe,
            origem=origem_do_pedido(request),
        )


class AssinaturaView(ViewDaAssinatura):
    def get(self, request: Request) -> Response:
        assinatura = Assinatura.objects.get(tenant=tenant_obrigatorio(request))
        return Response(detalhe_da_assinatura(assinatura, timezone.localdate()))


class AssinarView(ViewDaAssinatura):
    def post(self, request: Request) -> Response:
        entrada = AssinarSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        hoje = timezone.localdate()

        try:
            assinatura = servicos.assinar(
                tenant_obrigatorio(request),
                documento=entrada.validated_data["documento"],
                email=usuario_obrigatorio(request).email,
                hoje=hoje,
            )
        except servicos.AssinaturaIndisponivel as erro:
            return Response({"detail": str(erro)}, status=status.HTTP_409_CONFLICT)
        except ErroNoProvedor as erro:
            return Response({"detail": str(erro)}, status=status.HTTP_502_BAD_GATEWAY)

        self._registrar(
            request,
            assinatura,
            Acao.ASSINATURA_CONTRATADA,
            f"R$ {assinatura.valor_mensal} por mês",
        )
        return Response(detalhe_da_assinatura(assinatura, hoje), status=status.HTTP_201_CREATED)


class CancelarAssinaturaView(ViewDaAssinatura):
    def post(self, request: Request) -> Response:
        hoje = timezone.localdate()

        try:
            assinatura = servicos.cancelar(tenant_obrigatorio(request), hoje=hoje)
        except servicos.AssinaturaIndisponivel as erro:
            return Response({"detail": str(erro)}, status=status.HTTP_409_CONFLICT)
        except ErroNoProvedor as erro:
            return Response({"detail": str(erro)}, status=status.HTTP_502_BAD_GATEWAY)

        acesso_ate = assinatura.acesso_ate.strftime("%d/%m/%Y") if assinatura.acesso_ate else ""
        self._registrar(request, assinatura, Acao.ASSINATURA_CANCELADA, f"acesso até {acesso_ate}")
        return Response(detalhe_da_assinatura(assinatura, hoje))


class WebhookDoAsaasView(APIView):
    permission_classes = [AllowAny]
    authentication_classes: list = []

    def post(self, request: Request) -> Response:
        if not token_do_webhook_valido(request.headers.get(CABECALHO_DO_TOKEN_DO_WEBHOOK, "")):
            return Response({"detail": "Token inválido."}, status=status.HTTP_401_UNAUTHORIZED)

        corpo = request.data if isinstance(request.data, dict) else {}
        evento = evento_do_asaas(corpo)
        _, novo = EventoDoProvedor.objects.get_or_create(
            id_no_provedor=evento.id, defaults={"tipo": evento.tipo, "conteudo": corpo}
        )
        resultado = servicos.processar_evento(evento, timezone.localdate()) if novo else "repetido"
        return Response({"resultado": resultado})
