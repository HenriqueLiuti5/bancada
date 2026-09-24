from typing import Any

from django.contrib.auth import authenticate
from django.db import IntegrityError, transaction
from rest_framework import serializers, status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from bancada.auditoria.models import Acao
from bancada.auditoria.registro import origem_do_pedido, registrar
from bancada.tenants import contas
from bancada.tenants.links import usuario_da_confirmacao, usuario_da_recuperacao
from bancada.tenants.models import Usuario
from bancada.tenants.serializers import (
    CadastroSerializer,
    ConfirmacaoDeEmailSerializer,
    EsqueciASenhaSerializer,
    LoginSerializer,
    RedefinicaoDeSenhaSerializer,
    UsuarioSerializer,
    conferir_senha,
)

EMAIL_JA_EM_USO = {"email": ["Já existe uma conta com esse e-mail."]}


def abrir_sessao(usuario: Usuario) -> dict[str, Any]:
    token, _ = Token.objects.get_or_create(user=usuario)
    return {"token": token.key, "usuario": UsuarioSerializer(usuario).data}


class RotaPublicaLimitada(APIView):
    permission_classes = [AllowAny]
    authentication_classes: list = []
    throttle_classes = [ScopedRateThrottle]


class LoginView(RotaPublicaLimitada):
    throttle_scope = "login"

    def post(self, request: Request) -> Response:
        entrada = LoginSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)

        conta = Usuario.pelo_email(entrada.validated_data["email"])
        usuario = (
            authenticate(username=conta.username, password=entrada.validated_data["password"])
            if conta
            else None
        )
        if usuario is None or not isinstance(usuario, Usuario):
            return Response(
                {"detail": "E-mail ou senha inválidos."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        if usuario.tenant is None:
            return Response(
                {"detail": "Seu usuário não está vinculado a nenhuma assistência."},
                status=status.HTTP_403_FORBIDDEN,
            )

        return Response(abrir_sessao(usuario))


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


class CadastroView(RotaPublicaLimitada):
    throttle_scope = "cadastro"

    def post(self, request: Request) -> Response:
        entrada = CadastroSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        dados = entrada.validated_data

        try:
            with transaction.atomic():
                assistencia, dono = contas.criar_assistencia(
                    nome_da_assistencia=dados["assistencia"],
                    nome_do_dono=dados["nome"],
                    email=dados["email"],
                    whatsapp=dados["whatsapp"],
                    senha=dados["senha"],
                )
        except IntegrityError:
            return Response(EMAIL_JA_EM_USO, status=status.HTTP_400_BAD_REQUEST)

        registrar(
            tenant=assistencia,
            usuario=dono,
            acao=Acao.ASSISTENCIA_CRIADA,
            objeto="assistencia",
            objeto_id=assistencia.pk,
            detalhe=f"{assistencia.nome} por {dono.email}, termos {assistencia.versao_dos_termos}",
            origem=origem_do_pedido(request),
        )
        contas.pedir_confirmacao_de_email(dono)

        return Response(abrir_sessao(dono), status=status.HTTP_201_CREATED)


class EsqueciASenhaView(RotaPublicaLimitada):
    throttle_scope = "recuperacao_de_senha"

    def post(self, request: Request) -> Response:
        entrada = EsqueciASenhaSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)

        usuario = Usuario.pelo_email(entrada.validated_data["email"])
        if usuario is not None and usuario.is_active and usuario.tenant_id is not None:
            contas.pedir_recuperacao_de_senha(usuario)

        return Response(status=status.HTTP_204_NO_CONTENT)


class RedefinirASenhaView(RotaPublicaLimitada):
    throttle_scope = "recuperacao_de_senha"

    def post(self, request: Request) -> Response:
        entrada = RedefinicaoDeSenhaSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        dados = entrada.validated_data

        usuario = usuario_da_recuperacao(dados["uid"], dados["token"])
        if usuario is None or usuario.tenant is None:
            return Response(
                {"detail": "Este link de recuperação é inválido ou já foi usado. Peça um novo."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            conferir_senha(dados["senha"], usuario)
        except serializers.ValidationError as erro:
            return Response({"senha": erro.detail}, status=status.HTTP_400_BAD_REQUEST)

        usuario.set_password(dados["senha"])
        usuario.save(update_fields=["password"])
        contas.confirmar_email(usuario)
        Token.objects.filter(user=usuario).delete()

        registrar(
            tenant=usuario.tenant,
            usuario=usuario,
            acao=Acao.SENHA_REDEFINIDA,
            objeto="usuario",
            objeto_id=usuario.pk,
            detalhe=f"{usuario.email}, pelo link enviado por e-mail",
            origem=origem_do_pedido(request),
        )

        return Response(abrir_sessao(usuario))


class ConfirmarEmailView(RotaPublicaLimitada):
    throttle_scope = "confirmacao_de_email"

    def post(self, request: Request) -> Response:
        entrada = ConfirmacaoDeEmailSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)

        usuario = usuario_da_confirmacao(entrada.validated_data["token"])
        if usuario is None:
            return Response(
                {"detail": "Este link de confirmação é inválido ou expirou."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        contas.confirmar_email(usuario)
        return Response({"email": usuario.email})


class ReenviarConfirmacaoView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "confirmacao_de_email"

    def post(self, request: Request) -> Response:
        usuario = request.user
        if isinstance(usuario, Usuario) and usuario.email and not usuario.email_confirmado:
            contas.pedir_confirmacao_de_email(usuario)
        return Response(status=status.HTTP_204_NO_CONTENT)
