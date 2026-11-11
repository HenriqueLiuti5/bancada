import calendar
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta

from django.db.models import Q
from django.utils import timezone

HOJE = "hoje"
SETE_DIAS = "7dias"
MES = "mes"
PERSONALIZADO = "personalizado"

CHAVES = [HOJE, SETE_DIAS, MES, PERSONALIZADO]
CHAVE_PADRAO = MES
DIAS_NO_MAXIMO = 366


def inicio_do_dia(dia: date) -> datetime:
    return timezone.make_aware(datetime.combine(dia, time.min))


@dataclass(frozen=True)
class Periodo:
    inicio: date
    fim: date

    @property
    def dias(self) -> int:
        return (self.fim - self.inicio).days + 1

    @property
    def desde(self) -> datetime:
        return inicio_do_dia(self.inicio)

    @property
    def ate(self) -> datetime:
        return inicio_do_dia(self.fim + timedelta(days=1))

    def filtro(self, campo: str) -> Q:
        return Q(**{f"{campo}__gte": self.desde, f"{campo}__lt": self.ate})

    def em_texto(self) -> dict[str, str]:
        return {"inicio": self.inicio.isoformat(), "fim": self.fim.isoformat()}


def pedido(chave: str, hoje: date, de: date | None = None, ate: date | None = None) -> Periodo:
    if chave == HOJE:
        return Periodo(hoje, hoje)
    if chave == SETE_DIAS:
        return Periodo(hoje - timedelta(days=6), hoje)
    if chave == PERSONALIZADO and de is not None and ate is not None:
        return Periodo(de, ate)
    return Periodo(hoje.replace(day=1), hoje)


def _mesmo_trecho_do_mes_anterior(periodo: Periodo) -> Periodo:
    ultimo_do_anterior = periodo.inicio - timedelta(days=1)
    primeiro_do_anterior = ultimo_do_anterior.replace(day=1)
    dias_no_mes = calendar.monthrange(ultimo_do_anterior.year, ultimo_do_anterior.month)[1]
    dia_final = min(periodo.fim.day, dias_no_mes)
    return Periodo(primeiro_do_anterior, primeiro_do_anterior.replace(day=dia_final))


def anterior(chave: str, periodo: Periodo) -> Periodo:
    if chave == MES:
        return _mesmo_trecho_do_mes_anterior(periodo)
    deslocamento = timedelta(days=periodo.dias)
    return Periodo(periodo.inicio - deslocamento, periodo.fim - deslocamento)
