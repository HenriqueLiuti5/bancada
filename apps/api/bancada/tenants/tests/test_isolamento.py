import pytest

from bancada.clientes.models import Cliente
from bancada.tenants.models import Tenant


@pytest.mark.django_db
def test_consulta_por_tenant_nao_enxerga_dados_de_outro(
    tenant: Tenant, outro_tenant: Tenant
) -> None:
    Cliente.objects.create(tenant=tenant, nome="Maria", telefone="11999990000")
    Cliente.objects.create(tenant=outro_tenant, nome="Joao", telefone="11988887777")

    visiveis = Cliente.objects.do_tenant(tenant)

    assert [c.nome for c in visiveis] == ["Maria"]


@pytest.mark.django_db
def test_slug_da_assistencia_e_gerado_a_partir_do_nome(db: None) -> None:
    criada = Tenant.objects.create(nome="Assistência do Zé")

    assert criada.slug == "assistencia-do-ze"
