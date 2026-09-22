import pytest
from django.db import ProgrammingError, transaction

from bancada.clientes.models import Cliente
from bancada.core.rls import aplicar_tenant
from bancada.tenants.models import Tenant


@pytest.fixture
def dois_clientes(tenant: Tenant, outro_tenant: Tenant) -> None:
    Cliente.objects.create(tenant=tenant, nome="Maria", telefone="11999990000")
    Cliente.objects.create(tenant=outro_tenant, nome="Joao", telefone="11988887777")


@pytest.mark.django_db(transaction=False)
def test_consulta_sem_filtro_so_enxerga_o_tenant_aplicado(
    tenant: Tenant, dois_clientes: None
) -> None:
    aplicar_tenant(tenant.pk)

    nomes = [cliente.nome for cliente in Cliente.objects.all()]

    assert nomes == ["Maria"]


@pytest.mark.django_db(transaction=False)
def test_sem_tenant_aplicado_a_consulta_continua_aberta(dois_clientes: None) -> None:
    aplicar_tenant(None)

    nomes = sorted(cliente.nome for cliente in Cliente.objects.all())

    assert nomes == ["Joao", "Maria"]


@pytest.mark.django_db(transaction=False)
def test_busca_por_id_de_outro_tenant_nao_encontra(
    tenant: Tenant, outro_tenant: Tenant, dois_clientes: None
) -> None:
    alheio = Cliente.objects.get(nome="Joao")

    aplicar_tenant(tenant.pk)

    assert not Cliente.objects.filter(pk=alheio.pk).exists()


@pytest.mark.django_db(transaction=False)
def test_nao_consegue_gravar_para_outro_tenant(tenant: Tenant, outro_tenant: Tenant) -> None:
    aplicar_tenant(tenant.pk)

    with pytest.raises(ProgrammingError), transaction.atomic():
        Cliente.objects.create(tenant=outro_tenant, nome="Intruso", telefone="11900000000")


@pytest.mark.django_db(transaction=False)
def test_a_trava_vale_para_aparelhos_e_ordens(tenant: Tenant, ordem: object) -> None:
    from bancada.ordens.models import OrdemServico

    aplicar_tenant(-1)

    assert OrdemServico.objects.count() == 0
