from django.contrib import admin

from bancada.financeiro.models import ContaAPagar, ContaFixa


@admin.register(ContaAPagar)
class ContaAPagarAdmin(admin.ModelAdmin):
    list_display = ["descricao", "categoria", "valor", "vencimento", "paga_em", "forma", "tenant"]
    list_select_related = ["tenant"]
    list_filter = ["tenant", "categoria", "forma"]
    search_fields = ["descricao", "fornecedor"]
    readonly_fields = ["conta_fixa", "lancada_por", "paga_por", "criado_em"]


@admin.register(ContaFixa)
class ContaFixaAdmin(admin.ModelAdmin):
    list_display = [
        "descricao",
        "categoria",
        "valor",
        "dia",
        "ativa",
        "ultimo_vencimento",
        "tenant",
    ]
    list_select_related = ["tenant"]
    list_filter = ["tenant", "ativa"]
    search_fields = ["descricao", "fornecedor"]
    readonly_fields = ["ultimo_vencimento", "criada_por", "criado_em"]
