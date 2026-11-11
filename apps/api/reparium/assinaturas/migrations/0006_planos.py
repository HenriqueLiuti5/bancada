from typing import Any

from django.db import migrations, models


def assinaturas_de_antes_no_equipe(apps: Any, schema_editor: Any) -> None:
    # O preço único de antes, R$ 59,90 por mês com quantas pessoas a loja quisesse, é o Equipe.
    Assinatura = apps.get_model("assinaturas", "Assinatura")
    Assinatura.objects.filter(valor__isnull=False).update(plano="equipe", ciclo="mensal")


class Migration(migrations.Migration):
    dependencies = [
        ("assinaturas", "0005_aviso_de_exclusao"),
    ]

    operations = [
        migrations.RenameField(
            model_name="assinatura",
            old_name="valor_mensal",
            new_name="valor",
        ),
        migrations.AddField(
            model_name="assinatura",
            name="plano",
            field=models.CharField(
                blank=True,
                choices=[("solo", "Solo"), ("equipe", "Equipe"), ("rede", "Rede")],
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="assinatura",
            name="ciclo",
            field=models.CharField(
                blank=True,
                choices=[("mensal", "Mensal"), ("anual", "Anual")],
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="fatura",
            name="link_da_devolucao",
            field=models.URLField(blank=True, max_length=300),
        ),
        migrations.RunPython(assinaturas_de_antes_no_equipe, migrations.RunPython.noop),
    ]
