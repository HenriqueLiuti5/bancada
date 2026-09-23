from django.http import FileResponse, HttpResponseBase
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from bancada.ordens import fotos
from bancada.ordens.models import FotoOS

NAO_ENCONTRADA = {"detail": "Foto não encontrada ou link expirado."}


class ArquivoDaFotoView(APIView):
    permission_classes = [AllowAny]
    authentication_classes: list = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "arquivo_de_foto"

    def get(self, request: Request, assinatura: str) -> HttpResponseBase:
        foto_id = fotos.identificar(assinatura)
        if foto_id is None:
            return Response(NAO_ENCONTRADA, status=status.HTTP_404_NOT_FOUND)

        foto = FotoOS.objects.filter(pk=foto_id).first()
        if foto is None:
            return Response(NAO_ENCONTRADA, status=status.HTTP_404_NOT_FOUND)

        try:
            conteudo = foto.arquivo.open("rb")
        except OSError:
            return Response(NAO_ENCONTRADA, status=status.HTTP_404_NOT_FOUND)

        resposta = FileResponse(conteudo, content_type="image/jpeg")
        resposta["Cache-Control"] = f"private, max-age={fotos.SEGUNDOS_DE_VALIDADE_DO_LINK}"
        return resposta
