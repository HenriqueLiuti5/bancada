from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from bancada.ordens import publico


class AcompanhamentoPublicoView(APIView):
    permission_classes = [AllowAny]
    authentication_classes: list = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "acompanhamento_publico"

    def get(self, request: Request, token: str) -> Response:
        dados = publico.buscar(token)

        if dados is None:
            return Response(
                {"detail": "Ordem de serviço não encontrada."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if publico.link_expirou(dados):
            return Response(
                {"detail": "Este link expirou."},
                status=status.HTTP_410_GONE,
            )

        return Response(dados)
