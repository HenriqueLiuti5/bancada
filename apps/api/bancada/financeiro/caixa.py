from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Any

from django.db import transaction
from django.db.models import Q, QuerySet, Sum
from django.utils import timezone

from bancada.estoque.models import PagamentoDaVenda
from bancada.financeiro.models import (
    ConferenciaDoCaixa,
    ContaAPagar,
    FormaDePagamentoDaConta,
    MovimentoDoCaixa,
    TipoDeMovimentoDoCaixa,
)
from bancada.ordens.models import Pagamento
from bancada.ordens.painel.periodo import Periodo
from bancada.tenants.models import Loja, Usuario

ZERO = Decimal("0.00")
DINHEIRO = FormaDePagamentoDaConta.DINHEIRO


# Com uma loja só, as contas de toda a assistência saem da gaveta dela. Com mais de uma, a conta de
# toda a assistência não sai da gaveta de nenhuma. As pagas até o dia em que a segunda loja foi
# criada continuam saindo da gaveta da primeira, para a loja nova não mudar as contas já conferidas.
def contas_da_loja(loja: Loja) -> Q:
    primeiras = list(Loja.objects.filter(tenant_id=loja.tenant_id).order_by("criado_em", "pk")[:2])
    if len(primeiras) == 1:
        return Q(loja=loja) | Q(loja__isnull=True)
    if primeiras[0].pk == loja.pk:
        segunda_criada = timezone.localdate(primeiras[1].criado_em)
        return Q(loja=loja) | Q(loja__isnull=True, paga_em__lte=segunda_criada)
    return Q(loja=loja)


def _por_forma(linhas: Iterable[Mapping[str, Any]], totais: dict[str, Decimal]) -> None:
    for linha in linhas:
        totais[linha["forma"]] = totais.get(linha["forma"], ZERO) + linha["total"]


def _somar(consulta: QuerySet[Any], totais: dict[str, Decimal]) -> None:
    _por_forma(consulta.order_by().values("forma").annotate(total=Sum("valor")), totais)


@dataclass(frozen=True)
class Fluxo:
    entrou: dict[str, Decimal]
    saiu: dict[str, Decimal]
    retiradas: Decimal
    reforcos: Decimal

    @property
    def em_dinheiro(self) -> Decimal:
        entrou = self.entrou.get(DINHEIRO, ZERO)
        saiu = self.saiu.get(DINHEIRO, ZERO)
        return entrou - saiu - self.retiradas + self.reforcos


# O que entrou e o que saiu do caixa da loja do primeiro ao último dia. A venda desfeita entrou no
# dia da venda e saiu, devolvida ao cliente, no dia em que foi desfeita.
def fluxo(loja: Loja, inicio: date, fim: date) -> Fluxo:
    periodo = Periodo(inicio, fim)
    entrou: dict[str, Decimal] = {}
    _somar(Pagamento.objects.filter(ordem__loja=loja).filter(periodo.filtro("recebido_em")), entrou)
    vendas = PagamentoDaVenda.objects.filter(venda__loja=loja)
    _somar(vendas.filter(periodo.filtro("venda__criado_em")), entrou)

    saiu: dict[str, Decimal] = {}
    _somar(vendas.filter(periodo.filtro("venda__desfeita_em")), saiu)
    contas = ContaAPagar.objects.filter(contas_da_loja(loja), paga_em__gte=inicio, paga_em__lte=fim)
    _somar(contas, saiu)

    movimentos = (
        MovimentoDoCaixa.objects.filter(loja=loja)
        .filter(periodo.filtro("criado_em"))
        .aggregate(
            retiradas=Sum("valor", filter=Q(tipo=TipoDeMovimentoDoCaixa.RETIRADA)),
            reforcos=Sum("valor", filter=Q(tipo=TipoDeMovimentoDoCaixa.REFORCO)),
        )
    )
    return Fluxo(
        entrou=entrou,
        saiu=saiu,
        retiradas=movimentos["retiradas"] or ZERO,
        reforcos=movimentos["reforcos"] or ZERO,
    )


# Quanto devia haver na gaveta no fim de um dia, partindo do que ficou nela numa conferência: o
# dinheiro que entrou e saiu no dia da conferência depois da contagem e o dos dias seguintes.
def na_gaveta_depois(conferencia: ConferenciaDoCaixa, ate: date) -> Decimal:
    no_dia = fluxo(conferencia.loja, conferencia.dia, conferencia.dia).em_dinheiro
    total = conferencia.na_gaveta + no_dia - conferencia.movimento_do_dia
    if conferencia.dia < ate:
        total += fluxo(conferencia.loja, conferencia.dia + timedelta(days=1), ate).em_dinheiro
    return total


def comeco_do_dia(loja: Loja, dia: date) -> Decimal | None:
    anterior = ConferenciaDoCaixa.ultima(loja, antes_de=dia)
    if anterior is None:
        return None
    return na_gaveta_depois(anterior, dia - timedelta(days=1))


# Sem conferência anterior, a primeira contagem da loja não tem com o que comparar: ela é o ponto
# de partida. A trava na loja faz duas contagens ao mesmo tempo esperarem uma pela outra.
@transaction.atomic
def conferir(
    loja: Loja,
    *,
    contado: Decimal,
    retirado: Decimal,
    observacao: str,
    usuario: Usuario | None,
    hoje: date,
) -> ConferenciaDoCaixa:
    Loja.objects.select_for_update().get(pk=loja.pk)
    ultima = ConferenciaDoCaixa.ultima(loja)
    return ConferenciaDoCaixa.objects.create(
        tenant_id=loja.tenant_id,
        loja=loja,
        dia=hoje,
        contado=contado,
        na_gaveta=contado - retirado,
        esperado=None if ultima is None else na_gaveta_depois(ultima, hoje),
        movimento_do_dia=fluxo(loja, hoje, hoje).em_dinheiro,
        observacao=observacao,
        conferida_por=usuario,
    )


@dataclass(frozen=True)
class Movimento:
    momento: datetime | None
    tipo: str
    descricao: str
    forma: str
    valor: Decimal
    usuario: str | None
    ordem: int | None = None
    venda: int | None = None
    conta: int | None = None
    movimento: int | None = None


def _nome(usuario: Usuario | None) -> str | None:
    return usuario.nome_de_exibicao if usuario is not None else None


def _momento(movimento: Movimento) -> float:
    return movimento.momento.timestamp() if movimento.momento else float("inf")


# Cada coisa que mexeu no caixa no dia, da mais antiga para a mais recente. A conta paga só tem o
# dia, e fica no fim.
def movimentos_do_dia(loja: Loja, dia: date) -> list[Movimento]:
    periodo = Periodo(dia, dia)
    lista: list[Movimento] = []

    pagamentos = (
        Pagamento.objects.filter(ordem__loja=loja)
        .filter(periodo.filtro("recebido_em"))
        .select_related("ordem__cliente", "registrado_por")
    )
    for pagamento in pagamentos:
        lista.append(
            Movimento(
                momento=pagamento.recebido_em,
                tipo="ordem",
                descricao=f"OS #{pagamento.ordem.numero} · {pagamento.ordem.cliente.nome}",
                forma=pagamento.forma,
                valor=pagamento.valor,
                usuario=_nome(pagamento.registrado_por),
                ordem=pagamento.ordem_id,
            )
        )

    vendas = PagamentoDaVenda.objects.filter(venda__loja=loja).select_related(
        "venda__vendida_por", "venda__desfeita_por"
    )
    for da_venda in vendas.filter(periodo.filtro("venda__criado_em")):
        lista.append(
            Movimento(
                momento=da_venda.venda.criado_em,
                tipo="venda",
                descricao=f"Venda #{da_venda.venda.numero}",
                forma=da_venda.forma,
                valor=da_venda.valor,
                usuario=_nome(da_venda.venda.vendida_por),
                venda=da_venda.venda_id,
            )
        )
    for devolvido in vendas.filter(periodo.filtro("venda__desfeita_em")):
        lista.append(
            Movimento(
                momento=devolvido.venda.desfeita_em,
                tipo="venda_desfeita",
                descricao=f"Venda #{devolvido.venda.numero} desfeita",
                forma=devolvido.forma,
                valor=-devolvido.valor,
                usuario=_nome(devolvido.venda.desfeita_por),
                venda=devolvido.venda_id,
            )
        )

    retiradas_e_reforcos = (
        MovimentoDoCaixa.objects.filter(loja=loja)
        .filter(periodo.filtro("criado_em"))
        .select_related("registrado_por")
    )
    for movimento in retiradas_e_reforcos:
        retirada = movimento.tipo == TipoDeMovimentoDoCaixa.RETIRADA
        lista.append(
            Movimento(
                momento=movimento.criado_em,
                tipo=movimento.tipo,
                descricao=movimento.motivo or movimento.get_tipo_display(),
                forma=DINHEIRO,
                valor=-movimento.valor if retirada else movimento.valor,
                usuario=_nome(movimento.registrado_por),
                movimento=movimento.pk,
            )
        )

    contas = ContaAPagar.objects.filter(contas_da_loja(loja), paga_em=dia).select_related(
        "paga_por"
    )
    for conta in contas.order_by("pk"):
        lista.append(
            Movimento(
                momento=None,
                tipo="conta",
                descricao=conta.descricao,
                forma=conta.forma,
                valor=-conta.valor,
                usuario=_nome(conta.paga_por),
                conta=conta.pk,
            )
        )
    return sorted(lista, key=_momento)


def _texto(valor: Decimal | None) -> str | None:
    return None if valor is None else str(valor)


# O resumo de um dia para o dono: o que entrou e saiu em cada forma, a gaveta e o que devia haver
# nela. Depois de uma conferência no dia, o que devia haver parte do que ficou na gaveta.
def resumo_do_dia(loja: Loja, dia: date) -> dict[str, Any]:
    do_dia = fluxo(loja, dia, dia)
    comeco = comeco_do_dia(loja, dia)
    conferencias = list(
        ConferenciaDoCaixa.objects.filter(loja=loja, dia=dia)
        .select_related("conferida_por")
        .order_by("criado_em", "pk")
    )

    depois_da_conferencia: Decimal | None = None
    deve_ter: Decimal | None = None
    if conferencias:
        ultima = conferencias[-1]
        depois_da_conferencia = do_dia.em_dinheiro - ultima.movimento_do_dia
        deve_ter = ultima.na_gaveta + depois_da_conferencia
    elif comeco is not None:
        deve_ter = comeco + do_dia.em_dinheiro

    return {
        "gaveta": {
            "comeco": _texto(comeco),
            "entrou": str(do_dia.entrou.get(DINHEIRO, ZERO)),
            "saiu": str(do_dia.saiu.get(DINHEIRO, ZERO)),
            "retiradas": str(do_dia.retiradas),
            "reforcos": str(do_dia.reforcos),
            "depois_da_conferencia": _texto(depois_da_conferencia),
            "deve_ter": _texto(deve_ter),
        },
        "por_forma": [
            {
                "forma": forma.value,
                "rotulo": forma.label,
                "entrou": str(do_dia.entrou.get(forma.value, ZERO)),
                "saiu": str(do_dia.saiu.get(forma.value, ZERO)),
            }
            for forma in FormaDePagamentoDaConta
        ],
        "conferencias": conferencias,
        "movimentos": movimentos_do_dia(loja, dia),
    }
