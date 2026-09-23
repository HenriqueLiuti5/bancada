from django.db import migrations

TABELA = "auditoria_registrodeauditoria"

CONDICAO = """
    NULLIF(current_setting('bancada.tenant_id', true), '') IS NULL
    OR tenant_id = NULLIF(current_setting('bancada.tenant_id', true), '')::bigint
"""

LIGAR = f"""
    ALTER TABLE {TABELA} ENABLE ROW LEVEL SECURITY;
    ALTER TABLE {TABELA} FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS isolamento_por_tenant ON {TABELA};
    CREATE POLICY isolamento_por_tenant ON {TABELA}
        USING ({CONDICAO})
        WITH CHECK ({CONDICAO});
"""

DESLIGAR = f"""
    DROP POLICY IF EXISTS isolamento_por_tenant ON {TABELA};
    ALTER TABLE {TABELA} NO FORCE ROW LEVEL SECURITY;
    ALTER TABLE {TABELA} DISABLE ROW LEVEL SECURITY;
"""


class Migration(migrations.Migration):
    dependencies = [
        ("auditoria", "0001_initial"),
    ]

    operations = [
        migrations.RunSQL(sql=LIGAR, reverse_sql=DESLIGAR),
    ]
