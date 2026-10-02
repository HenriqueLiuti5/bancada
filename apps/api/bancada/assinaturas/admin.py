from typing import Any

from django.contrib import admin
from django.http import HttpRequest

from bancada.assinaturas.models import Assinatura, EventoDoProvedor, Fatura

CAMPOS_DA_FATURA = (
    "vencimento",
    "valor",
    "situacao",
    "forma_de_pagamento",
    "paga_em",
    "id_no_provedor",
)


class SoLeitura(admin.ModelAdmin):
    def has_add_permission(self, request: HttpRequest) -> bool:
        return False

    def has_delete_permission(self, request: HttpRequest, obj: Any = None) -> bool:
        return False


class FaturaInline(admin.TabularInline):
    model = Fatura
    extra = 0
    can_delete = False
    fields = CAMPOS_DA_FATURA
    readonly_fields = CAMPOS_DA_FATURA

    def has_add_permission(self, request: HttpRequest, obj: Any = None) -> bool:
        return False


@admin.register(Assinatura)
class AssinaturaAdmin(SoLeitura):
    list_display = [
        "tenant",
        "situacao",
        "teste_termina_em",
        "valor_mensal",
        "assinada_em",
        "acesso_ate",
    ]
    list_filter = ["situacao"]
    search_fields = ["tenant__nome"]
    readonly_fields = [
        "tenant",
        "situacao",
        "valor_mensal",
        "documento_do_pagador",
        "cliente_no_provedor",
        "assinatura_no_provedor",
        "assinada_em",
        "cancelada_em",
        "acesso_ate",
        "avisos_de_fim_do_teste",
    ]
    inlines = [FaturaInline]


@admin.register(Fatura)
class FaturaAdmin(SoLeitura):
    list_display = ["tenant", "vencimento", "valor", "situacao", "forma_de_pagamento", "paga_em"]
    list_filter = ["situacao", "forma_de_pagamento"]
    search_fields = ["tenant__nome", "id_no_provedor"]

    def has_change_permission(self, request: HttpRequest, obj: Any = None) -> bool:
        return False


@admin.register(EventoDoProvedor)
class EventoDoProvedorAdmin(SoLeitura):
    list_display = ["tipo", "id_no_provedor", "recebido_em"]
    list_filter = ["tipo"]
    search_fields = ["id_no_provedor"]

    def has_change_permission(self, request: HttpRequest, obj: Any = None) -> bool:
        return False
