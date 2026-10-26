import random
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from functools import partial

from django.utils import timezone

from bancada.core.exemplo.agenda import Agenda, a_qualquer_hora, aberta, fechamento, no_horario
from bancada.core.exemplo.assistencia import Assistencia
from bancada.core.exemplo.baralho import Baralho
from bancada.core.exemplo.contas import Contas
from bancada.core.exemplo.estoque import Balcao, Estoque
from bancada.core.exemplo.gaveta import Gaveta
from bancada.core.exemplo.oficina import Oficina
from bancada.estoque.models import Venda
from bancada.financeiro.models import ConferenciaDoCaixa, ContaAPagar
from bancada.ordens.models import OrdemServico
from bancada.ordens.painel.lucro import MESES_NO_GRAFICO
from bancada.tenants.models import Loja, Tenant, Usuario

SEMENTE = 2026
EQUIPE = ["marcos", "joana", "carla"]

# A história começa duas semanas antes do primeiro mês do gráfico, para ele já ter ordens chegando
# ao fim e sendo pagas.
ANTES_DO_PRIMEIRO_MES = timedelta(days=14)

# Quantas ordens chegam e quantas vendas saem por dia. A Matriz tem mais movimento que a Filial, e o
# sábado, só de manhã, tem menos que os outros dias.
ORDENS_NA_MATRIZ = [1, 2, 2, 2, 3]
ORDENS_NA_FILIAL = [1, 1, 1, 2]
VENDAS_NA_MATRIZ = [1, 2, 2, 3]
VENDAS_NA_FILIAL = [0, 1, 1, 2]
NO_SABADO = [0, 1, 1, 2]

# Contados a partir do primeiro mês do gráfico: o terceiro é o das ferramentas novas, o único no
# prejuízo.
MES_DAS_FERRAMENTAS = 2
MES_DO_AR_CONDICIONADO = 4


class EquipeIncompleta(Exception):
    pass


@dataclass(frozen=True)
class Resumo:
    inicio: date
    ordens: int
    vendas: int
    contas: int
    conferencias: int


def primeiro_mes_do_grafico(hoje: date, meses: int) -> date:
    primeiro = hoje.replace(day=1)
    for _ in range(meses - 1):
        primeiro = (primeiro - timedelta(days=1)).replace(day=1)
    return primeiro


def no_dia_util(dia: date, dia_do_mes: int) -> bool:
    alvo = dia.replace(day=dia_do_mes)
    while not aberta(alvo):
        alvo += timedelta(days=1)
    return alvo == dia


def _lojas(tenant: Tenant, antes: datetime) -> tuple[Loja, Loja]:
    matriz = (
        Loja.objects.filter(tenant=tenant, nome="Matriz").first()
        or Loja.objects.filter(tenant=tenant).order_by("criado_em", "pk").first()
    )
    if matriz is None:
        raise EquipeIncompleta
    filial, _ = Loja.objects.get_or_create(
        tenant=tenant,
        nome="Filial Centro",
        defaults={"telefone": "1133335555", "endereco": "Av. Brasil, 2000"},
    )
    # As duas lojas já existiam quando a história começa, e a Matriz é a mais antiga.
    Loja.objects.filter(pk=matriz.pk, criado_em__gt=antes).update(
        criado_em=antes - timedelta(days=30)
    )
    Loja.objects.filter(pk=filial.pk, criado_em__gt=antes).update(criado_em=antes)
    return matriz, filial


@dataclass
class Movimento:
    loja: Loja
    ordens: Baralho[int]
    vendas: Baralho[int]


class Simulacao:
    def __init__(self, tenant: Tenant, agora: datetime, meses: int) -> None:
        hoje = timezone.localdate(agora)
        self.primeiro_mes = primeiro_mes_do_grafico(hoje, meses)
        self.inicio = self.primeiro_mes - ANTES_DO_PRIMEIRO_MES
        matriz, filial = _lojas(tenant, no_horario(self.inicio, time(8)) - timedelta(days=1))
        equipe = {u.username: u for u in Usuario.objects.filter(tenant=tenant, username__in=EQUIPE)}
        if len(equipe) < len(EQUIPE):
            raise EquipeIncompleta

        self.assistencia = Assistencia(
            tenant=tenant,
            matriz=matriz,
            filial=filial,
            dono=equipe["marcos"],
            tecnica=equipe["joana"],
            atendente=equipe["carla"],
            agenda=Agenda(agora),
            hoje=hoje,
        )
        self.estoque = Estoque(self.assistencia)
        self.balcao = Balcao(self.assistencia, self.estoque)
        self.oficina = Oficina(self.assistencia, self.estoque)
        self.contas = Contas(self.assistencia)
        self.gaveta = Gaveta(self.assistencia)

        self.movimento = [
            Movimento(matriz, Baralho(ORDENS_NA_MATRIZ), Baralho(VENDAS_NA_MATRIZ)),
            Movimento(filial, Baralho(ORDENS_NA_FILIAL), Baralho(VENDAS_NA_FILIAL)),
        ]
        self.no_sabado = Baralho(NO_SABADO)
        # A compra da semana cai três dias antes do dia da semana de hoje, para a lista Para repor
        # de exemplo ter o que acabou desde a última compra.
        self.dia_da_compra = (hoje.weekday() - 3) % 7
        if not aberta(hoje - timedelta(days=3)):
            self.dia_da_compra = 5

    def rodar(self) -> Resumo:
        assistencia = self.assistencia
        tenant = assistencia.tenant
        antes_de_abrir = no_horario(self.inicio, time(8))
        self.estoque.cadastrar(antes_de_abrir)
        self.contas.combinar_as_fixas(antes_de_abrir)

        primeiro_dia = self.inicio
        while not aberta(primeiro_dia):
            primeiro_dia += timedelta(days=1)
        for posicao, ordem in enumerate(
            OrdemServico.objects.filter(tenant=tenant).order_by("numero")
        ):
            chegada = no_horario(primeiro_dia, time(9, 20)) + timedelta(minutes=25 * posicao)
            self.oficina.continuar(ordem, chegada)

        dia = self.inicio
        while dia <= assistencia.hoje:
            assistencia.agenda.marcar(no_horario(dia, time(0, 1)), self._planejar)
            dia += timedelta(days=1)
        assistencia.agenda.cumprir()
        self.contas.esquecer_uma()

        return Resumo(
            inicio=self.inicio,
            ordens=OrdemServico.objects.filter(tenant=tenant).count(),
            vendas=Venda.objects.filter(tenant=tenant).count(),
            contas=ContaAPagar.objects.filter(tenant=tenant).count(),
            conferencias=ConferenciaDoCaixa.objects.filter(tenant=tenant).count(),
        )

    def _planejar(self, momento: datetime) -> None:
        dia = timezone.localdate(momento)
        marcar = self.assistencia.agenda.marcar
        marcar(no_horario(dia, time(5)), self.contas.criar_as_do_mes)
        if not aberta(dia):
            return

        marcar(a_qualquer_hora(dia, time(9, 30), time(11)), self.contas.pagar_as_que_vencem)
        marcar(no_horario(dia, time(10, 30)), self.estoque.comprar_o_que_falta)
        if dia.weekday() == self.dia_da_compra:
            marcar(no_horario(dia, time(10, 45)), self.estoque.repor)
        self._contas_do_mes(dia)

        segunda, sabado = dia.weekday() == 0, dia.weekday() == 5
        for movimento in self.movimento:
            loja = movimento.loja
            ordens = self.no_sabado.tirar() if sabado else movimento.ordens.tirar()
            for _ in range(ordens):
                marcar(a_qualquer_hora(dia), partial(self.oficina.abrir, loja))
            vendas = self.no_sabado.tirar() if sabado else movimento.vendas.tirar()
            for _ in range(vendas):
                marcar(a_qualquer_hora(dia), partial(self.balcao.vender, loja))
            if random.random() < 0.2:
                marcar(a_qualquer_hora(dia), partial(self.contas.motoboy, loja))
            if random.random() < 0.03:
                marcar(a_qualquer_hora(dia), partial(self.estoque.corrigir_uma_pelicula, loja))

            if segunda:
                if random.random() < 0.3:
                    marcar(no_horario(dia, time(9, 5)), partial(self.gaveta.reforcar, loja))
                if dia.day <= 7 or 15 <= dia.day <= 21:
                    marcar(a_qualquer_hora(dia), partial(self.contas.limpeza, loja))
            if not sabado:
                marcar(no_horario(dia, time(14, 30)), partial(self.gaveta.guardar_no_cofre, loja))

            # Num dia ou outro ninguém conta a gaveta; na última semana, ela é contada todo dia.
            if dia > self.assistencia.hoje - timedelta(days=7) or random.random() > 0.08:
                contagem = fechamento(dia) - timedelta(minutes=random.randint(0, 25))
                marcar(contagem, partial(self.gaveta.conferir, loja))

    def _contas_do_mes(self, dia: date) -> None:
        marcar = self.assistencia.agenda.marcar
        mes = (dia.year - self.primeiro_mes.year) * 12 + dia.month - self.primeiro_mes.month
        if no_dia_util(dia, 2):
            marcar(no_horario(dia, time(10, 15)), self.contas.taxa_das_maquininhas)
        if no_dia_util(dia, 3):
            marcar(no_horario(dia, time(11)), self.contas.luz)
        if no_dia_util(dia, 6):
            marcar(no_horario(dia, time(16)), self.contas.propaganda)
        if no_dia_util(dia, 8):
            marcar(no_horario(dia, time(11, 30)), self.contas.agua)
            if mes == MES_DAS_FERRAMENTAS:
                marcar(no_horario(dia, time(15, 30)), self.contas.ferramentas)
        if no_dia_util(dia, 12):
            marcar(no_horario(dia, time(15)), self.contas.imposto)
        if mes == MES_DO_AR_CONDICIONADO and no_dia_util(dia, 14):
            marcar(no_horario(dia, time(14)), self.contas.ar_condicionado)


# Seis meses de uma assistência com duas lojas, o mesmo que o gráfico do lucro mostra no painel.
def simular(tenant: Tenant, agora: datetime, meses: int = MESES_NO_GRAFICO) -> Resumo:
    random.seed(SEMENTE)
    with timezone.override(tenant.fuso_horario):
        return Simulacao(tenant, agora, meses).rodar()
