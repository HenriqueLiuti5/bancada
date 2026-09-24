from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from bancada.tenants.models import Convite, Loja, Tenant, Usuario


class LojaInline(admin.TabularInline):
    model = Loja
    extra = 1


@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = ["nome", "documento", "whatsapp", "ativo", "criado_em"]
    list_filter = ["ativo"]
    search_fields = ["nome", "documento", "whatsapp"]
    prepopulated_fields = {"slug": ("nome",)}
    readonly_fields = ["termos_aceitos_em", "versao_dos_termos"]
    inlines = [LojaInline]


@admin.register(Loja)
class LojaAdmin(admin.ModelAdmin):
    list_display = ["nome", "tenant", "telefone"]
    list_filter = ["tenant"]
    search_fields = ["nome"]


@admin.register(Usuario)
class UsuarioAdmin(UserAdmin):
    list_display = ["username", "email", "tenant", "papel", "email_confirmado_em", "is_staff"]
    list_filter = ["tenant", "papel", "is_staff", "is_superuser"]
    fieldsets = (
        *(UserAdmin.fieldsets or ()),
        ("Bancada", {"fields": ("tenant", "papel", "email_confirmado_em")}),
    )
    add_fieldsets = (
        *(UserAdmin.add_fieldsets or ()),
        ("Bancada", {"fields": ("tenant", "papel")}),
    )


@admin.register(Convite)
class ConviteAdmin(admin.ModelAdmin):
    list_display = ["nome", "tenant", "papel", "email", "expira_em", "aceito_em"]
    list_filter = ["tenant", "papel"]
    search_fields = ["nome", "email"]
    readonly_fields = ["token", "aceito_em", "usuario", "criado_por"]
