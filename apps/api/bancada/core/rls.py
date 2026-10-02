from django.db import connection

VARIAVEL = "bancada.tenant_id"


def aplicar_tenant(tenant_id: int | None) -> None:
    valor = "" if tenant_id is None else str(tenant_id)
    with connection.cursor() as cursor:
        cursor.execute("SELECT set_config(%s, %s, true)", [VARIAVEL, valor])


def tenant_aplicado() -> str | None:
    with connection.cursor() as cursor:
        cursor.execute("SELECT current_setting(%s, true)", [VARIAVEL])
        valor = cursor.fetchone()[0]
    return valor or None


def ver_todas_as_assistencias() -> None:
    aplicar_tenant(None)
