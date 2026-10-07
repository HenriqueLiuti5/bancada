from typing import Any

from django.contrib import admin
from django.http import HttpRequest
from django.urls import reverse
from django.utils.html import format_html

from bancada.ordens.forms import OrdemServicoForm
from bancada.ordens.fotos import assinar
from bancada.ordens.models import EventoOS, FotoOS, ItemOrcamento, OrdemServico, Pagamento
from bancada.tenants.models import Usuario


def usuario_da_requisicao(request: HttpRequest) -> Usuario | None:
    return request.user if isinstance(request.user, Usuario) else None


class ItemOrcamentoInline(admin.TabularInline):
    model = ItemOrcamento
    extra = 1


class PagamentoInline(admin.TabularInline):
    model = Pagamento
    extra = 0
    fields = ["forma", "valor", "recebido_em", "registrado_por"]
    readonly_fields = ["registrado_por"]


class EventoOSInline(admin.TabularInline):
    model = EventoOS
    extra = 0
    can_delete = False
    readonly_fields = ["de_status", "para_status", "usuario", "nota", "criado_em"]
    ordering = ["criado_em"]

    def has_add_permission(self, request: HttpRequest, obj: Any = None) -> bool:
        return False


class FotoOSInline(admin.TabularInline):
    model = FotoOS
    extra = 0
    fields = ["previa", "momento", "legenda", "visivel_ao_cliente", "enviada_por", "criado_em"]
    readonly_fields = ["previa", "momento", "legenda", "enviada_por", "criado_em"]

    def has_add_permission(self, request: HttpRequest, obj: Any = None) -> bool:
        return False

    @admin.display(description="prévia")
    def previa(self, obj: FotoOS) -> str:
        endereco = reverse("arquivo-da-foto", args=[assinar(obj.pk)])
        return format_html(
            '<img src="{}" alt="" style="max-height: 120px; border-radius: 6px" />', endereco
        )


@admin.register(OrdemServico)
class OrdemServicoAdmin(admin.ModelAdmin):
    form = OrdemServicoForm
    list_display = ["numero", "aparelho", "cliente", "status", "tecnico", "tenant", "criado_em"]
    list_select_related = ["aparelho", "cliente", "tecnico", "tenant"]
    list_filter = ["tenant", "status", "loja"]
    search_fields = ["numero", "cliente__nome", "aparelho__marca", "aparelho__modelo"]
    readonly_fields = ["numero", "token_publico", "entregue_em", "criado_em", "atualizado_em"]
    inlines = [ItemOrcamentoInline, PagamentoInline, FotoOSInline, EventoOSInline]

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
    list_select_related = ["ordem__aparelho", "usuario"]
    list_filter = ["para_status"]
    readonly_fields = ["ordem", "de_status", "para_status", "usuario", "nota", "criado_em"]

    def has_add_permission(self, request: HttpRequest) -> bool:
        return False

    def has_change_permission(self, request: HttpRequest, obj: Any = None) -> bool:
        return False
