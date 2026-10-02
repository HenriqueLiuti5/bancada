from datetime import timedelta
from typing import Any

from django.db import migrations
from django.utils import timezone

DIAS_DE_TESTE = 30


def abrir_testes(apps: Any, schema_editor: Any) -> None:
    Tenant = apps.get_model("tenants", "Tenant")
    Assinatura = apps.get_model("assinaturas", "Assinatura")
    fim_do_teste = timezone.localdate() + timedelta(days=DIAS_DE_TESTE)

    for tenant in Tenant.objects.filter(assinatura__isnull=True):
        Assinatura.objects.create(tenant=tenant, teste_termina_em=fim_do_teste)


class Migration(migrations.Migration):
    dependencies = [
        ("assinaturas", "0002_assinaturas_no_isolamento"),
        ("tenants", "0004_orientacao_ao_usuario"),
    ]

    operations = [
        migrations.RunPython(abrir_testes, migrations.RunPython.noop),
    ]
