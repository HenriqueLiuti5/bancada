from django.db.models import Model, QuerySet
from rest_framework import permissions, status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action
from rest_framework.exceptions import MethodNotAllowed
from rest_framework.generics import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.serializers import ModelSerializer
from rest_framework.views import APIView

from bancada.auditoria.models import Acao
from bancada.auditoria.registro import origem_do_pedido, registrar
from bancada.core.api import (
    PertenceAUmaAssistencia,
    ViewSetDoTenant,
    tenant_do_pedido,
    tenant_obrigatorio,
)
from bancada.tenants.models import Loja, Papel, Usuario
from bancada.tenants.permissoes import ApenasDono
from bancada.tenants.serializers import (
    AssistenciaSerializer,
    EdicaoDeLojaSerializer,
    EdicaoDeUsuarioSerializer,
    LojaSerializer,
    NovaSenhaSerializer,
    UsuarioDaEquipeSerializer,
    UsuarioSerializer,
)


class LojasView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        usuario = request.user
        tenant = usuario.tenant if isinstance(usuario, Usuario) else None
        lojas = Loja.objects.filter(tenant=tenant)
        return Response(LojaSerializer(lojas, many=True).data)


class EquipeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        usuario = request.user
        tenant = usuario.tenant if isinstance(usuario, Usuario) else None
        colegas = Usuario.objects.filter(tenant=tenant, is_active=True).order_by(
            "first_name", "username"
        )
        return Response(UsuarioSerializer(colegas, many=True).data)


class UsuarioViewSet(ViewSetDoTenant):
    serializer_class = UsuarioDaEquipeSerializer
    queryset = Usuario.objects.all()
    permission_classes = [permissions.IsAuthenticated, PertenceAUmaAssistencia, ApenasDono]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self) -> QuerySet[Usuario]:
        return super().get_queryset().order_by("first_name", "username")

    def _registrar(self, alvo: Usuario, acao: str, detalhe: str) -> None:
        tenant = tenant_do_pedido(self.request)
        if tenant is None:
            return
        registrar(
            tenant=tenant,
            usuario=self.request.user if isinstance(self.request.user, Usuario) else None,
            acao=acao,
            objeto="usuario",
            objeto_id=alvo.pk,
            detalhe=detalhe,
            origem=origem_do_pedido(self.request),
        )

    def create(self, request: Request, *args: object, **kwargs: object) -> Response:
        raise MethodNotAllowed("POST", detail="Para adicionar alguém à equipe, crie um convite.")

    def _perderia_o_ultimo_dono(self, alvo: Usuario, dados: dict) -> bool:
        if alvo.papel != Papel.DONO:
            return False
        if dados.get("papel", Papel.DONO) == Papel.DONO and dados.get("is_active", True):
            return False
        return (
            not self.get_queryset()
            .filter(papel=Papel.DONO, is_active=True)
            .exclude(pk=alvo.pk)
            .exists()
        )

    def partial_update(self, request: Request, *args: object, **kwargs: object) -> Response:
        alvo = self.get_object()
        entrada = EdicaoDeUsuarioSerializer(data=request.data, partial=True)
        entrada.is_valid(raise_exception=True)
        dados = entrada.validated_data

        if alvo.pk == request.user.pk and ("papel" in dados or dados.get("is_active") is False):
            return Response(
                {"detail": "Você não pode mudar o seu próprio papel nem se desativar."},
                status=status.HTTP_409_CONFLICT,
            )

        if self._perderia_o_ultimo_dono(alvo, dados):
            return Response(
                {"detail": "A assistência precisa de pelo menos um dono ativo."},
                status=status.HTTP_409_CONFLICT,
            )

        for campo, valor in dados.items():
            setattr(alvo, campo, valor)
        alvo.save(update_fields=list(dados) or None)

        if dados:
            mudancas = ", ".join(f"{campo}={valor}" for campo, valor in dados.items())
            self._registrar(
                alvo, Acao.USUARIO_ALTERADO, f"{alvo.email or alvo.username}: {mudancas}"
            )

        return Response(UsuarioDaEquipeSerializer(alvo).data)

    @action(detail=True, methods=["post"])
    def senha(self, request: Request, pk: str | None = None) -> Response:
        alvo = self.get_object()
        entrada = NovaSenhaSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)

        alvo.set_password(entrada.validated_data["senha"])
        alvo.save(update_fields=["password"])
        Token.objects.filter(user=alvo).delete()

        self._registrar(alvo, Acao.SENHA_REDEFINIDA, f"{alvo.email or alvo.username}, pelo dono")
        return Response(status=status.HTTP_204_NO_CONTENT)


def _salvar_alteracoes(
    request: Request, objeto: Model, serializer: ModelSerializer, nome_do_objeto: str
) -> None:
    serializer.is_valid(raise_exception=True)
    mudancas = {
        campo: valor
        for campo, valor in serializer.validated_data.items()
        if getattr(objeto, campo) != valor
    }
    serializer.save()

    if not mudancas:
        return
    registrar(
        tenant=tenant_obrigatorio(request),
        usuario=request.user if isinstance(request.user, Usuario) else None,
        acao=Acao.ASSISTENCIA_ALTERADA,
        objeto=nome_do_objeto,
        objeto_id=objeto.pk,
        detalhe=", ".join(f"{campo}={valor}" for campo, valor in mudancas.items()),
        origem=origem_do_pedido(request),
    )


class AssistenciaView(APIView):
    permission_classes = [IsAuthenticated, PertenceAUmaAssistencia, ApenasDono]

    def get(self, request: Request) -> Response:
        return Response(AssistenciaSerializer(tenant_obrigatorio(request)).data)

    def patch(self, request: Request) -> Response:
        tenant = tenant_obrigatorio(request)
        serializer = AssistenciaSerializer(tenant, data=request.data, partial=True)
        _salvar_alteracoes(request, tenant, serializer, "assistencia")
        return Response(serializer.data)


class LojaView(APIView):
    permission_classes = [IsAuthenticated, PertenceAUmaAssistencia, ApenasDono]

    def patch(self, request: Request, pk: int) -> Response:
        loja = get_object_or_404(Loja, pk=pk, tenant=tenant_obrigatorio(request))
        serializer = EdicaoDeLojaSerializer(loja, data=request.data, partial=True)
        _salvar_alteracoes(request, loja, serializer, "loja")
        return Response(LojaSerializer(loja).data)
