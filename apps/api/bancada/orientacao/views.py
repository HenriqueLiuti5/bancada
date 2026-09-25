from typing import Any

from django.contrib.postgres.fields import ArrayField
from django.db import models
from django.db.models import F, Func, Value
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from bancada.core.api import PertenceAUmaAssistencia, tenant_obrigatorio, usuario_obrigatorio
from bancada.orientacao import passos
from bancada.orientacao.serializers import PrimeirosPassosSerializer, TourVistoSerializer
from bancada.tenants.models import Tenant, Usuario
from bancada.tenants.permissoes import ApenasDono


def acrescentar_tour_visto(usuario: Usuario, tour: str) -> None:
    Usuario.objects.filter(pk=usuario.pk).exclude(tours_vistos__contains=[tour]).update(
        tours_vistos=Func(
            F("tours_vistos"),
            Value(tour),
            function="array_append",
            output_field=ArrayField(models.CharField(max_length=30)),
        )
    )


class TourVistoView(APIView):
    permission_classes = [IsAuthenticated, PertenceAUmaAssistencia]

    def post(self, request: Request) -> Response:
        entrada = TourVistoSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)

        acrescentar_tour_visto(usuario_obrigatorio(request), entrada.validated_data["tour"])
        return Response(status=status.HTTP_204_NO_CONTENT)


def situacao_dos_primeiros_passos(tenant: Tenant, usuario: Usuario) -> dict[str, Any]:
    return {
        "escondidos": usuario.primeiros_passos_escondidos,
        "passos": [
            {"chave": passo.chave, "feito": passo.feito}
            for passo in passos.primeiros_passos(tenant)
        ],
        "ordem_mais_recente": passos.ordem_mais_recente(tenant),
    }


class PrimeirosPassosView(APIView):
    permission_classes = [IsAuthenticated, PertenceAUmaAssistencia, ApenasDono]

    def get(self, request: Request) -> Response:
        return Response(
            situacao_dos_primeiros_passos(tenant_obrigatorio(request), usuario_obrigatorio(request))
        )

    def patch(self, request: Request) -> Response:
        usuario = usuario_obrigatorio(request)
        entrada = PrimeirosPassosSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)

        usuario.primeiros_passos_escondidos = entrada.validated_data["escondidos"]
        usuario.save(update_fields=["primeiros_passos_escondidos"])
        return Response(situacao_dos_primeiros_passos(tenant_obrigatorio(request), usuario))
