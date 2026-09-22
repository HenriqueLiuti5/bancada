from typing import Any

from django.contrib import admin
from django.db.models import QuerySet
from django.http import HttpRequest

from bancada.ordens.forms import OrdemServicoForm
from bancada.ordens.models import EventoOS, ItemOrcamento, OrdemServico
from bancada.tenants.models import Usuario


def usuario_da_requisicao(request: HttpRequest) -> Usuario | None:
    return request.user if isinstance(request.user, Usuario) else None


class ItemOrcamentoInline(admin.TabularInline):
    model = ItemOrcamento
    extra = 1


class EventoOSInline(admin.TabularInline):
    model = EventoOS
    extra = 0
    can_delete = False
    readonly_fields = ["de_status", "para_status", "usuario", "nota", "criado_em"]
    ordering = ["criado_em"]

    def has_add_permission(self, request: HttpRequest, obj: Any = None) -> bool:
        return False


@admin.register(OrdemServico)
class OrdemServicoAdmin(admin.ModelAdmin):
    form = OrdemServicoForm
    list_display = ["numero", "aparelho", "cliente", "status", "tecnico", "tenant", "criado_em"]
    list_filter = ["tenant", "status", "loja"]
    search_fields = ["numero", "cliente__nome", "aparelho__marca", "aparelho__modelo"]
    readonly_fields = ["numero", "token_publico", "entregue_em", "criado_em", "atualizado_em"]
    inlines = [ItemOrcamentoInline, EventoOSInline]

    def get_queryset(self, request: HttpRequest) -> QuerySet[OrdemServico]:
        return super().get_queryset(request).select_related("cliente", "aparelho", "tenant")

    def save_model(self, request: HttpRequest, obj: OrdemServico, form: Any, change: bool) -> None:
        if not change:
            super().save_model(request, obj, form, change)
            EventoOS.objects.create(
                ordem=obj,
                usuario=usuario_da_requisicao(request),
                de_status="",
                para_status=obj.status,
                nota="Ordem aberta pelo painel",
            )
            return

        novo_status = obj.status
        anterior = OrdemServico.objects.values_list("status", flat=True).get(pk=obj.pk)
        obj.status = anterior
        super().save_model(request, obj, form, change)

        if novo_status != anterior:
            obj.transicionar(
                novo_status, usuario=usuario_da_requisicao(request), nota="Alterado pelo painel"
            )


@admin.register(EventoOS)
class EventoOSAdmin(admin.ModelAdmin):
    list_display = ["ordem", "de_status", "para_status", "usuario", "criado_em"]
    list_filter = ["para_status"]
    readonly_fields = ["ordem", "de_status", "para_status", "usuario", "nota", "criado_em"]

    def has_add_permission(self, request: HttpRequest) -> bool:
        return False

    def has_change_permission(self, request: HttpRequest, obj: Any = None) -> bool:
        return False
