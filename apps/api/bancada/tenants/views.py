from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from bancada.tenants.models import Loja, Usuario
from bancada.tenants.serializers import LoginSerializer, LojaSerializer, UsuarioSerializer


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
