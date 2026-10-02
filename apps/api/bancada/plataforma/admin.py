from django.contrib import admin

from bancada.plataforma.models import Custo


@admin.register(Custo)
class CustoAdmin(admin.ModelAdmin):
    list_display = ["mes", "descricao", "valor", "lancado_por", "criado_em"]
    readonly_fields = ["lancado_por"]
