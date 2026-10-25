from django.contrib import admin

from bancada.financeiro.models import (
    ConferenciaDoCaixa,
    ContaAPagar,
    ContaFixa,
    MovimentoDoCaixa,
)


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


@admin.register(MovimentoDoCaixa)
class MovimentoDoCaixaAdmin(admin.ModelAdmin):
    list_display = ["tipo", "valor", "motivo", "loja", "registrado_por", "criado_em", "tenant"]
    list_select_related = ["loja", "registrado_por", "tenant"]
    list_filter = ["tenant", "tipo"]
    readonly_fields = ["registrado_por", "criado_em"]


@admin.register(ConferenciaDoCaixa)
class ConferenciaDoCaixaAdmin(admin.ModelAdmin):
    list_display = ["dia", "loja", "contado", "esperado", "na_gaveta", "conferida_por", "tenant"]
    list_select_related = ["loja", "conferida_por", "tenant"]
    list_filter = ["tenant"]
    readonly_fields = [
        "dia",
        "contado",
        "na_gaveta",
        "esperado",
        "movimento_do_dia",
        "conferida_por",
        "criado_em",
    ]
