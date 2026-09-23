from django.contrib.auth import authenticate
from django.db.models import QuerySet
from rest_framework import permissions, status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from bancada.auditoria.models import Acao
from bancada.auditoria.registro import origem_do_pedido, registrar
from bancada.core.api import PertenceAUmaAssistencia, ViewSetDoTenant, tenant_do_pedido
from bancada.tenants.models import Loja, Papel, Usuario
from bancada.tenants.permissoes import ApenasDono
from bancada.tenants.serializers import (
    CriacaoDeUsuarioSerializer,
    EdicaoDeUsuarioSerializer,
    LoginSerializer,
    LojaSerializer,
    NovaSenhaSerializer,
    UsuarioDaEquipeSerializer,
    UsuarioSerializer,
)


class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes: list = []

    def post(self, request: Request) -> Response:
        entrada = LoginSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)

        usuario = authenticate(
            username=entrada.validated_data["username"],
            password=entrada.validated_data["password"],
        )
        if usuario is None or not isinstance(usuario, Usuario):
            return Response(
                {"detail": "Usuário ou senha inválidos."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        if usuario.tenant is None:
            return Response(
                {"detail": "Seu usuário não está vinculado a nenhuma assistência."},
                status=status.HTTP_403_FORBIDDEN,
            )

        token, _ = Token.objects.get_or_create(user=usuario)
        return Response({"token": token.key, "usuario": UsuarioSerializer(usuario).data})


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        usuario = request.user
        if isinstance(usuario, Usuario):
            Token.objects.filter(user=usuario).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class EuView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        return Response(UsuarioSerializer(request.user).data)


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
        entrada = CriacaoDeUsuarioSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        dados = entrada.validated_data

        novo = Usuario.objects.create_user(
            username=dados["username"],
            password=dados["senha"],
            first_name=dados["first_name"],
            email=dados["email"],
            tenant=tenant_do_pedido(request),
            papel=dados["papel"],
        )

        self._registrar(novo, Acao.USUARIO_CRIADO, f"{novo.username} como {novo.papel}")
        return Response(UsuarioDaEquipeSerializer(novo).data, status=status.HTTP_201_CREATED)

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
            self._registrar(alvo, Acao.USUARIO_ALTERADO, f"{alvo.username}: {mudancas}")

        return Response(UsuarioDaEquipeSerializer(alvo).data)

    @action(detail=True, methods=["post"])
    def senha(self, request: Request, pk: str | None = None) -> Response:
        alvo = self.get_object()
        entrada = NovaSenhaSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)

        alvo.set_password(entrada.validated_data["senha"])
        alvo.save(update_fields=["password"])
        Token.objects.filter(user=alvo).delete()

        self._registrar(alvo, Acao.SENHA_REDEFINIDA, alvo.username)
        return Response(status=status.HTTP_204_NO_CONTENT)
