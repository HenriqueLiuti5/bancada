from collections.abc import Mapping
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Any

from django.db.models import Count, DecimalField, F, Q, QuerySet, Sum
from django.db.models.functions import Coalesce, TruncMonth

from bancada.estoque.models import ItemDaVenda, Venda
from bancada.financeiro.models import CategoriaDaConta, ContaAPagar
from bancada.ordens.models import ItemOrcamento, OrdemServico, TipoItem
from bancada.ordens.painel import dinheiro
from bancada.ordens.painel.periodo import Periodo

ZERO = Decimal("0.00")
MESES_NO_GRAFICO = 6
CATEGORIAS = dict(CategoriaDaConta.choices)

# As compras de peças são dinheiro que sai, mas o lucro já desconta o custo das peças usadas nas
# ordens e vendidas no balcão; contar a compra também cobraria a mesma peça duas vezes.
FORA_DAS_DESPESAS = [CategoriaDaConta.COMPRAS]

CUSTO_DO_ITEM = Coalesce("custo", "produto__custo")
CUSTO_DO_VENDIDO = Sum(
    F("custo") * F("quantidade"), output_field=DecimalField(max_digits=12, decimal_places=2)
)


# As peças das ordens entregues no período: a do estoque com o custo guardado na entrega, e a
# digitada à mão com o custo que a equipe informou, se informou.
def _pecas_usadas(consulta: QuerySet[OrdemServico], periodo: Periodo) -> QuerySet[ItemOrcamento]:
    return ItemOrcamento.objects.filter(
        ordem__in=dinheiro.entregas_cobradas(consulta, periodo), aprovado=True
    )


def _itens_vendidos(vendas: QuerySet[Venda], periodo: Periodo) -> QuerySet[ItemDaVenda]:
    return ItemDaVenda.objects.filter(venda__in=dinheiro.vendas_feitas(vendas, periodo))


def _contas_pagas(contas: QuerySet[ContaAPagar], periodo: Periodo) -> QuerySet[ContaAPagar]:
    return contas.filter(paga_em__gte=periodo.inicio, paga_em__lte=periodo.fim).exclude(
        categoria__in=FORA_DAS_DESPESAS
    )


@dataclass(frozen=True)
class Resultado:
    recebido: Decimal
    custo_das_pecas: Decimal
    despesas: Decimal

    @property
    def lucro(self) -> Decimal:
        return self.recebido - self.custo_das_pecas - self.despesas

    def em_texto(self) -> dict[str, str]:
        return {
            "recebido": str(self.recebido),
            "custo_das_pecas": str(self.custo_das_pecas),
            "despesas": str(self.despesas),
            "lucro": str(self.lucro),
        }


# O que entrou no período, pelas ordens e pelo balcão, menos o custo das peças das ordens
# entregues e das vendas e as contas pagas, como o Henrique decidiu na parte 4 do financeiro.
def no_periodo(
    consulta: QuerySet[OrdemServico],
    vendas: QuerySet[Venda],
    contas: QuerySet[ContaAPagar],
    periodo: Periodo,
) -> dict[str, Any]:
    recebido = dinheiro.recebido(consulta, periodo) + dinheiro.recebido_no_balcao(vendas, periodo)
    pecas = _pecas_usadas(consulta, periodo).aggregate(
        total=Sum(CUSTO_DO_ITEM),
        sem_custo=Count(
            "id", filter=Q(tipo=TipoItem.PECA, custo__isnull=True, produto__isnull=True)
        ),
    )
    vendido = _itens_vendidos(vendas, periodo).aggregate(total=CUSTO_DO_VENDIDO)["total"]
    por_categoria = list(
        _contas_pagas(contas, periodo)
        .order_by()
        .values("categoria")
        .annotate(total=Sum("valor"))
        .order_by("-total", "categoria")
    )

    resultado = Resultado(
        recebido=recebido,
        custo_das_pecas=(pecas["total"] or ZERO) + (vendido or ZERO),
        despesas=sum((linha["total"] for linha in por_categoria), ZERO),
    )
    return {
        **resultado.em_texto(),
        "pecas_sem_custo": pecas["sem_custo"],
        "despesas_por_categoria": [
            {
                "categoria": linha["categoria"],
                "rotulo": CATEGORIAS.get(linha["categoria"], linha["categoria"]),
                "valor": str(linha["total"]),
            }
            for linha in por_categoria
        ],
    }


def _primeiro_do_mes(valor: date | datetime) -> date:
    dia = valor.date() if isinstance(valor, datetime) else valor
    return dia.replace(day=1)


def _por_mes(consulta: QuerySet[Any], campo: str, total: Any) -> dict[date, Decimal]:
    linhas = consulta.order_by().annotate(mes=TruncMonth(campo)).values("mes").annotate(soma=total)
    somas: dict[date, Decimal] = {}
    for linha in linhas:
        mes = _primeiro_do_mes(linha["mes"])
        somas[mes] = somas.get(mes, ZERO) + (linha["soma"] or ZERO)
    return somas


def _meses(hoje: date) -> list[date]:
    meses = [hoje.replace(day=1)]
    while len(meses) < MESES_NO_GRAFICO:
        meses.insert(0, (meses[0] - timedelta(days=1)).replace(day=1))
    return meses


def _de(somas: Mapping[date, Decimal], mes: date) -> Decimal:
    return somas.get(mes, ZERO)


# O lucro de cada um dos últimos meses, do mais antigo ao atual, que vai até hoje. As mesmas
# consultas do período, agrupadas por mês, para o gráfico e o cartão contarem igual.
def mes_a_mes(
    consulta: QuerySet[OrdemServico],
    vendas: QuerySet[Venda],
    contas: QuerySet[ContaAPagar],
    hoje: date,
) -> list[dict[str, str]]:
    meses = _meses(hoje)
    periodo = Periodo(meses[0], hoje)

    das_ordens = _por_mes(dinheiro.pagamentos(consulta, periodo), "recebido_em", Sum("valor"))
    do_balcao = _por_mes(
        dinheiro.pagamentos_do_balcao(vendas, periodo), "venda__criado_em", Sum("valor")
    )
    pecas = _por_mes(_pecas_usadas(consulta, periodo), "ordem__entregue_em", Sum(CUSTO_DO_ITEM))
    vendido = _por_mes(_itens_vendidos(vendas, periodo), "venda__criado_em", CUSTO_DO_VENDIDO)
    despesas = _por_mes(_contas_pagas(contas, periodo), "paga_em", Sum("valor"))

    linhas = []
    for mes in meses:
        resultado = Resultado(
            recebido=_de(das_ordens, mes) + _de(do_balcao, mes),
            custo_das_pecas=_de(pecas, mes) + _de(vendido, mes),
            despesas=_de(despesas, mes),
        )
        linhas.append({"mes": f"{mes:%Y-%m}", **resultado.em_texto()})
    return linhas
