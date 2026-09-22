from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from bancada.tenants.models import Loja, Tenant, Usuario


class LojaInline(admin.TabularInline):
    model = Loja
    extra = 1


@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = ["nome", "documento", "ativo", "criado_em"]
    list_filter = ["ativo"]
    search_fields = ["nome", "documento"]
    prepopulated_fields = {"slug": ("nome",)}
    inlines = [LojaInline]


@admin.register(Loja)
class LojaAdmin(admin.ModelAdmin):
    list_display = ["nome", "tenant", "telefone"]
    list_filter = ["tenant"]
    search_fields = ["nome"]


@admin.register(Usuario)
class UsuarioAdmin(UserAdmin):
    list_display = ["username", "email", "tenant", "papel", "is_staff"]
    list_filter = ["tenant", "papel", "is_staff", "is_superuser"]
    fieldsets = (
        *(UserAdmin.fieldsets or ()),
        ("Bancada", {"fields": ("tenant", "papel")}),
    )
    add_fieldsets = (
        *(UserAdmin.add_fieldsets or ()),
        ("Bancada", {"fields": ("tenant", "papel")}),
    )
