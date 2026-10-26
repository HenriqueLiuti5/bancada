import random
from collections import defaultdict
from datetime import datetime, timedelta
from decimal import Decimal

from django.db.models import Q
from django.utils import timezone

from bancada.core.exemplo.agenda import Tarefa, datar, depois
from bancada.core.exemplo.assistencia import Assistencia
from bancada.core.exemplo.catalogo import (
    ACESSORIOS,
    FORNECEDOR_DE_ACESSORIOS,
    FORNECEDOR_DE_PECAS,
    PECAS_DO_ESTOQUE,
    SIGLAS,
)
from bancada.estoque.models import (
    ItemDaVenda,
    LinhaDaVenda,
    MovimentoDeEstoque,
    PagamentoDaVenda,
    Produto,
    TipoDeMovimento,
    TipoDeProduto,
    Venda,
    com_quantidade,
)
from bancada.financeiro.models import (
    CategoriaDaConta,
    ContaAPagar,
    FormaDePagamentoDaConta,
    PagamentoDaConta,
)
from bancada.ordens.models import FormaDePagamento, Recebimento
from bancada.tenants.models import Loja

CENTAVO = Decimal("0.01")
DESCRICAO_DA_COMPRA = {
    FORNECEDOR_DE_PECAS: "Compra de peças",
    FORNECEDOR_DE_ACESSORIOS: "Compra de acessórios",
}


def em_estoque(produto: Produto) -> int:
    return getattr(produto, "quantidade", 0)


class Estoque:
    def __init__(self, assistencia: Assistencia) -> None:
        self.assistencia = assistencia
        self._pecas: dict[tuple[str, str], Produto] = {}
        self._quanto_guardar: dict[tuple[int, int], int] = {}
        self._custo_de_compra: dict[int, Decimal] = {}
        self._fornecedor: dict[int, str] = {}
        self._peso_na_venda: dict[int, int] = {}
        self._esperando: dict[tuple[int, int], list[Tarefa]] = defaultdict(list)

    def cadastrar(self, momento: datetime) -> None:
        tenant = self.assistencia.tenant
        produtos: list[Produto] = []
        for peca in PECAS_DO_ESTOQUE:
            for modelo, (custo, preco) in peca.custo_e_preco.items():
                produto = Produto.objects.create(
                    tenant=tenant,
                    nome=f"{peca.nome} {modelo}",
                    tipo=TipoDeProduto.PECA,
                    codigo=f"{peca.sigla}-{SIGLAS[modelo]}",
                    custo=Decimal(custo),
                    preco=Decimal(preco),
                    minimo=peca.minimo,
                )
                self._pecas[(peca.tipo, modelo)] = produto
                self._guardar(produto, peca.na_matriz, peca.na_filial, FORNECEDOR_DE_PECAS)
                produtos.append(produto)

        for acessorio in ACESSORIOS:
            produto = Produto.objects.create(
                tenant=tenant,
                nome=acessorio.nome,
                tipo=TipoDeProduto.ACESSORIO,
                codigo=acessorio.codigo,
                custo=acessorio.custo,
                preco=acessorio.preco,
                minimo=acessorio.minimo,
            )
            self._peso_na_venda[produto.pk] = acessorio.peso
            self._guardar(
                produto, acessorio.na_matriz, acessorio.na_filial, FORNECEDOR_DE_ACESSORIOS
            )
            produtos.append(produto)

        iniciais = []
        for produto in produtos:
            for loja in self.assistencia.lojas:
                inicial = produto.registrar_estoque_inicial(
                    loja=loja,
                    quantidade=self._quanto_guardar[(produto.pk, loja.pk)],
                    usuario=self.assistencia.dono,
                )
                iniciais.append(inicial.pk)
        datar(Produto.objects.filter(pk__in=[produto.pk for produto in produtos]), momento)
        datar(MovimentoDeEstoque.objects.filter(pk__in=iniciais), momento)

    def _guardar(self, produto: Produto, na_matriz: int, na_filial: int, fornecedor: str) -> None:
        self._quanto_guardar[(produto.pk, self.assistencia.matriz.pk)] = na_matriz
        self._quanto_guardar[(produto.pk, self.assistencia.filial.pk)] = na_filial
        self._custo_de_compra[produto.pk] = produto.custo
        self._fornecedor[produto.pk] = fornecedor

    def peca(self, tipo: str, modelo: str) -> Produto | None:
        return self._pecas.get((tipo, modelo))

    def acessorios_na_loja(self, loja: Loja) -> list[Produto]:
        consulta = Produto.objects.filter(pk__in=self._peso_na_venda)
        return list(com_quantidade(consulta, loja).filter(Q(quantidade__gt=0)))

    def peso_na_venda(self, produto: Produto) -> int:
        return self._peso_na_venda[produto.pk]

    # A peça que faltou para uma ordem aprovada vem da outra loja, quando lá sobra, ou chega na
    # próxima compra.
    def providenciar(
        self, produto: Produto, loja: Loja, momento: datetime, retomar: Tarefa
    ) -> None:
        outra = self.assistencia.outra(loja)
        if produto.quantidade_na_loja(outra) >= 2:
            self.assistencia.agenda.marcar(
                depois(momento, 4, 9),
                lambda quando: self._transferir(produto, outra, loja, quando, retomar),
            )
        else:
            self._esperando[(produto.pk, loja.pk)].append(retomar)

    def _transferir(
        self, produto: Produto, de: Loja, para: Loja, momento: datetime, retomar: Tarefa
    ) -> None:
        if produto.quantidade_na_loja(de) < 1:
            self._esperando[(produto.pk, para.pk)].append(retomar)
            return
        movimentos = produto.transferir(
            de=de, para=para, quantidade=1, usuario=self.assistencia.dono
        )
        datar(MovimentoDeEstoque.objects.filter(pk__in=[m.pk for m in movimentos]), momento)
        self.assistencia.agenda.marcar(depois(momento, 1, 3), retomar)

    # Uma vez por semana a loja compra o que ficou abaixo do mínimo, somando as duas lojas, até cada
    # loja voltar a ter o que costuma guardar. A compra é paga na hora ou em boleto para 14 dias.
    def repor(self, momento: datetime) -> None:
        produtos = com_quantidade(Produto.objects.filter(tenant=self.assistencia.tenant))
        abaixo = [produto for produto in produtos if em_estoque(produto) < produto.minimo]
        if not abaixo:
            return
        for loja in self.assistencia.lojas:
            na_loja = com_quantidade(Produto.objects.filter(pk__in=[p.pk for p in abaixo]), loja)
            compras: dict[str, list[tuple[Produto, int]]] = defaultdict(list)
            for produto in na_loja:
                falta = self._quanto_guardar[(produto.pk, loja.pk)] - em_estoque(produto)
                if falta > 0:
                    compras[self._fornecedor[produto.pk]].append((produto, falta))
            for fornecedor, itens in compras.items():
                self._comprar(loja, fornecedor, itens, momento, a_vista=random.random() < 0.5)

    # A peça que faltou para uma ordem aprovada é comprada na manhã seguinte e paga na hora.
    def comprar_o_que_falta(self, momento: datetime) -> None:
        pecas = Produto.objects.filter(tenant=self.assistencia.tenant, tipo=TipoDeProduto.PECA)
        for loja in self.assistencia.lojas:
            itens = [
                (produto, self._quanto_guardar[(produto.pk, loja.pk)] - em_estoque(produto))
                for produto in com_quantidade(pecas, loja)
                if em_estoque(produto) < 0
            ]
            if itens:
                self._comprar(loja, FORNECEDOR_DE_PECAS, itens, momento, a_vista=True)

    def _comprar(
        self,
        loja: Loja,
        fornecedor: str,
        itens: list[tuple[Produto, int]],
        momento: datetime,
        a_vista: bool,
    ) -> None:
        dia = timezone.localdate(momento)
        total = Decimal("0.00")
        entradas = []
        for produto, unidades in itens:
            variacao = Decimal(str(round(random.uniform(0.95, 1.06), 3)))
            custo = (self._custo_de_compra[produto.pk] * variacao).quantize(CENTAVO)
            entrada = produto.registrar_entrada(
                loja=loja,
                quantidade=unidades,
                custo_unitario=custo,
                fornecedor=fornecedor,
                usuario=self.assistencia.dono,
            )
            entradas.append(entrada.pk)
            total += custo * unidades
        datar(MovimentoDeEstoque.objects.filter(pk__in=entradas), momento)

        conta = ContaAPagar.lancar(
            tenant=self.assistencia.tenant,
            descricao=DESCRICAO_DA_COMPRA[fornecedor],
            categoria=CategoriaDaConta.COMPRAS,
            fornecedor=fornecedor,
            valor=total,
            vencimento=dia if a_vista else dia + timedelta(days=14),
            hoje=dia,
            loja=loja,
            pagamento=PagamentoDaConta(dia, FormaDePagamentoDaConta.PIX) if a_vista else None,
            usuario=self.assistencia.dono,
        )
        datar(ContaAPagar.objects.filter(pk=conta.pk), momento)

        for produto, _ in itens:
            for retomar in self._esperando.pop((produto.pk, loja.pk), []):
                self.assistencia.agenda.marcar(depois(momento, 0.5, 4), retomar)

    # De vez em quando uma película quebra na aplicação, e a contagem é corrigida.
    def corrigir_uma_pelicula(self, loja: Loja, momento: datetime) -> None:
        peliculas = [
            produto
            for produto in self.acessorios_na_loja(loja)
            if produto.nome.startswith("Película")
        ]
        if not peliculas:
            return
        produto = random.choice(peliculas)
        movimento = produto.corrigir_contagem(
            loja=loja,
            contada=em_estoque(produto) - 1,
            observacao="Quebrou na aplicação",
            usuario=self.assistencia.no_balcao(loja),
        )
        if movimento is not None:
            datar(MovimentoDeEstoque.objects.filter(pk=movimento.pk), momento)


FORMAS_NO_BALCAO = [
    FormaDePagamento.PIX,
    FormaDePagamento.DINHEIRO,
    FormaDePagamento.DEBITO,
    FormaDePagamento.CREDITO,
]


class Balcao:
    def __init__(self, assistencia: Assistencia, estoque: Estoque) -> None:
        self.assistencia = assistencia
        self.estoque = estoque

    def vender(self, loja: Loja, momento: datetime) -> None:
        disponiveis = self.estoque.acessorios_na_loja(loja)
        if not disponiveis:
            return

        pesos = [self.estoque.peso_na_venda(produto) for produto in disponiveis]
        escolhidos: list[Produto] = []
        for _ in range(random.choices([1, 2, 3], weights=[70, 25, 5])[0]):
            produto = random.choices(disponiveis, weights=pesos)[0]
            if produto not in escolhidos:
                escolhidos.append(produto)
        linhas = [
            LinhaDaVenda(
                produto=produto,
                quantidade=2 if em_estoque(produto) >= 2 and random.random() < 0.08 else 1,
            )
            for produto in escolhidos
        ]

        total = sum((linha.produto.preco * linha.quantidade for linha in linhas), Decimal("0"))
        cobrado = total - (total % 5 or 5) if random.random() < 0.12 else total
        venda = Venda.registrar(
            tenant=self.assistencia.tenant,
            loja=loja,
            linhas=linhas,
            valor_cobrado=cobrado,
            pagamentos=self._pagamentos(cobrado),
            usuario=random.choice([self.assistencia.no_balcao(loja), self.assistencia.dono]),
        )
        datar(Venda.objects.filter(pk=venda.pk), momento)
        datar(ItemDaVenda.objects.filter(venda=venda), momento)
        datar(PagamentoDaVenda.objects.filter(venda=venda), momento)
        datar(MovimentoDeEstoque.objects.filter(venda=venda), momento)

        # Poucas vendas são desfeitas, quando o cliente desiste e devolve o produto.
        if random.random() < 0.02:
            self.assistencia.agenda.marcar(
                depois(momento, 0.2, 1.5),
                lambda quando: self._desfazer(venda, quando),
            )

    def _pagamentos(self, cobrado: Decimal) -> list[Recebimento]:
        if random.random() < 0.08 and cobrado >= 20:
            em_dinheiro = (cobrado / 2).quantize(Decimal("1"))
            return [
                Recebimento(forma=FormaDePagamento.DINHEIRO, valor=em_dinheiro),
                Recebimento(forma=FormaDePagamento.PIX, valor=cobrado - em_dinheiro),
            ]
        forma = random.choices(FORMAS_NO_BALCAO, weights=[45, 30, 15, 10])[0]
        return [Recebimento(forma=forma, valor=cobrado)]

    def _desfazer(self, venda: Venda, momento: datetime) -> None:
        venda.desfazer(usuario=self.assistencia.dono)
        Venda.objects.filter(pk=venda.pk).update(desfeita_em=momento)
        datar(
            MovimentoDeEstoque.objects.filter(venda=venda, tipo=TipoDeMovimento.VENDA_DESFEITA),
            momento,
        )
