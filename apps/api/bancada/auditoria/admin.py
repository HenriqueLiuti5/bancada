from typing import Any

from django.contrib import admin
from django.http import HttpRequest

from bancada.auditoria.models import RegistroDeAuditoria


@admin.register(RegistroDeAuditoria)
class RegistroDeAuditoriaAdmin(admin.ModelAdmin):
    list_display = ["criado_em", "acao", "objeto", "objeto_id", "usuario", "origem", "tenant"]
    list_filter = ["tenant", "acao"]
    search_fields = ["detalhe", "objeto_id", "usuario__username"]
    readonly_fields = [
        "tenant",
        "usuario",
        "acao",
        "objeto",
        "objeto_id",
        "detalhe",
        "origem",
        "criado_em",
        "atualizado_em",
    ]

    def has_add_permission(self, request: HttpRequest) -> bool:
        return False

    def has_change_permission(self, request: HttpRequest, obj: Any = None) -> bool:
        return False

    def has_delete_permission(self, request: HttpRequest, obj: Any = None) -> bool:
        return False
