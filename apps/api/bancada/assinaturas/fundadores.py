from django.db import connection

from bancada.assinaturas.models import VAGAS_DE_FUNDADOR, VagaDeFundador
from bancada.tenants.models import Tenant

# Só para mostrar: os preços com desconto ficam escritos em PLANOS.
DESCONTO_DE_FUNDADOR = 30


def vagas_restantes() -> int:
    return max(VAGAS_DE_FUNDADOR - VagaDeFundador.objects.count(), 0)


def ganha_preco_de_fundador(tenant: Tenant) -> bool:
    return vagas_restantes() > 0 and not VagaDeFundador.objects.filter(tenant=tenant).exists()


def situacao_dos_fundadores() -> dict[str, int]:
    return {
        "vagas": VAGAS_DE_FUNDADOR,
        "restantes": vagas_restantes(),
        "desconto": DESCONTO_DE_FUNDADOR,
    }


def ocupar_vaga(tenant: Tenant) -> bool:
    # A trava, até o fim da transação, faz uma assinatura de cada vez contar e ocupar as vagas,
    # para duas assistências não levarem a última juntas. Quem só consulta as vagas não espera.
    with connection.cursor() as cursor:
        cursor.execute(f"LOCK TABLE {VagaDeFundador._meta.db_table} IN SHARE ROW EXCLUSIVE MODE")

    if not ganha_preco_de_fundador(tenant):
        return False
    VagaDeFundador.objects.create(numero=VagaDeFundador.objects.count() + 1, tenant=tenant)
    return True
