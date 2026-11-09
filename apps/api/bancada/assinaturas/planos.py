from dataclasses import dataclass
from decimal import Decimal
from typing import Any

from django.db.models import Count, QuerySet
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
    # Escrito, e não calculado: são 30% menos, arredondados para baixo até os 90 centavos.
    fundador_mensal: Decimal

    @property
    def anual(self) -> Decimal:
        return self.mensal * MESES_PAGOS_NO_ANUAL

    @property
    def fundador_anual(self) -> Decimal:
        return self.fundador_mensal * MESES_PAGOS_NO_ANUAL

    def preco(self, ciclo: str, *, fundador: bool = False) -> Decimal:
        mensal = self.fundador_mensal if fundador else self.mensal
        return mensal * MESES_PAGOS_NO_ANUAL if ciclo == Ciclo.ANUAL else mensal

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
    Plano.SOLO: CondicoesDoPlano(
        Plano.SOLO,
        lojas=1,
        pessoas=2,
        mensal=Decimal("49.90"),
        fundador_mensal=Decimal("34.90"),
    ),
    Plano.EQUIPE: CondicoesDoPlano(
        Plano.EQUIPE,
        lojas=1,
        pessoas=None,
        mensal=Decimal("89.90"),
        fundador_mensal=Decimal("62.90"),
    ),
    Plano.REDE: CondicoesDoPlano(
        Plano.REDE,
        lojas=3,
        pessoas=None,
        mensal=Decimal("179.90"),
        fundador_mensal=Decimal("125.90"),
    ),
}


def _pessoas() -> QuerySet[Usuario]:
    return Usuario.objects.filter(is_active=True)


def _convites_que_valem() -> QuerySet[Convite]:
    return Convite.objects.filter(aceito_em__isnull=True, expira_em__gt=timezone.now())


def _lojas_ativas() -> QuerySet[Loja]:
    return Loja.objects.filter(ativa=True)


def tamanho_da(tenant: Tenant) -> Tamanho:
    pessoas = _pessoas().filter(tenant=tenant).count()
    convites = _convites_que_valem().filter(tenant=tenant).count()
    lojas = _lojas_ativas().filter(tenant=tenant).count()
    return Tamanho(lojas=lojas, pessoas=pessoas + convites)


def _por_assistencia(consulta: QuerySet[Any]) -> dict[int, int]:
    return dict(consulta.order_by().values_list("tenant").annotate(total=Count("id")))


def tamanho_das_assistencias() -> dict[int, Tamanho]:
    pessoas = _por_assistencia(_pessoas().filter(tenant__isnull=False))
    convites = _por_assistencia(_convites_que_valem())
    lojas = _por_assistencia(_lojas_ativas())
    return {
        tenant_id: Tamanho(
            lojas=lojas.get(tenant_id, 0),
            pessoas=pessoas.get(tenant_id, 0) + convites.get(tenant_id, 0),
        )
        for tenant_id in pessoas.keys() | convites.keys() | lojas.keys()
    }


def plano_que_cabe(tamanho: Tamanho) -> Plano | None:
    return next((condicoes.plano for condicoes in PLANOS.values() if condicoes.cabe(tamanho)), None)


def descricao_da_assinatura(plano: str, ciclo: str) -> str:
    return f"Assinatura {Ciclo(ciclo).label.lower()} do Bancada, plano {Plano(plano).label}"
