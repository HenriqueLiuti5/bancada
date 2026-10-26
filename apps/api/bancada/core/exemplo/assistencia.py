from dataclasses import dataclass
from datetime import date

from bancada.core.exemplo.agenda import Agenda
from bancada.tenants.models import Loja, Tenant, Usuario


@dataclass
class Assistencia:
    tenant: Tenant
    matriz: Loja
    filial: Loja
    dono: Usuario
    tecnica: Usuario
    atendente: Usuario
    agenda: Agenda
    hoje: date

    @property
    def lojas(self) -> list[Loja]:
        return [self.matriz, self.filial]

    def outra(self, loja: Loja) -> Loja:
        return self.filial if loja.pk == self.matriz.pk else self.matriz

    # Na Matriz, quem atende o balcão é a Carla; na Filial, a Joana.
    def no_balcao(self, loja: Loja) -> Usuario:
        return self.atendente if loja.pk == self.matriz.pk else self.tecnica
