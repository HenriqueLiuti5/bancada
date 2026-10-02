from typing import Any

from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.generics import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from bancada.auditoria.models import Acao
from bancada.auditoria.registro import origem_do_pedido, registrar
from bancada.core.formatos import em_reais
from bancada.core.rls import ver_todas_as_assistencias
from bancada.plataforma import numeros
from bancada.plataforma.meses import Mes
from bancada.plataforma.models import Custo
from bancada.plataforma.serializers import (
    CustoSerializer,
    FiltroDoPainelSerializer,
    NovoCustoSerializer,
)
from bancada.tenants.models import Usuario

SO_A_PLATAFORMA = "Só a conta da plataforma entra nesta área."


def conta_da_plataforma(request: Request) -> Usuario | None:
    usuario = request.user
    if isinstance(usuario, Usuario) and usuario.da_plataforma:
        return usuario
    return None


def conta_obrigatoria(request: Request) -> Usuario:
    conta = conta_da_plataforma(request)
    if conta is None:
        raise PermissionDenied(SO_A_PLATAFORMA)
    return conta


class ApenasPlataforma(permissions.BasePermission):
    message = SO_A_PLATAFORMA

    def has_permission(self, request: Request, view: APIView) -> bool:
        return conta_da_plataforma(request) is not None


class ViewDaPlataforma(APIView):
    permission_classes = [IsAuthenticated, ApenasPlataforma]

    def initial(self, request: Request, *args: Any, **kwargs: Any) -> None:
        super().initial(request, *args, **kwargs)
        ver_todas_as_assistencias()

    def registrar(
        self, request: Request, acao: str, objeto: str, objeto_id: int, detalhe: str
    ) -> None:
        registrar(
            tenant=None,
            usuario=conta_obrigatoria(request),
            acao=acao,
            objeto=objeto,
            objeto_id=objeto_id,
            detalhe=detalhe,
            origem=origem_do_pedido(request),
        )


class PainelDaPlataformaView(ViewDaPlataforma):
    def get(self, request: Request) -> Response:
        filtro = FiltroDoPainelSerializer(data=request.query_params)
        filtro.is_valid(raise_exception=True)
        hoje = timezone.localdate()
        mes = filtro.validated_data.get("mes") or Mes.de(hoje)

        self.registrar(
            request,
            Acao.PLATAFORMA_CONSULTADA,
            "plataforma",
            conta_obrigatoria(request).pk,
            f"números de {mes.em_texto()}",
        )
        return Response(numeros.painel(mes, hoje))


class CustosDaPlataformaView(ViewDaPlataforma):
    def post(self, request: Request) -> Response:
        entrada = NovoCustoSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        custo = Custo.objects.create(
            **entrada.validated_data, lancado_por=conta_obrigatoria(request)
        )

        self.registrar(
            request,
            Acao.CUSTO_LANCADO,
            "custo",
            custo.pk,
            f"{custo.descricao}, {em_reais(custo.valor)} em {custo.mes:%m/%Y}",
        )
        return Response(CustoSerializer(custo).data, status=status.HTTP_201_CREATED)


class CustoDaPlataformaView(ViewDaPlataforma):
    def delete(self, request: Request, pk: int) -> Response:
        custo = get_object_or_404(Custo, pk=pk)
        self.registrar(
            request,
            Acao.CUSTO_REMOVIDO,
            "custo",
            custo.pk,
            f"{custo.descricao}, {em_reais(custo.valor)} em {custo.mes:%m/%Y}",
        )
        custo.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
