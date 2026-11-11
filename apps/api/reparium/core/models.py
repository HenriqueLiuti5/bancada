from django.db import models


class Carimbado(models.Model):
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class TenantQuerySet(models.QuerySet):
    def do_tenant(self, tenant: models.Model) -> "TenantQuerySet":
        return self.filter(tenant=tenant)


class PertenceAoTenant(Carimbado):
    tenant = models.ForeignKey(
        "tenants.Tenant",
        on_delete=models.CASCADE,
        related_name="%(class)ss",
    )

    objects = TenantQuerySet.as_manager()

    class Meta:
        abstract = True
