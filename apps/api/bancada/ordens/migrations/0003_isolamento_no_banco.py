from django.db import migrations

TABELAS = [
    "clientes_cliente",
    "clientes_aparelho",
    "ordens_ordemservico",
]

CONDICAO = """
    NULLIF(current_setting('bancada.tenant_id', true), '') IS NULL
    OR tenant_id = NULLIF(current_setting('bancada.tenant_id', true), '')::bigint
"""


def ligar(tabela: str) -> str:
    return f"""
        ALTER TABLE {tabela} ENABLE ROW LEVEL SECURITY;
        ALTER TABLE {tabela} FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS isolamento_por_tenant ON {tabela};
        CREATE POLICY isolamento_por_tenant ON {tabela}
            USING ({CONDICAO})
            WITH CHECK ({CONDICAO});
    """


def desligar(tabela: str) -> str:
    return f"""
        DROP POLICY IF EXISTS isolamento_por_tenant ON {tabela};
        ALTER TABLE {tabela} NO FORCE ROW LEVEL SECURITY;
        ALTER TABLE {tabela} DISABLE ROW LEVEL SECURITY;
    """


class Migration(migrations.Migration):
    dependencies = [
        ("ordens", "0002_initial"),
        ("clientes", "0002_initial"),
    ]

    operations = [
        migrations.RunSQL(sql=ligar(tabela), reverse_sql=desligar(tabela)) for tabela in TABELAS
    ]
