from typing import Any

from django.db.models import QuerySet
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.serializers import BaseSerializer

from bancada.auditoria.models import Acao
from bancada.auditoria.registro import origem_do_pedido, registrar
from bancada.core.api import (
    PertenceAUmaAssistencia,
    ViewDoTenant,
    ViewSetDoTenant,
    tenant_obrigatorio,
    usuario_obrigatorio,
)
from bancada.core.formatos import em_reais
from bancada.financeiro import a_receber, caixa, consultas
from bancada.financeiro.models import (
    ConferenciaDoCaixa,
    ContaAPagar,
    ContaJaPaga,
    ContaNaoPaga,
    MovimentoDoCaixa,
)
from bancada.financeiro.serializers import (
    ConferenciaDaEquipeSerializer,
    ConferenciaSerializer,
    ContaAPagarSerializer,
    ContaAReceberSerializer,
    EdicaoDaContaSerializer,
    FiltroDoCaixaSerializer,
    MovimentoDoCaixaSerializer,
    MovimentoDoDiaSerializer,
    NovaConferenciaSerializer,
    NovaContaSerializer,
    PagamentoSerializer,
)
from bancada.ordens.models import OrdemServico
from bancada.ordens.painel.periodo import Periodo
from bancada.tenants.models import Papel
from bancada.tenants.permissoes import ApenasDono, papel_do_pedido

FORNECEDORES_SUGERIDOS = 30


# Toda a equipe lança a conta que chegou, mas só o dono vê a lista, os totais e mexe nas contas.
class ContaAPagarViewSet(ViewSetDoTenant):
    queryset = ContaAPagar.objects.select_related("loja", "conta_fixa", "lancada_por", "paga_por")
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_permissions(self) -> list[Any]:
        permissoes = list(super().get_permissions())
        if self.action != "create":
            permissoes.append(ApenasDono())
        return permissoes

    def get_serializer_class(self) -> type[BaseSerializer]:
        if self.action == "create":
            return NovaContaSerializer
        if self.action == "partial_update":
            return EdicaoDaContaSerializer
        return ContaAPagarSerializer

    def get_serializer_context(self) -> dict[str, Any]:
        return {
            **super().get_serializer_context(),
            "tenant": tenant_obrigatorio(self.request),
            "papel": papel_do_pedido(self.request),
        }

    def get_queryset(self) -> QuerySet[ContaAPagar]:
        consulta = super().get_queryset()
        if self.action == "list":
            return consultas.filtrar(consulta, self.request.query_params, timezone.localdate())
        return consulta

    def _detalhe(self, pk: int, codigo: int = status.HTTP_200_OK) -> Response:
        conta = self.get_queryset().get(pk=pk)
        return Response(ContaAPagarSerializer(conta).data, status=codigo)

    def create(self, request: Request, *args: object, **kwargs: object) -> Response:
        entrada = self.get_serializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        conta = ContaAPagar.lancar(
            tenant=tenant_obrigatorio(request),
            hoje=timezone.localdate(),
            usuario=usuario_obrigatorio(request),
            **entrada.validated_data,
        )
        return self._detalhe(conta.pk, status.HTTP_201_CREATED)

    def partial_update(self, request: Request, *args: object, **kwargs: object) -> Response:
        conta = self.get_object()
        entrada = self.get_serializer(conta, data=request.data, partial=True)
        entrada.is_valid(raise_exception=True)
        entrada.save()
        return self._detalhe(conta.pk)

    def perform_destroy(self, instance: ContaAPagar) -> None:
        registrar(
            tenant=instance.tenant,
            usuario=usuario_obrigatorio(self.request),
            acao=Acao.CONTA_REMOVIDA,
            objeto="conta_a_pagar",
            objeto_id=instance.pk,
            detalhe=(
                f"{instance.descricao}, {em_reais(instance.valor)}, "
                f"vencimento {instance.vencimento:%d/%m/%Y}"
            ),
            origem=origem_do_pedido(self.request),
        )
        instance.delete()

    @action(detail=True, methods=["post"])
    def pagar(self, request: Request, pk: str | None = None) -> Response:
        conta = self.get_object()
        entrada = PagamentoSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        try:
            conta.pagar(
                entrada.validated_data["pagamento"],
                valor=entrada.validated_data["valor"],
                usuario=usuario_obrigatorio(request),
            )
        except ContaJaPaga as erro:
            return Response({"detail": str(erro)}, status=status.HTTP_409_CONFLICT)
        return self._detalhe(conta.pk)

    @action(detail=True, methods=["post"], url_path="desfazer-pagamento")
    def desfazer_pagamento(self, request: Request, pk: str | None = None) -> Response:
        conta = self.get_object()
        try:
            conta.desfazer_pagamento()
        except ContaNaoPaga as erro:
            return Response({"detail": str(erro)}, status=status.HTTP_409_CONFLICT)
        return self._detalhe(conta.pk)

    @action(detail=True, methods=["post"], url_path="parar-de-repetir")
    def parar_de_repetir(self, request: Request, pk: str | None = None) -> Response:
        conta = self.get_object()
        conta.parar_de_repetir()
        return self._detalhe(conta.pk)

    @action(detail=False, methods=["get"])
    def resumo(self, request: Request) -> Response:
        contas = ContaAPagar.objects.filter(tenant=tenant_obrigatorio(request))
        return Response(consultas.resumo(contas, timezone.localdate()))

    @action(detail=False, methods=["get"])
    def fornecedores(self, request: Request) -> Response:
        nomes: list[str] = []
        lancados = (
            ContaAPagar.objects.filter(tenant=tenant_obrigatorio(request))
            .exclude(fornecedor="")
            .order_by("-criado_em")
            .values_list("fornecedor", flat=True)
        )
        for nome in lancados.iterator():
            if nome not in nomes:
                nomes.append(nome)
            if len(nomes) == FORNECEDORES_SUGERIDOS:
                break
        return Response(nomes)


# Toda a equipe registra as retiradas e os reforços da gaveta; só o dono remove o lançado errado.
class MovimentoDoCaixaViewSet(ViewSetDoTenant):
    queryset = MovimentoDoCaixa.objects.select_related("loja", "registrado_por")
    serializer_class = MovimentoDoCaixaSerializer
    http_method_names = ["post", "delete", "head", "options"]

    def get_permissions(self) -> list[Any]:
        permissoes = list(super().get_permissions())
        if self.action == "destroy":
            permissoes.append(ApenasDono())
        return permissoes

    def get_serializer_context(self) -> dict[str, Any]:
        return {**super().get_serializer_context(), "tenant": tenant_obrigatorio(self.request)}

    def perform_create(self, serializer: BaseSerializer) -> None:
        serializer.save(
            tenant=tenant_obrigatorio(self.request),
            registrado_por=usuario_obrigatorio(self.request),
        )

    def perform_destroy(self, instance: MovimentoDoCaixa) -> None:
        registrar(
            tenant=instance.tenant,
            usuario=usuario_obrigatorio(self.request),
            acao=Acao.MOVIMENTO_DO_CAIXA_REMOVIDO,
            objeto="movimento_do_caixa",
            objeto_id=instance.pk,
            detalhe=(
                f"{instance.get_tipo_display()} de {em_reais(instance.valor)} em "
                f"{instance.loja.nome}, {timezone.localtime(instance.criado_em):%d/%m/%Y %H:%M}"
            ),
            origem=origem_do_pedido(self.request),
        )
        instance.delete()


# Toda a equipe conta o dinheiro da gaveta, mas só o dono vê quanto devia ter, a diferença e as
# conferências dos outros dias.
class ConferenciaDoCaixaViewSet(ViewSetDoTenant):
    queryset = ConferenciaDoCaixa.objects.select_related("loja", "conferida_por")
    serializer_class = ConferenciaSerializer
    http_method_names = ["get", "post", "head", "options"]

    def get_permissions(self) -> list[Any]:
        permissoes = list(super().get_permissions())
        if self.action != "create":
            permissoes.append(ApenasDono())
        return permissoes

    def get_queryset(self) -> QuerySet[ConferenciaDoCaixa]:
        consulta = super().get_queryset().order_by("-dia", "-criado_em", "-pk")
        loja = self.request.query_params.get("loja", "")
        if self.action == "list" and loja.isdigit():
            consulta = consulta.filter(loja_id=int(loja))
        return consulta

    def create(self, request: Request, *args: object, **kwargs: object) -> Response:
        entrada = NovaConferenciaSerializer(
            data=request.data, context={"tenant": tenant_obrigatorio(request)}
        )
        entrada.is_valid(raise_exception=True)
        conferencia = caixa.conferir(
            entrada.validated_data["loja"],
            contado=entrada.validated_data["contado"],
            retirado=entrada.validated_data["retirado"],
            observacao=entrada.validated_data["observacao"],
            usuario=usuario_obrigatorio(request),
            hoje=timezone.localdate(),
        )
        saida = (
            ConferenciaSerializer
            if papel_do_pedido(request) == Papel.DONO
            else ConferenciaDaEquipeSerializer
        )
        return Response(saida(conferencia).data, status=status.HTTP_201_CREATED)


class CaixaDoDiaView(ViewDoTenant):
    permission_classes = [IsAuthenticated, PertenceAUmaAssistencia, ApenasDono]

    def get(self, request: Request) -> Response:
        filtro = FiltroDoCaixaSerializer(
            data=request.query_params, context={"tenant": tenant_obrigatorio(request)}
        )
        filtro.is_valid(raise_exception=True)
        loja = filtro.validated_data["loja"]
        dia = filtro.validated_data.get("dia") or timezone.localdate()

        resumo = caixa.resumo_do_dia(loja, dia)
        return Response(
            {
                **resumo,
                "dia": dia.isoformat(),
                "conferencias": ConferenciaSerializer(resumo["conferencias"], many=True).data,
                "movimentos": MovimentoDoDiaSerializer(resumo["movimentos"], many=True).data,
            }
        )


# O que a equipe vê do caixa: as retiradas, os reforços e as contagens de hoje, sem o que devia ter.
class CaixaDeHojeView(ViewDoTenant):
    permission_classes = [IsAuthenticated, PertenceAUmaAssistencia]

    def get(self, request: Request) -> Response:
        filtro = FiltroDoCaixaSerializer(
            data={"loja": request.query_params.get("loja")},
            context={"tenant": tenant_obrigatorio(request)},
        )
        filtro.is_valid(raise_exception=True)
        loja = filtro.validated_data["loja"]
        hoje = timezone.localdate()
        movimentos = (
            MovimentoDoCaixa.objects.filter(loja=loja)
            .filter(Periodo(hoje, hoje).filtro("criado_em"))
            .select_related("registrado_por")
        )
        conferencias = ConferenciaDoCaixa.objects.filter(loja=loja, dia=hoje).select_related(
            "conferida_por"
        )
        return Response(
            {
                "dia": hoje.isoformat(),
                "movimentos": MovimentoDoCaixaSerializer(movimentos, many=True).data,
                "conferencias": ConferenciaDaEquipeSerializer(conferencias, many=True).data,
            }
        )


# O que os clientes ficaram devendo nas ordens entregues. O pagamento continua sendo registrado na
# própria ordem, por qualquer pessoa da equipe; a lista e os totais são só do dono.
class ContaAReceberViewSet(ViewSetDoTenant):
    queryset = OrdemServico.objects.select_related("cliente", "aparelho", "loja")
    serializer_class = ContaAReceberSerializer
    permission_classes = [*ViewSetDoTenant.permission_classes, ApenasDono]
    http_method_names = ["get", "head", "options"]

    def get_queryset(self) -> QuerySet[OrdemServico]:
        consulta = a_receber.com_valores(super().get_queryset())
        if self.action == "list":
            return a_receber.filtrar(consulta, self.request.query_params, timezone.localdate())
        return consulta

    @action(detail=False, methods=["get"])
    def resumo(self, request: Request) -> Response:
        ordens = OrdemServico.objects.filter(tenant=tenant_obrigatorio(request))
        return Response(a_receber.resumo(ordens, timezone.localdate()))
