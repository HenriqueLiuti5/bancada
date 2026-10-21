from typing import Any

from django.db.models import F, Q, QuerySet
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.serializers import BaseSerializer

from bancada.auditoria.models import Acao
from bancada.auditoria.registro import origem_do_pedido, registrar
from bancada.core.api import ViewSetDoTenant, tenant_obrigatorio
from bancada.core.formatos import em_reais
from bancada.estoque.models import (
    MovimentoDeEstoque,
    Produto,
    TipoDeMovimento,
    TipoDeProduto,
    TransferenciaAcimaDoDisponivel,
    Venda,
    VendaJaDesfeita,
    com_quantidade,
)
from bancada.estoque.serializers import (
    ContagemSerializer,
    EdicaoDeProdutoSerializer,
    EntradaSerializer,
    EscolhaDeProdutoSerializer,
    MovimentoSerializer,
    NovaVendaSerializer,
    NovoProdutoSerializer,
    ProdutoSerializer,
    TransferenciaSerializer,
    VendaResumoSerializer,
    VendaSerializer,
    contexto_das_lojas,
)
from bancada.tenants.models import Usuario
from bancada.tenants.permissoes import ApenasDono

SITUACOES = {"ativos", "desativados", "repor"}
FORNECEDORES_SUGERIDOS = 30


def usuario_do_pedido(request: Request) -> Usuario | None:
    return request.user if isinstance(request.user, Usuario) else None


def filtrar_produtos(consulta: QuerySet[Produto], parametros: Any) -> QuerySet[Produto]:
    busca = (parametros.get("busca") or "").strip()
    if busca:
        consulta = consulta.filter(Q(nome__icontains=busca) | Q(codigo__icontains=busca))

    tipo = parametros.get("tipo")
    if tipo in TipoDeProduto.values:
        consulta = consulta.filter(tipo=tipo)

    situacao = parametros.get("situacao")
    if situacao not in SITUACOES:
        situacao = "ativos"
    if situacao == "desativados":
        return consulta.filter(ativo=False)
    consulta = consulta.filter(ativo=True)
    if situacao == "repor":
        consulta = consulta.filter(Q(quantidade__lt=F("minimo")))
    return consulta


class ProdutoViewSet(ViewSetDoTenant):
    queryset = Produto.objects.all()
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_serializer_class(self) -> type[BaseSerializer]:
        if self.action == "create":
            return NovoProdutoSerializer
        if self.action == "partial_update":
            return EdicaoDeProdutoSerializer
        return ProdutoSerializer

    def get_serializer_context(self) -> dict[str, Any]:
        return {
            **super().get_serializer_context(),
            "tenant": tenant_obrigatorio(self.request),
            "usuario": usuario_do_pedido(self.request),
        }

    def get_queryset(self) -> QuerySet[Produto]:
        consulta = com_quantidade(Produto.objects.filter(tenant=tenant_obrigatorio(self.request)))
        if self.action == "list":
            return filtrar_produtos(consulta, self.request.query_params)
        return consulta

    def _resposta(self, produtos: list[Produto]) -> Any:
        tenant = tenant_obrigatorio(self.request)
        contexto = {**self.get_serializer_context(), **contexto_das_lojas(tenant, produtos)}
        return ProdutoSerializer(produtos, many=True, context=contexto).data

    def _detalhe(self, pk: int, codigo: int = status.HTTP_200_OK) -> Response:
        produto = self.get_queryset().get(pk=pk)
        return Response(self._resposta([produto])[0], status=codigo)

    def list(self, request: Request, *args: object, **kwargs: object) -> Response:
        consulta = self.get_queryset()
        pagina = self.paginate_queryset(consulta)
        if pagina is None:
            return Response(self._resposta(list(consulta)))
        return self.get_paginated_response(self._resposta(list(pagina)))

    def retrieve(self, request: Request, *args: object, **kwargs: object) -> Response:
        return self._detalhe(self.get_object().pk)

    def create(self, request: Request, *args: object, **kwargs: object) -> Response:
        entrada = self.get_serializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        produto = entrada.save(tenant=tenant_obrigatorio(request))
        return self._detalhe(produto.pk, status.HTTP_201_CREATED)

    def partial_update(self, request: Request, *args: object, **kwargs: object) -> Response:
        produto = self.get_object()
        entrada = self.get_serializer(produto, data=request.data, partial=True)
        entrada.is_valid(raise_exception=True)
        entrada.save()
        return self._detalhe(produto.pk)

    @action(detail=True, methods=["post"])
    def entrada(self, request: Request, pk: str | None = None) -> Response:
        produto = self.get_object()
        entrada = EntradaSerializer(data=request.data, context=self.get_serializer_context())
        entrada.is_valid(raise_exception=True)
        produto.registrar_entrada(**entrada.validated_data, usuario=usuario_do_pedido(request))
        return self._detalhe(produto.pk)

    @action(detail=True, methods=["post"])
    def contagem(self, request: Request, pk: str | None = None) -> Response:
        produto = self.get_object()
        entrada = ContagemSerializer(data=request.data, context=self.get_serializer_context())
        entrada.is_valid(raise_exception=True)
        produto.corrigir_contagem(**entrada.validated_data, usuario=usuario_do_pedido(request))
        return self._detalhe(produto.pk)

    @action(detail=True, methods=["post"])
    def transferencia(self, request: Request, pk: str | None = None) -> Response:
        produto = self.get_object()
        entrada = TransferenciaSerializer(data=request.data, context=self.get_serializer_context())
        entrada.is_valid(raise_exception=True)
        try:
            produto.transferir(**entrada.validated_data, usuario=usuario_do_pedido(request))
        except TransferenciaAcimaDoDisponivel as erro:
            return Response({"quantidade": [str(erro)]}, status=status.HTTP_400_BAD_REQUEST)
        return self._detalhe(produto.pk)

    @action(detail=True, methods=["get"])
    def movimentos(self, request: Request, pk: str | None = None) -> Response:
        produto = self.get_object()
        consulta = MovimentoDeEstoque.objects.filter(produto=produto).select_related(
            "loja", "usuario", "ordem", "venda"
        )
        pagina = self.paginate_queryset(consulta)
        linhas = consulta if pagina is None else pagina
        dados = MovimentoSerializer(linhas, many=True).data
        return Response(dados) if pagina is None else self.get_paginated_response(dados)

    @action(detail=False, methods=["get"])
    def escolha(self, request: Request) -> Response:
        tenant = tenant_obrigatorio(request)
        produtos = list(com_quantidade(Produto.objects.filter(tenant=tenant, ativo=True)))
        contexto = contexto_das_lojas(tenant, produtos)
        return Response(
            {
                "varias_lojas": bool(contexto["lojas"]),
                "produtos": EscolhaDeProdutoSerializer(produtos, many=True, context=contexto).data,
            }
        )

    @action(detail=False, methods=["get"])
    def fornecedores(self, request: Request) -> Response:
        nomes: list[str] = []
        entradas = (
            MovimentoDeEstoque.objects.filter(
                tenant=tenant_obrigatorio(request), tipo=TipoDeMovimento.ENTRADA
            )
            .exclude(fornecedor="")
            .values_list("fornecedor", flat=True)
        )
        for nome in entradas.iterator():
            if nome not in nomes:
                nomes.append(nome)
            if len(nomes) == FORNECEDORES_SUGERIDOS:
                break
        return Response(nomes)


class VendaViewSet(ViewSetDoTenant):
    queryset = Venda.objects.select_related("loja", "vendida_por", "desfeita_por").prefetch_related(
        "itens", "pagamentos"
    )
    http_method_names = ["get", "post", "head", "options"]

    def get_serializer_class(self) -> type[BaseSerializer]:
        if self.action == "list":
            return VendaResumoSerializer
        return VendaSerializer

    def _detalhe(self, pk: int, codigo: int = status.HTTP_200_OK) -> Response:
        venda = self.get_queryset().get(pk=pk)
        return Response(VendaSerializer(venda).data, status=codigo)

    def create(self, request: Request, *args: object, **kwargs: object) -> Response:
        tenant = tenant_obrigatorio(request)
        entrada = NovaVendaSerializer(data=request.data, context={"tenant": tenant})
        entrada.is_valid(raise_exception=True)
        dados = entrada.validated_data

        venda = Venda.registrar(
            tenant=tenant,
            loja=dados["loja"],
            linhas=dados["linhas"],
            valor_cobrado=dados["valor_cobrado"],
            pagamentos=dados["recebimentos"],
            observacao=dados["observacao"],
            usuario=usuario_do_pedido(request),
        )
        return self._detalhe(venda.pk, status.HTTP_201_CREATED)

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[*ViewSetDoTenant.permission_classes, ApenasDono],
    )
    def desfazer(self, request: Request, pk: str | None = None) -> Response:
        venda = self.get_object()
        usuario = usuario_do_pedido(request)
        try:
            venda.desfazer(usuario=usuario)
        except VendaJaDesfeita as erro:
            return Response({"detail": str(erro)}, status=status.HTTP_409_CONFLICT)

        registrar(
            tenant=venda.tenant,
            usuario=usuario,
            acao=Acao.VENDA_DESFEITA,
            objeto="venda",
            objeto_id=venda.pk,
            detalhe=f"Venda #{venda.numero}, {em_reais(venda.valor_cobrado)}",
            origem=origem_do_pedido(request),
        )
        return self._detalhe(venda.pk)
