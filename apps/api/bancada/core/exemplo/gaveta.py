import random
from datetime import datetime, timedelta
from decimal import Decimal

from django.utils import timezone

from bancada.core.exemplo.agenda import datar
from bancada.core.exemplo.assistencia import Assistencia
from bancada.financeiro import caixa
from bancada.financeiro.models import ConferenciaDoCaixa, MovimentoDoCaixa, TipoDeMovimentoDoCaixa
from bancada.tenants.models import Loja

ZERO = Decimal("0.00")
# O troco que fica na gaveta para o dia seguinte; o resto vai para o cofre.
TROCO = Decimal("200.00")
LIMITE_NA_GAVETA = Decimal("700.00")
DIFERENCAS = [
    Decimal("-20"),
    Decimal("-10"),
    Decimal("-5"),
    Decimal("-2"),
    Decimal("2"),
    Decimal("5"),
]


class Gaveta:
    def __init__(self, assistencia: Assistencia) -> None:
        self.assistencia = assistencia

    def _registrar(
        self, loja: Loja, tipo: str, valor: Decimal, motivo: str, momento: datetime
    ) -> None:
        movimento = MovimentoDoCaixa.objects.create(
            tenant=self.assistencia.tenant,
            loja=loja,
            tipo=tipo,
            valor=valor,
            motivo=motivo,
            registrado_por=self.assistencia.no_balcao(loja),
        )
        datar(MovimentoDoCaixa.objects.filter(pk=movimento.pk), momento)

    # Às vezes a semana começa com moedas e notas trocadas no banco.
    def reforcar(self, loja: Loja, momento: datetime) -> None:
        valor = Decimal(random.choice([50, 100]))
        self._registrar(
            loja, TipoDeMovimentoDoCaixa.REFORCO, valor, "Troco trazido do banco", momento
        )

    # Quando o dinheiro junta na gaveta no meio do dia, parte dele vai para o cofre.
    def guardar_no_cofre(self, loja: Loja, momento: datetime) -> None:
        ultima = ConferenciaDoCaixa.ultima(loja)
        if ultima is None:
            return
        if caixa.na_gaveta_depois(ultima, timezone.localdate(momento)) > LIMITE_NA_GAVETA:
            self._registrar(
                loja,
                TipoDeMovimentoDoCaixa.RETIRADA,
                Decimal("400.00"),
                "Levado para o cofre",
                momento,
            )

    # A contagem do fim do dia. Quem conta não vê quanto devia ter; de vez em quando falta ou sobra
    # um pouco, mas as contagens dos últimos dias batem, para o painel de exemplo mostrar o caixa
    # conferido.
    def conferir(self, loja: Loja, momento: datetime) -> None:
        dia = timezone.localdate(momento)
        ultima = ConferenciaDoCaixa.ultima(loja)
        if ultima is None:
            contado, retirado = TROCO, ZERO
        else:
            esperado = caixa.na_gaveta_depois(ultima, dia)
            perto_de_hoje = dia >= self.assistencia.hoje - timedelta(days=3)
            diferenca = (
                ZERO if perto_de_hoje or random.random() < 0.85 else random.choice(DIFERENCAS)
            )
            contado = max(esperado + diferenca, ZERO)
            retirado = contado - TROCO if contado > TROCO + 100 else ZERO

        conferencia = caixa.conferir(
            loja,
            contado=contado,
            retirado=retirado,
            observacao="",
            usuario=self.assistencia.no_balcao(loja),
            hoje=dia,
        )
        datar(ConferenciaDoCaixa.objects.filter(pk=conferencia.pk), momento)
