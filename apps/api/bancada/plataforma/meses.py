import calendar
import re
from dataclasses import dataclass
from datetime import date

from bancada.ordens.painel.periodo import Periodo

FORMATO = re.compile(r"^(\d{4})-(\d{2})$")


class MesInvalido(ValueError):
    pass


@dataclass(frozen=True, order=True)
class Mes:
    ano: int
    numero: int

    @classmethod
    def de(cls, dia: date) -> "Mes":
        return cls(dia.year, dia.month)

    @classmethod
    def do_texto(cls, texto: str) -> "Mes":
        encontrado = FORMATO.match(texto)
        if encontrado is None:
            raise MesInvalido("Use o formato ano-mês, como 2026-10.")
        ano, numero = int(encontrado[1]), int(encontrado[2])
        if not 1 <= numero <= 12:
            raise MesInvalido("Esse mês não existe.")
        return cls(ano, numero)

    @property
    def inicio(self) -> date:
        return date(self.ano, self.numero, 1)

    @property
    def fim(self) -> date:
        return date(self.ano, self.numero, calendar.monthrange(self.ano, self.numero)[1])

    @property
    def periodo(self) -> Periodo:
        return Periodo(self.inicio, self.fim)

    @property
    def anterior(self) -> "Mes":
        return Mes(self.ano - 1, 12) if self.numero == 1 else Mes(self.ano, self.numero - 1)

    @property
    def seguinte(self) -> "Mes":
        return Mes(self.ano + 1, 1) if self.numero == 12 else Mes(self.ano, self.numero + 1)

    def antes(self, quantidade: int) -> "Mes":
        mes = self
        for _ in range(quantidade):
            mes = mes.anterior
        return mes

    def em_texto(self) -> str:
        return f"{self.ano:04d}-{self.numero:02d}"
