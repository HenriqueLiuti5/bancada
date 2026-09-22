from django.contrib import admin

from bancada.clientes.models import Aparelho, Cliente


class AparelhoInline(admin.TabularInline):
    model = Aparelho
    extra = 1
    fields = ["marca", "modelo", "cor", "imei", "senha_desbloqueio", "tenant"]


@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    list_display = ["nome", "telefone", "email", "tenant"]
    list_filter = ["tenant"]
    search_fields = ["nome", "telefone", "documento"]
    inlines = [AparelhoInline]


@admin.register(Aparelho)
class AparelhoAdmin(admin.ModelAdmin):
    list_display = ["__str__", "cliente", "imei_mascarado", "tenant"]
    list_filter = ["tenant", "marca"]
    search_fields = ["marca", "modelo", "imei", "cliente__nome"]
