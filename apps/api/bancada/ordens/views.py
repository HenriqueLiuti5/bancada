from collections.abc import Callable
from typing import Any

from django.db import transaction
from django.db.models import Prefetch, QuerySet
from django.http import HttpResponse
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import APIException
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.serializers import BaseSerializer
from rest_framework.throttling import UserRateThrottle

from bancada.auditoria.models import Acao
from bancada.auditoria.registro import origem_do_pedido, registrar
from bancada.clientes.models import Aparelho, Cliente
from bancada.core.api import ViewSetDoTenant, tenant_do_pedido
from bancada.core.formatos import em_reais
from bancada.estoque.models import Produto, Venda
from bancada.financeiro.models import ContaAPagar
from bancada.ordens import consultas, documentos, publico
from bancada.ordens.estados import StatusOS, TransicaoInvalida
from bancada.ordens.fotos import FotoInvalida
from bancada.ordens.models import (
    FotoOS,
    ItemOrcamento,
    NadaAReceber,
    OrdemServico,
    Pagamento,
    PagamentoAcimaDoSaldo,
    Recebimento,
    TipoDeRegistro,
)
from bancada.ordens.painel import numeros as numeros_do_painel
from bancada.ordens.serializers import (
    AberturaOrdemSerializer,
    CombinacaoDoPagamentoSerializer,
    ComentarioSerializer,
    CompartilhamentoDoLinkSerializer,
    EdicaoDaOrdemSerializer,
    EnvioDeFotoSerializer,
    FiltroDoPainelSerializer,
    FotoOSSerializer,
    ItemOrcamentoSerializer,
    OrdemServicoDetailSerializer,
    OrdemServicoListSerializer,
    PagamentoSerializer,
    RecebimentoSerializer,
    RegistroOSSerializer,
    TransicaoSerializer,
    TrocaDeClienteSerializer,
)
from bancada.tenants.models import Loja, Papel, Usuario
from bancada.tenants.permissoes import ApagarSoDonoOuTecnico, ApenasDono, papel_do_pedido


class LimiteDeEnvioDeFotos(UserRateThrottle):
    scope = "envio_de_foto"


class OrcamentoTravado(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "O orçamento já foi enviado ao cliente e não pode mais ser alterado."


def exigir_orcamento_editavel(ordem: OrdemServico) -> None:
    if not ordem.orcamento_editavel:
        raise OrcamentoTravado


class OrdemEncerrada(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "Esta ordem já foi encerrada e não troca mais de cliente."


class OrdemServicoViewSet(ViewSetDoTenant):
    queryset = OrdemServico.objects.select_related("cliente", "aparelho", "tecnico", "loja")
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_serializer_class(self) -> type[BaseSerializer]:
        if self.action == "list":
            return OrdemServicoListSerializer
        if self.action == "partial_update":
            return EdicaoDaOrdemSerializer
        return OrdemServicoDetailSerializer

    def get_serializer_context(self) -> dict[str, Any]:
        return {**super().get_serializer_context(), "tenant": tenant_do_pedido(self.request)}

    def partial_update(self, request: Request, *args: object, **kwargs: object) -> Response:
        ordem = self.get_object()
        entrada = self.get_serializer(ordem, data=request.data, partial=True)
        entrada.is_valid(raise_exception=True)
        entrada.save()

        atualizada = self.get_queryset().get(pk=ordem.pk)
        saida = OrdemServicoDetailSerializer(atualizada, context=self.get_serializer_context())
        return Response(saida.data)

    def get_queryset(self) -> QuerySet[OrdemServico]:
        consulta = super().get_queryset()

        if self.action != "list":
            return consulta.prefetch_related(
                Prefetch("itens", queryset=ItemOrcamento.objects.select_related("produto")),
                "eventos__usuario",
                "eventos__aviso",
                "registros__usuario",
                "fotos",
                "pagamentos__registrado_por",
            )

        return consultas.filtrar(consulta, self.request.query_params)

    def create(self, request: Request, *args: object, **kwargs: object) -> Response:
        tenant = tenant_do_pedido(request)
        if tenant is None:
            return Response(status=status.HTTP_403_FORBIDDEN)
        entrada = AberturaOrdemSerializer(data=request.data, context={"tenant": tenant})
        entrada.is_valid(raise_exception=True)

        dados = entrada.validated_data
        cliente = dados.get("cliente") or Cliente.objects.create(
            tenant=tenant, **dados["cliente_novo"]
        )
        aparelho = dados.get("aparelho") or Aparelho.objects.create(
            tenant=tenant, cliente=cliente, **dados["aparelho_novo"]
        )

        usuario = request.user if isinstance(request.user, Usuario) else None
        ordem = OrdemServico.abrir(
            tenant=tenant,
            loja=dados["loja"],
            cliente=cliente,
            aparelho=aparelho,
            problema_relatado=dados["problema_relatado"],
            aberta_por=usuario,
            tecnico=usuario,
            prometida_para=dados.get("prometida_para"),
        )
        saida = OrdemServicoDetailSerializer(ordem, context=self.get_serializer_context())
        return Response(saida.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"])
    def painel(self, request: Request) -> Response:
        tenant = tenant_do_pedido(request)
        filtro = FiltroDoPainelSerializer(data=request.query_params, context={"tenant": tenant})
        filtro.is_valid(raise_exception=True)
        escolhas = filtro.validated_data

        base = OrdemServico.objects.filter(tenant=tenant)
        vendas = Venda.objects.filter(tenant=tenant)
        contas = ContaAPagar.objects.filter(tenant=tenant)
        lojas = Loja.objects.filter(tenant=tenant, ativa=True)
        if "loja" in escolhas:
            base = base.filter(loja=escolhas["loja"])
            vendas = vendas.filter(loja=escolhas["loja"])
            contas = contas.filter(loja=escolhas["loja"])
            lojas = Loja.objects.filter(pk=escolhas["loja"].pk)

        return Response(
            numeros_do_painel(
                base,
                vendas=vendas,
                produtos=Produto.objects.filter(tenant=tenant),
                contas=contas,
                lojas=lojas,
                chave=escolhas["periodo"],
                atual=escolhas["atual"],
                anterior=escolhas["anterior"],
                com_dinheiro=papel_do_pedido(request) == Papel.DONO,
            )
        )

    @action(detail=False, methods=["get"])
    def catalogo(self, request: Request) -> Response:
        return Response(
            {
                "status": [
                    {"valor": situacao.value, "rotulo": situacao.label} for situacao in StatusOS
                ],
                "ordenacoes": [
                    {"valor": chave, "rotulo": rotulo}
                    for chave, rotulo in consultas.ROTULOS_DE_ORDENACAO.items()
                ],
            }
        )

    def _documento_em_pdf(
        self, gerar: Callable[[OrdemServico], bytes], documento: str
    ) -> HttpResponse:
        ordem = self.get_object()
        resposta = HttpResponse(gerar(ordem), content_type="application/pdf")
        nome = documentos.nome_do_arquivo(ordem, documento)
        resposta["Content-Disposition"] = f'inline; filename="{nome}"'
        return resposta

    @action(detail=True, methods=["get"])
    def comprovante(self, request: Request, pk: str | None = None) -> HttpResponse:
        return self._documento_em_pdf(documentos.comprovante_em_pdf, "comprovante")

    @action(detail=True, methods=["get"])
    def recibo(self, request: Request, pk: str | None = None) -> HttpResponse:
        return self._documento_em_pdf(documentos.recibo_em_pdf, "recibo")

    @action(
        detail=True,
        methods=["post"],
        url_path="fotos",
        parser_classes=[MultiPartParser, FormParser],
        throttle_classes=[LimiteDeEnvioDeFotos],
    )
    def enviar_foto(self, request: Request, pk: str | None = None) -> Response:
        entrada = EnvioDeFotoSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)

        ordem = self.get_object()
        usuario = request.user if isinstance(request.user, Usuario) else None
        try:
            foto = FotoOS.registrar(
                ordem=ordem,
                enviado=entrada.validated_data["arquivo"],
                momento=entrada.validated_data["momento"],
                legenda=entrada.validated_data["legenda"],
                enviada_por=usuario,
            )
        except FotoInvalida as erro:
            return Response({"arquivo": [str(erro)]}, status=status.HTTP_400_BAD_REQUEST)

        return Response(FotoOSSerializer(foto).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="itens")
    def adicionar_item(self, request: Request, pk: str | None = None) -> Response:
        ordem = self.get_object()
        exigir_orcamento_editavel(ordem)

        entrada = ItemOrcamentoSerializer(data=request.data, context={"ordem": ordem})
        entrada.is_valid(raise_exception=True)
        item = entrada.save(ordem=ordem)
        return Response(ItemOrcamentoSerializer(item).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="pagamentos")
    def receber(self, request: Request, pk: str | None = None) -> Response:
        ordem = self.get_object()
        entrada = RecebimentoSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)

        usuario = request.user if isinstance(request.user, Usuario) else None
        try:
            pagamento = ordem.receber(Recebimento(**entrada.validated_data), usuario=usuario)
        except PagamentoAcimaDoSaldo as erro:
            return Response({"valor": [str(erro)]}, status=status.HTTP_400_BAD_REQUEST)

        return Response(PagamentoSerializer(pagamento).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="pagamento-combinado")
    def combinar_pagamento(self, request: Request, pk: str | None = None) -> Response:
        ordem = self.get_object()
        entrada = CombinacaoDoPagamentoSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)

        usuario = request.user if isinstance(request.user, Usuario) else None
        try:
            ordem.combinar_pagamento(
                entrada.validated_data["pagamento_combinado_para"], usuario=usuario
            )
        except NadaAReceber as erro:
            return Response({"detail": str(erro)}, status=status.HTTP_409_CONFLICT)

        atualizada = self.get_queryset().get(pk=ordem.pk)
        saida = OrdemServicoDetailSerializer(atualizada, context=self.get_serializer_context())
        return Response(saida.data)

    @action(detail=True, methods=["post"], url_path="link-compartilhado")
    def link_compartilhado(self, request: Request, pk: str | None = None) -> Response:
        ordem = self.get_object()
        entrada = CompartilhamentoDoLinkSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)

        meio = CompartilhamentoDoLinkSerializer.MEIOS[entrada.validated_data["meio"]]
        registrar(
            tenant=ordem.tenant,
            usuario=request.user if isinstance(request.user, Usuario) else None,
            acao=Acao.LINK_COMPARTILHADO,
            objeto="ordem",
            objeto_id=ordem.pk,
            detalhe=f"OS #{ordem.numero}, {meio}",
            origem=origem_do_pedido(request),
        )
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"])
    def transicionar(self, request: Request, pk: str | None = None) -> Response:
        ordem = self.get_object()
        entrada = TransicaoSerializer(data=request.data, context={"ordem": ordem})
        entrada.is_valid(raise_exception=True)

        usuario = request.user if isinstance(request.user, Usuario) else None
        try:
            ordem.transicionar(
                entrada.validated_data["status"],
                usuario=usuario,
                nota=entrada.validated_data["nota"],
                itens_aprovados=entrada.validated_data.get("itens_aprovados"),
                cobranca=entrada.validated_data.get("cobranca"),
            )
        except TransicaoInvalida as erro:
            return Response({"detail": str(erro)}, status=status.HTTP_409_CONFLICT)

        ordem = self.get_queryset().get(pk=ordem.pk)
        saida = OrdemServicoDetailSerializer(ordem, context=self.get_serializer_context())
        return Response(saida.data)

    @action(detail=True, methods=["post"], url_path="comentarios")
    def comentar(self, request: Request, pk: str | None = None) -> Response:
        ordem = self.get_object()
        entrada = ComentarioSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)

        registro = entrada.save(
            tenant_id=ordem.tenant_id,
            ordem=ordem,
            tipo=TipoDeRegistro.COMENTARIO,
            usuario=request.user if isinstance(request.user, Usuario) else None,
        )
        return Response(RegistroOSSerializer(registro).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="trocar-cliente")
    def trocar_cliente(self, request: Request, pk: str | None = None) -> Response:
        ordem = self.get_object()
        if ordem.encerrada:
            raise OrdemEncerrada

        contexto = {**self.get_serializer_context(), "ordem": ordem}
        entrada = TrocaDeClienteSerializer(data=request.data, context=contexto)
        entrada.is_valid(raise_exception=True)

        dados = entrada.validated_data
        tenant = ordem.tenant
        cliente = dados.get("cliente") or Cliente.objects.create(
            tenant=tenant, **dados["cliente_novo"]
        )
        aparelho = dados.get("aparelho")
        if dados.get("aparelho_novo"):
            aparelho = Aparelho.objects.create(
                tenant=tenant, cliente=cliente, **dados["aparelho_novo"]
            )

        anterior = ordem.cliente
        link_antigo = ordem.token_publico
        usuario = request.user if isinstance(request.user, Usuario) else None
        ordem.trocar_cliente(cliente, aparelho, usuario=usuario)
        transaction.on_commit(lambda: publico.invalidar(link_antigo))
        registrar(
            tenant=tenant,
            usuario=usuario,
            acao=Acao.CLIENTE_TROCADO,
            objeto="ordem",
            objeto_id=ordem.pk,
            detalhe=(
                f"OS #{ordem.numero}, de {anterior.nome} (id {anterior.pk}) "
                f"para {cliente.nome} (id {cliente.pk})"
            ),
            origem=origem_do_pedido(request),
        )

        atualizada = self.get_queryset().get(pk=ordem.pk)
        saida = OrdemServicoDetailSerializer(atualizada, context=self.get_serializer_context())
        return Response(saida.data)


class FotoViewSet(ViewSetDoTenant):
    serializer_class = FotoOSSerializer
    queryset = FotoOS.objects.select_related("ordem")
    permission_classes = [*ViewSetDoTenant.permission_classes, ApagarSoDonoOuTecnico]
    http_method_names = ["patch", "delete"]


class ItemOrcamentoViewSet(ViewSetDoTenant):
    serializer_class = ItemOrcamentoSerializer
    queryset = ItemOrcamento.objects.select_related("ordem")
    http_method_names = ["delete"]

    def get_queryset(self) -> QuerySet[ItemOrcamento]:
        return self.queryset.filter(ordem__tenant=tenant_do_pedido(self.request))

    def perform_destroy(self, instance: ItemOrcamento) -> None:
        exigir_orcamento_editavel(instance.ordem)
        instance.delete()


class PagamentoViewSet(ViewSetDoTenant):
    serializer_class = PagamentoSerializer
    queryset = Pagamento.objects.select_related("ordem")
    permission_classes = [*ViewSetDoTenant.permission_classes, ApenasDono]
    http_method_names = ["delete"]

    def perform_destroy(self, instance: Pagamento) -> None:
        registrar(
            tenant=instance.tenant,
            usuario=self.request.user if isinstance(self.request.user, Usuario) else None,
            acao=Acao.PAGAMENTO_REMOVIDO,
            objeto="ordem",
            objeto_id=instance.ordem_id,
            detalhe=(
                f"OS #{instance.ordem.numero}, {instance.get_forma_display()} "
                f"{em_reais(instance.valor)}"
            ),
            origem=origem_do_pedido(self.request),
        )
        instance.delete()
