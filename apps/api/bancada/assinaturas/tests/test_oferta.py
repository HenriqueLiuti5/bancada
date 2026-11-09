from typing import Any

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from bancada.assinaturas.models import VagaDeFundador
from bancada.tenants.models import Tenant


@pytest.mark.django_db
def test_oferta_mostra_os_planos_os_dias_de_teste_e_as_vagas_de_fundador_sem_login(
    tenant: Tenant, outro_tenant: Tenant
) -> None:
    VagaDeFundador.objects.create(numero=1, tenant=tenant)
    VagaDeFundador.objects.create(numero=2, tenant=outro_tenant)
    VagaDeFundador.objects.create(numero=3)

    resposta = APIClient().get(reverse("oferta"))

    assert resposta.status_code == 200
    assert resposta.json() == {
        "dias_de_teste": 15,
        "planos": [
            {
                "plano": "solo",
                "nome": "Solo",
                "lojas": 1,
                "pessoas": 2,
                "mensal": "49.90",
                "anual": "499.00",
                "fundador_mensal": "34.90",
                "fundador_anual": "349.00",
            },
            {
                "plano": "equipe",
                "nome": "Equipe",
                "lojas": 1,
                "pessoas": None,
                "mensal": "89.90",
                "anual": "899.00",
                "fundador_mensal": "62.90",
                "fundador_anual": "629.00",
            },
            {
                "plano": "rede",
                "nome": "Rede",
                "lojas": 3,
                "pessoas": None,
                "mensal": "179.90",
                "anual": "1799.00",
                "fundador_mensal": "125.90",
                "fundador_anual": "1259.00",
            },
        ],
        "fundadores": {"vagas": 15, "restantes": 12, "desconto": 30},
    }


@pytest.mark.django_db
@pytest.mark.usefixtures("vagas_esgotadas")
def test_oferta_sem_vagas_de_fundador_mostra_zero_restantes() -> None:
    fundadores = APIClient().get(reverse("oferta")).json()["fundadores"]

    assert fundadores == {"vagas": 15, "restantes": 0, "desconto": 30}


@pytest.mark.django_db
def test_oferta_conta_as_vagas_numa_consulta_so(django_assert_num_queries: Any) -> None:
    with django_assert_num_queries(1):
        resposta = APIClient().get(reverse("oferta"))

    assert resposta.status_code == 200
