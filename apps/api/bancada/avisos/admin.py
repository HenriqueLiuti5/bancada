from typing import Any

from django.contrib import admin
from django.http import HttpRequest

from bancada.avisos.models import AvisoDeStatus


@admin.register(AvisoDeStatus)
class AvisoDeStatusAdmin(admin.ModelAdmin):
    list_display = ["assunto", "destino", "enviado_em", "tentativas", "tenant", "criado_em"]
    list_select_related = ["tenant"]
    list_filter = ["tenant", "enviado_em"]
    search_fields = ["destino", "assunto"]
    readonly_fields = [
        "evento",
        "destino",
        "assunto",
        "enviado_em",
        "tentativas",
        "erro",
        "tenant",
        "criado_em",
        "atualizado_em",
    ]

    def has_add_permission(self, request: HttpRequest) -> bool:
        return False

    def has_change_permission(self, request: HttpRequest, obj: Any = None) -> bool:
        return False
