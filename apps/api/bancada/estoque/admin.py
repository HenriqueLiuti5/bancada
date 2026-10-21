from typing import Any

from django.contrib import admin
from django.http import HttpRequest

from bancada.estoque.models import (
    ItemDaVenda,
    MovimentoDeEstoque,
    PagamentoDaVenda,
    Produto,
    Venda,
)


class SoLeitura(admin.TabularInline):
    extra = 0
    can_delete = False

    def has_add_permission(self, request: HttpRequest, obj: Any = None) -> bool:
        return False

    def has_change_permission(self, request: HttpRequest, obj: Any = None) -> bool:
        return False


class MovimentoInline(SoLeitura):
    model = MovimentoDeEstoque
    fk_name = "produto"
    fields = ["criado_em", "tipo", "quantidade", "loja", "ordem", "venda", "usuario"]
    readonly_fields = ["criado_em", "tipo", "quantidade", "loja", "ordem", "venda", "usuario"]
    ordering = ["-criado_em"]


@admin.register(Produto)
class ProdutoAdmin(admin.ModelAdmin):
    list_display = ["nome", "tipo", "codigo", "custo", "preco", "minimo", "ativo", "tenant"]
    list_select_related = ["tenant"]
    list_filter = ["tenant", "tipo", "ativo"]
    search_fields = ["nome", "codigo"]
    inlines = [MovimentoInline]


class ItemDaVendaInline(SoLeitura):
    model = ItemDaVenda
    fields = ["descricao", "quantidade", "preco", "custo"]
    readonly_fields = ["descricao", "quantidade", "preco", "custo"]


class PagamentoDaVendaInline(SoLeitura):
    model = PagamentoDaVenda
    fields = ["forma", "valor"]
    readonly_fields = ["forma", "valor"]


@admin.register(Venda)
class VendaAdmin(admin.ModelAdmin):
    list_display = ["numero", "tenant", "loja", "valor_cobrado", "vendida_por", "criado_em"]
    list_select_related = ["tenant", "loja", "vendida_por"]
    list_filter = ["tenant"]
    readonly_fields = [
        "numero",
        "loja",
        "total",
        "valor_cobrado",
        "vendida_por",
        "desfeita_em",
        "desfeita_por",
        "criado_em",
    ]
    inlines = [ItemDaVendaInline, PagamentoDaVendaInline]

    def has_add_permission(self, request: HttpRequest) -> bool:
        return False
