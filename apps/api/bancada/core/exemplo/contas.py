import random
from datetime import date, datetime, time, timedelta
from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone

from bancada.core.exemplo.agenda import aberta, datar, no_horario
from bancada.core.exemplo.assistencia import Assistencia
from bancada.core.exemplo.catalogo import CONTAS_FIXAS
from bancada.estoque.models import Venda
from bancada.financeiro.models import (
    CategoriaDaConta,
    ContaAPagar,
    ContaFixa,
    FormaDePagamentoDaConta,
    PagamentoDaConta,
    no_dia,
    no_mes_seguinte,
)
from bancada.ordens.models import FormaDePagamento, OrdemServico
from bancada.ordens.painel import dinheiro
from bancada.ordens.painel.periodo import Periodo
from bancada.tenants.models import Loja, Usuario

FORMA = FormaDePagamentoDaConta
# O Simples Nacional de uma assistência pequena e a taxa média das maquininhas.
ALIQUOTA_DO_SIMPLES = Decimal("0.06")
TAXA_DO_CARTAO = Decimal("0.025")
CENTAVO = Decimal("0.01")


def primeiro_dia_aberto_a_partir(dia: date) -> date:
    while not aberta(dia):
        dia += timedelta(days=1)
    return dia


class Contas:
    def __init__(self, assistencia: Assistencia) -> None:
        self.assistencia = assistencia
        self._forma_da_fixa: dict[int, str] = {}
        self._forma_da_conta: dict[int, str] = {}

    def _lancar(
        self,
        momento: datetime,
        descricao: str,
        categoria: str,
        valor: Decimal,
        vencimento: date,
        forma: str,
        loja: Loja | None = None,
        fornecedor: str = "",
        paga: bool = False,
        quem: Usuario | None = None,
    ) -> ContaAPagar:
        dia = timezone.localdate(momento)
        conta = ContaAPagar.lancar(
            tenant=self.assistencia.tenant,
            descricao=descricao,
            categoria=categoria,
            fornecedor=fornecedor,
            valor=valor.quantize(CENTAVO),
            vencimento=vencimento,
            hoje=dia,
            loja=loja,
            pagamento=PagamentoDaConta(dia, forma) if paga else None,
            usuario=quem or self.assistencia.dono,
        )
        self._forma_da_conta[conta.pk] = forma
        datar(ContaAPagar.objects.filter(pk=conta.pk), momento)
        return conta

    # O aluguel, os salários, o contador e a internet já se repetiam todo mês quando a história
    # começa. As contas de cada mês nascem um mês antes de vencer, como faz a tarefa diária.
    def combinar_as_fixas(self, momento: datetime) -> None:
        dia = timezone.localdate(momento)
        for modelo in CONTAS_FIXAS:
            vencimento = no_dia(dia.year, dia.month, modelo.dia)
            if vencimento < dia:
                vencimento = no_mes_seguinte(vencimento, modelo.dia)
            loja = None
            if modelo.na_filial is not None:
                loja = self.assistencia.filial if modelo.na_filial else self.assistencia.matriz
            conta = ContaAPagar.lancar(
                tenant=self.assistencia.tenant,
                descricao=modelo.descricao,
                categoria=modelo.categoria,
                fornecedor=modelo.fornecedor,
                valor=modelo.valor,
                vencimento=vencimento,
                hoje=dia,
                loja=loja,
                repetir=True,
                usuario=self.assistencia.dono,
            )
            if conta.conta_fixa_id is not None:
                self._forma_da_fixa[conta.conta_fixa_id] = modelo.forma
        fixas = list(self._forma_da_fixa)
        datar(ContaAPagar.objects.filter(conta_fixa_id__in=fixas), momento)
        datar(ContaFixa.objects.filter(pk__in=fixas), momento)

    def criar_as_do_mes(self, momento: datetime) -> None:
        dia = timezone.localdate(momento)
        for fixa in ContaFixa.objects.filter(tenant=self.assistencia.tenant, ativa=True):
            novas = fixa.criar_as_proximas(dia)
            datar(ContaAPagar.objects.filter(pk__in=[conta.pk for conta in novas]), momento)

    def _forma(self, conta: ContaAPagar) -> str:
        if conta.conta_fixa_id is not None:
            return self._forma_da_fixa.get(conta.conta_fixa_id, FORMA.BOLETO)
        return self._forma_da_conta.get(conta.pk, FORMA.BOLETO)

    # O dono paga de manhã o que vence no dia e o que venceu no domingo.
    def pagar_as_que_vencem(self, momento: datetime) -> None:
        dia = timezone.localdate(momento)
        vencidas = ContaAPagar.objects.filter(
            tenant=self.assistencia.tenant, paga_em__isnull=True, vencimento__lte=dia
        )
        for conta in vencidas.order_by("vencimento", "pk"):
            conta.pagar(PagamentoDaConta(dia, self._forma(conta)), usuario=self.assistencia.dono)

    def _recebido_no_mes_anterior(self, dia: date, so_cartao: bool = False) -> Decimal:
        fim = dia.replace(day=1) - timedelta(days=1)
        periodo = Periodo(fim.replace(day=1), fim)
        ordens = OrdemServico.objects.filter(tenant=self.assistencia.tenant)
        vendas = Venda.objects.filter(tenant=self.assistencia.tenant)
        das_ordens = dinheiro.pagamentos(ordens, periodo)
        do_balcao = dinheiro.pagamentos_do_balcao(vendas, periodo)
        if so_cartao:
            cartoes = [FormaDePagamento.DEBITO, FormaDePagamento.CREDITO]
            das_ordens = das_ordens.filter(forma__in=cartoes)
            do_balcao = do_balcao.filter(forma__in=cartoes)
        das_ordens_no_mes = das_ordens.aggregate(total=Sum("valor"))["total"]
        do_balcao_no_mes = do_balcao.aggregate(total=Sum("valor"))["total"]
        return (das_ordens_no_mes or Decimal("0")) + (do_balcao_no_mes or Decimal("0"))

    # As contas de valor que muda chegam uma de cada vez, e o dono as paga no vencimento. O
    # imposto e a taxa das maquininhas saem do que entrou no mês anterior.
    def luz(self, momento: datetime) -> None:
        dia = timezone.localdate(momento)
        vencimento = no_dia(dia.year, dia.month, 12)
        for loja, minimo, maximo in (
            (self.assistencia.matriz, 240, 360),
            (self.assistencia.filial, 160, 240),
        ):
            self._lancar(
                momento,
                f"Conta de luz da {loja.nome}",
                CategoriaDaConta.CONTAS_DA_LOJA,
                Decimal(random.randint(minimo * 100, maximo * 100)) / 100,
                vencimento,
                FORMA.BOLETO,
                loja=loja,
                quem=self.assistencia.atendente,
            )

    def agua(self, momento: datetime) -> None:
        dia = timezone.localdate(momento)
        self._lancar(
            momento,
            "Conta de água da Matriz",
            CategoriaDaConta.CONTAS_DA_LOJA,
            Decimal(random.randint(6000, 9500)) / 100,
            no_dia(dia.year, dia.month, 18),
            FORMA.PIX,
            loja=self.assistencia.matriz,
            quem=self.assistencia.atendente,
        )

    def imposto(self, momento: datetime) -> None:
        dia = timezone.localdate(momento)
        base = self._recebido_no_mes_anterior(dia) or Decimal("16000")
        self._lancar(
            momento,
            "Simples Nacional (DAS)",
            CategoriaDaConta.IMPOSTOS,
            base * ALIQUOTA_DO_SIMPLES,
            no_dia(dia.year, dia.month, 20),
            FORMA.BOLETO,
            fornecedor="Receita Federal",
        )

    def taxa_das_maquininhas(self, momento: datetime) -> None:
        dia = timezone.localdate(momento)
        base = self._recebido_no_mes_anterior(dia, so_cartao=True) or Decimal("5000")
        self._lancar(
            momento,
            "Taxas das maquininhas",
            CategoriaDaConta.TARIFAS,
            base * TAXA_DO_CARTAO,
            dia,
            FORMA.DEBITO,
            paga=True,
        )

    def propaganda(self, momento: datetime) -> None:
        self._lancar(
            momento,
            "Anúncios nas redes sociais",
            CategoriaDaConta.PROPAGANDA,
            Decimal(random.randint(15, 30) * 10),
            timezone.localdate(momento),
            FORMA.CREDITO,
            paga=True,
        )

    # O motoboy e o material de limpeza saem do dinheiro da gaveta da loja, na hora.
    def motoboy(self, loja: Loja, momento: datetime) -> None:
        self._lancar(
            momento,
            random.choice(["Motoboy para buscar peça", "Motoboy para entregar aparelho"]),
            CategoriaDaConta.TRANSPORTE,
            Decimal(random.choice([15, 18, 20, 25, 30, 35])),
            timezone.localdate(momento),
            FORMA.DINHEIRO,
            loja=loja,
            paga=True,
            quem=self.assistencia.no_balcao(loja),
        )

    def limpeza(self, loja: Loja, momento: datetime) -> None:
        self._lancar(
            momento,
            "Material de limpeza",
            CategoriaDaConta.MANUTENCAO,
            Decimal(random.randint(35, 80)),
            timezone.localdate(momento),
            FORMA.DINHEIRO,
            loja=loja,
            paga=True,
            quem=self.assistencia.no_balcao(loja),
        )

    # O mês das ferramentas novas: a compra grande deixa o mês no prejuízo.
    def ferramentas(self, momento: datetime) -> None:
        dia = timezone.localdate(momento)
        for descricao, valor, forma in (
            ("Estação de retrabalho", Decimal("4290.00"), FORMA.PIX),
            ("Microscópio trinocular", Decimal("4580.00"), FORMA.CREDITO),
            ("Separadora de telas", Decimal("1890.00"), FORMA.CREDITO),
        ):
            self._lancar(
                momento,
                descricao,
                CategoriaDaConta.FERRAMENTAS,
                valor,
                dia,
                forma,
                loja=self.assistencia.matriz,
                fornecedor="Loja do Técnico",
                paga=True,
            )

    def ar_condicionado(self, momento: datetime) -> None:
        dia = timezone.localdate(momento)
        self._lancar(
            momento,
            "Manutenção do ar-condicionado",
            CategoriaDaConta.MANUTENCAO,
            Decimal("380.00"),
            dia + timedelta(days=10),
            FORMA.BOLETO,
            loja=self.assistencia.matriz,
            fornecedor="Clima Frio Refrigeração",
            quem=self.assistencia.atendente,
        )

    # Uma conta que o dono esqueceu de pagar, vencida há poucos dias.
    def esquecer_uma(self) -> None:
        hoje = self.assistencia.hoje
        vencimento = hoje - timedelta(days=3)
        self._lancar(
            no_horario(primeiro_dia_aberto_a_partir(vencimento - timedelta(days=8)), time(15)),
            "Troca da fechadura da porta",
            CategoriaDaConta.MANUTENCAO,
            Decimal("180.00"),
            vencimento,
            FORMA.PIX,
            loja=self.assistencia.filial,
            fornecedor="Chaveiro Rápido",
            quem=self.assistencia.tecnica,
        )
