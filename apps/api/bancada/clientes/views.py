from typing import cast

from django.db.models import Q, QuerySet
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.serializers import BaseSerializer

from bancada.auditoria.registro import registrar_acesso_a_senha, registrar_troca_de_senha
from bancada.clientes.models import Aparelho, Cliente
from bancada.clientes.serializers import AparelhoSerializer, ClienteSerializer
from bancada.core.api import ViewSetDoTenant, usuario_obrigatorio
from bancada.core.telefones import DIGITOS_MINIMOS_PARA_BUSCAR_TELEFONE, so_digitos
from bancada.tenants.models import Usuario
from bancada.tenants.permissoes import ApagarSoDonoOuTecnico

SO_TECNICO_TROCA_A_SENHA = "Só técnicos e o dono podem trocar a senha de desbloqueio."


class ClienteViewSet(ViewSetDoTenant):
    serializer_class = ClienteSerializer
    queryset = Cliente.objects.prefetch_related("aparelhos")
    permission_classes = [*ViewSetDoTenant.permission_classes, ApagarSoDonoOuTecnico]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self) -> QuerySet[Cliente]:
        consulta = super().get_queryset()
        busca = self.request.query_params.get("busca", "").strip()
        if not busca:
            return consulta

        filtro = Q(nome__icontains=busca)
        digitos = so_digitos(busca)
        if len(digitos) >= DIGITOS_MINIMOS_PARA_BUSCAR_TELEFONE:
            filtro |= Q(telefone__contains=digitos)
        return consulta.filter(filtro)


class AparelhoViewSet(ViewSetDoTenant):
    serializer_class = AparelhoSerializer
    queryset = Aparelho.objects.select_related("cliente")
    permission_classes = [*ViewSetDoTenant.permission_classes, ApagarSoDonoOuTecnico]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self) -> QuerySet[Aparelho]:
        consulta = super().get_queryset()
        cliente = self.request.query_params.get("cliente")
        if cliente:
            consulta = consulta.filter(cliente_id=cliente)
        return consulta

    def perform_update(self, serializer: BaseSerializer) -> None:
        troca_a_senha = "senha_desbloqueio" in serializer.validated_data
        if troca_a_senha and not usuario_obrigatorio(self.request).e_tecnico:
            raise PermissionDenied(SO_TECNICO_TROCA_A_SENHA)

        senha_anterior = cast(Aparelho, serializer.instance).senha_desbloqueio
        aparelho = serializer.save()
        if troca_a_senha and aparelho.senha_desbloqueio != senha_anterior:
            registrar_troca_de_senha(self.request, aparelho=aparelho)

    @action(detail=True, methods=["get"], url_path="senha")
    def senha(self, request: Request, pk: str | None = None) -> Response:
        aparelho = self.get_object()
        usuario = request.user

        if not isinstance(usuario, Usuario) or not usuario.e_tecnico:
            registrar_acesso_a_senha(request, aparelho=aparelho, permitido=False)
            return Response(
                {"detail": "Apenas técnicos podem ver a senha de desbloqueio."},
                status=status.HTTP_403_FORBIDDEN,
            )

        registrar_acesso_a_senha(request, aparelho=aparelho, permitido=True)
        return Response({"senha_desbloqueio": aparelho.senha_desbloqueio})
