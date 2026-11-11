from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from reparium.assinaturas import fundadores, regras, servicos
from reparium.assinaturas.models import Assinatura, EventoDoProvedor
from reparium.assinaturas.planos import PLANOS
from reparium.assinaturas.provedor import (
    CABECALHO_DO_TOKEN_DO_WEBHOOK,
    ErroNoProvedor,
    evento_do_asaas,
    token_do_webhook_valido,
)
from reparium.assinaturas.serializers import (
    AssinarSerializer,
    dados_do_plano,
    detalhe_da_assinatura,
)
from reparium.auditoria.models import Acao
from reparium.auditoria.registro import origem_do_pedido, registrar
from reparium.core.api import (
    PertenceAUmaAssistencia,
    ViewDoTenant,
    tenant_obrigatorio,
    usuario_obrigatorio,
)
from reparium.core.fuso import hoje_no_reparium
from reparium.tenants.permissoes import ApenasDono


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
        return Response(detalhe_da_assinatura(assinatura, hoje_no_reparium()))


class AssinarView(ViewDaAssinatura):
    def post(self, request: Request) -> Response:
        entrada = AssinarSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        hoje = hoje_no_reparium()

        try:
            assinatura = servicos.assinar(
                tenant_obrigatorio(request),
                documento=entrada.validated_data["documento"],
                email=usuario_obrigatorio(request).email,
                plano=entrada.validated_data["plano"],
                ciclo=entrada.validated_data["ciclo"],
                hoje=hoje,
            )
        except servicos.PlanoNaoCabe as erro:
            return Response({"plano": [str(erro)]}, status=status.HTTP_400_BAD_REQUEST)
        except servicos.AssinaturaIndisponivel as erro:
            return Response({"detail": str(erro)}, status=status.HTTP_409_CONFLICT)
        except ErroNoProvedor as erro:
            return Response({"detail": str(erro)}, status=status.HTTP_502_BAD_GATEWAY)

        self._registrar(
            request,
            assinatura,
            Acao.ASSINATURA_CONTRATADA,
            servicos.resumo_do_preco(assinatura),
        )
        return Response(detalhe_da_assinatura(assinatura, hoje), status=status.HTTP_201_CREATED)


class CancelarAssinaturaView(ViewDaAssinatura):
    def post(self, request: Request) -> Response:
        hoje = hoje_no_reparium()

        try:
            cancelamento = servicos.cancelar(tenant_obrigatorio(request), hoje=hoje)
        except servicos.AssinaturaIndisponivel as erro:
            return Response({"detail": str(erro)}, status=status.HTTP_409_CONFLICT)
        except ErroNoProvedor as erro:
            return Response({"detail": str(erro)}, status=status.HTTP_502_BAD_GATEWAY)

        assinatura = cancelamento.assinatura
        acesso_ate = assinatura.acesso_ate.strftime("%d/%m/%Y") if assinatura.acesso_ate else ""
        detalhe = f"acesso até {acesso_ate}"
        if cancelamento.devolvida is not None:
            detalhe += f", R$ {cancelamento.devolvida.valor} devolvidos"
        self._registrar(request, assinatura, Acao.ASSINATURA_CANCELADA, detalhe)
        return Response(detalhe_da_assinatura(assinatura, hoje))


class OfertaView(APIView):
    permission_classes = [AllowAny]
    authentication_classes: list = []

    def get(self, request: Request) -> Response:
        return Response(
            {
                "dias_de_teste": regras.DIAS_DE_TESTE,
                "planos": [dados_do_plano(condicoes) for condicoes in PLANOS.values()],
                "fundadores": fundadores.situacao_dos_fundadores(),
            }
        )


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
        resultado = servicos.processar_evento(evento, hoje_no_reparium()) if novo else "repetido"
        return Response({"resultado": resultado})
