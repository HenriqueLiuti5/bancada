from collections.abc import Callable
from typing import Any

from django.db.models import QuerySet
from django.http import HttpResponse
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import APIException
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.serializers import BaseSerializer

from bancada.auditoria.models import Acao
from bancada.auditoria.registro import origem_do_pedido, registrar
from bancada.clientes.models import Aparelho, Cliente
from bancada.core.api import ViewSetDoTenant, tenant_do_pedido
from bancada.core.formatos import em_reais
from bancada.ordens import consultas, documentos
from bancada.ordens.estados import StatusOS, TransicaoInvalida
from bancada.ordens.fotos import FotoInvalida
from bancada.ordens.models import (
    FotoOS,
    ItemOrcamento,
    OrdemServico,
    Pagamento,
    PagamentoAcimaDoSaldo,
    Recebimento,
)
from bancada.ordens.painel import numeros as numeros_do_painel
from bancada.ordens.serializers import (
    AberturaOrdemSerializer,
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
    TransicaoSerializer,
)
from bancada.tenants.models import Papel, Usuario
from bancada.tenants.permissoes import ApagarSoDonoOuTecnico, ApenasDono, papel_do_pedido


class OrcamentoTravado(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "O orçamento já foi enviado ao cliente e não pode mais ser alterado."


def exigir_orcamento_editavel(ordem: OrdemServico) -> None:
    if not ordem.orcamento_editavel:
        raise OrcamentoTravado


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
                "itens",
                "eventos__usuario",
                "eventos__aviso",
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
        if "loja" in escolhas:
            base = base.filter(loja=escolhas["loja"])

        return Response(
            numeros_do_painel(
                base,
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

        entrada = ItemOrcamentoSerializer(data=request.data)
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
