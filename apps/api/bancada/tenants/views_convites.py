from django.db import IntegrityError, transaction
from django.db.models import QuerySet
from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response

from bancada.auditoria.models import Acao
from bancada.auditoria.registro import origem_do_pedido, registrar
from bancada.core.api import ViewSetDoTenant, tenant_obrigatorio
from bancada.tenants import contas
from bancada.tenants.models import Convite, Usuario
from bancada.tenants.permissoes import ApenasDono
from bancada.tenants.serializers import (
    AceiteDeConviteSerializer,
    ConvitePublicoSerializer,
    ConviteSerializer,
    NovoConviteSerializer,
)
from bancada.tenants.views_contas import EMAIL_JA_EM_USO, RotaPublicaLimitada, abrir_sessao


class ConviteViewSet(ViewSetDoTenant):
    serializer_class = ConviteSerializer
    queryset = Convite.objects.all()
    permission_classes = [*ViewSetDoTenant.permission_classes, ApenasDono]
    http_method_names = ["get", "post", "delete", "head", "options"]
    pagination_class = None

    def get_queryset(self) -> QuerySet[Convite]:
        return super().get_queryset().filter(aceito_em__isnull=True)

    def _registrar(self, convite: Convite, acao: str) -> None:
        registrar(
            tenant=convite.tenant,
            usuario=self.request.user if isinstance(self.request.user, Usuario) else None,
            acao=acao,
            objeto="convite",
            objeto_id=convite.pk,
            detalhe=f"{convite.nome} como {convite.papel}",
            origem=origem_do_pedido(self.request),
        )

    def create(self, request: Request, *args: object, **kwargs: object) -> Response:
        entrada = NovoConviteSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)

        convite = Convite.objects.create(
            tenant=tenant_obrigatorio(request),
            criado_por=request.user if isinstance(request.user, Usuario) else None,
            **entrada.validated_data,
        )
        self._registrar(convite, Acao.CONVITE_CRIADO)
        if convite.email:
            contas.mandar_convite_por_email(convite)

        return Response(ConviteSerializer(convite).data, status=status.HTTP_201_CREATED)

    def destroy(self, request: Request, *args: object, **kwargs: object) -> Response:
        convite = self.get_object()
        self._registrar(convite, Acao.CONVITE_CANCELADO)
        convite.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ConvitePublicoView(RotaPublicaLimitada):
    throttle_scope = "convite"

    def get(self, request: Request, token: str) -> Response:
        try:
            convite = contas.convite_valido(token)
        except contas.ConviteIndisponivel as motivo:
            return Response({"detail": str(motivo)}, status=status.HTTP_404_NOT_FOUND)

        return Response(ConvitePublicoSerializer(convite).data)


class AceiteDeConviteView(RotaPublicaLimitada):
    throttle_scope = "convite"

    def post(self, request: Request, token: str) -> Response:
        entrada = AceiteDeConviteSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        dados = entrada.validated_data

        try:
            with transaction.atomic():
                assistencia, usuario = contas.aceitar_convite(
                    token, nome=dados["nome"], email=dados["email"], senha=dados["senha"]
                )
        except contas.ConviteIndisponivel as motivo:
            return Response({"detail": str(motivo)}, status=status.HTTP_404_NOT_FOUND)
        except IntegrityError:
            return Response(EMAIL_JA_EM_USO, status=status.HTTP_400_BAD_REQUEST)

        registrar(
            tenant=assistencia,
            usuario=usuario,
            acao=Acao.USUARIO_CRIADO,
            objeto="usuario",
            objeto_id=usuario.pk,
            detalhe=f"{usuario.email} como {usuario.papel}, pelo convite",
            origem=origem_do_pedido(request),
        )
        if not usuario.email_confirmado:
            contas.pedir_confirmacao_de_email(usuario)

        return Response(abrir_sessao(usuario), status=status.HTTP_201_CREATED)
