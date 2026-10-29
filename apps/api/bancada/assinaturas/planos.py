from dataclasses import dataclass
from decimal import Decimal

from django.utils import timezone

from bancada.assinaturas.models import Ciclo, Plano
from bancada.tenants.models import Convite, Loja, Tenant, Usuario

# Todos os recursos estão em todos os planos; o que muda é o tamanho da assistência (ADR 0040).
MESES_PAGOS_NO_ANUAL = 10


@dataclass(frozen=True)
class Tamanho:
    lojas: int
    pessoas: int


@dataclass(frozen=True)
class CondicoesDoPlano:
    plano: Plano
    lojas: int
    pessoas: int | None
    mensal: Decimal

    @property
    def anual(self) -> Decimal:
        return self.mensal * MESES_PAGOS_NO_ANUAL

    def preco(self, ciclo: str) -> Decimal:
        return self.anual if ciclo == Ciclo.ANUAL else self.mensal

    def cabe(self, tamanho: Tamanho) -> bool:
        cabem_as_pessoas = self.pessoas is None or tamanho.pessoas <= self.pessoas
        return tamanho.lojas <= self.lojas and cabem_as_pessoas

    def por_que_nao_cabe(self, tamanho: Tamanho) -> str | None:
        nome = self.plano.label
        if tamanho.lojas > self.lojas:
            limite = "1 loja" if self.lojas == 1 else f"até {self.lojas} lojas"
            return (
                f"A assistência tem {tamanho.lojas} lojas ativas, e o plano {nome} é para {limite}."
            )
        if self.pessoas is not None and tamanho.pessoas > self.pessoas:
            return (
                f"A assistência tem {tamanho.pessoas} pessoas, contando os convites ainda não "
                f"aceitos, e o plano {nome} é para até {self.pessoas}."
            )
        return None


PLANOS: dict[str, CondicoesDoPlano] = {
    Plano.SOLO: CondicoesDoPlano(Plano.SOLO, lojas=1, pessoas=2, mensal=Decimal("39.90")),
    Plano.EQUIPE: CondicoesDoPlano(Plano.EQUIPE, lojas=1, pessoas=None, mensal=Decimal("59.90")),
    Plano.REDE: CondicoesDoPlano(Plano.REDE, lojas=3, pessoas=None, mensal=Decimal("119.90")),
}


def tamanho_da(tenant: Tenant) -> Tamanho:
    pessoas = Usuario.objects.filter(tenant=tenant, is_active=True).count()
    convites = Convite.objects.filter(
        tenant=tenant, aceito_em__isnull=True, expira_em__gt=timezone.now()
    ).count()
    lojas = Loja.objects.filter(tenant=tenant, ativa=True).count()
    return Tamanho(lojas=lojas, pessoas=pessoas + convites)


def plano_que_cabe(tamanho: Tamanho) -> Plano | None:
    return next((condicoes.plano for condicoes in PLANOS.values() if condicoes.cabe(tamanho)), None)


def descricao_da_assinatura(plano: str, ciclo: str) -> str:
    return f"Assinatura {Ciclo(ciclo).label.lower()} do Bancada, plano {Plano(plano).label}"
