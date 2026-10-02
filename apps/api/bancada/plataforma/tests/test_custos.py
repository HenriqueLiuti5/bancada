from datetime import date
from decimal import Decimal
from typing import Any

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from bancada.auditoria.models import Acao, RegistroDeAuditoria
from bancada.plataforma.meses import Mes
from bancada.plataforma.models import Custo
from bancada.tenants.models import Usuario


def lancar(api: APIClient, **mudancas: str) -> Any:
    custo = {
        "mes": Mes.de(timezone.localdate()).em_texto(),
        "descricao": "Domínio do site",
        "valor": "40.00",
    }
    return api.post("/api/plataforma/custos/", {**custo, **mudancas}, format="json")


@pytest.mark.django_db
def test_custo_lancado_fica_no_mes_e_na_auditoria(
    api_plataforma: APIClient, conta_da_plataforma: Usuario
) -> None:
    resposta = lancar(api_plataforma, mes="2026-09")

    assert resposta.status_code == 201
    custo = Custo.objects.get()
    assert custo.mes == date(2026, 9, 1)
    assert custo.valor == Decimal("40.00")
    assert custo.lancado_por == conta_da_plataforma

    registro = RegistroDeAuditoria.objects.get(acao=Acao.CUSTO_LANCADO)
    assert registro.tenant is None
    assert registro.objeto_id == custo.pk
    assert registro.detalhe == "Domínio do site, R$ 40,00 em 09/2026"


@pytest.mark.django_db
def test_custo_aparece_no_painel_do_mes(api_plataforma: APIClient) -> None:
    lancar(api_plataforma, descricao="Servidor", valor="25.50")

    dinheiro = api_plataforma.get("/api/plataforma/painel/").json()["dinheiro"]

    assert dinheiro["custos"] == "25.50"
    assert dinheiro["lista_de_custos"][0]["descricao"] == "Servidor"


@pytest.mark.django_db
@pytest.mark.parametrize(
    ("campo", "valor"),
    [("valor", "0"), ("valor", "-10.00"), ("descricao", ""), ("mes", "2026-13")],
)
def test_custo_invalido_e_recusado(api_plataforma: APIClient, campo: str, valor: str) -> None:
    resposta = lancar(api_plataforma, **{campo: valor})

    assert resposta.status_code == 400
    assert campo in resposta.json()
    assert not Custo.objects.exists()


@pytest.mark.django_db
def test_custo_de_mes_que_ainda_nao_chegou_e_recusado(api_plataforma: APIClient) -> None:
    seguinte = Mes.de(timezone.localdate()).seguinte.em_texto()

    assert lancar(api_plataforma, mes=seguinte).status_code == 400


@pytest.mark.django_db
def test_custo_removido_sai_do_mes_e_fica_na_auditoria(api_plataforma: APIClient) -> None:
    lancar(api_plataforma)
    custo = Custo.objects.get()

    resposta = api_plataforma.delete(f"/api/plataforma/custos/{custo.pk}/")

    assert resposta.status_code == 204
    assert not Custo.objects.exists()
    registro = RegistroDeAuditoria.objects.get(acao=Acao.CUSTO_REMOVIDO)
    assert registro.objeto_id == custo.pk
    assert registro.tenant is None


@pytest.mark.django_db
def test_assistencia_nao_remove_custo_da_plataforma(
    api_plataforma: APIClient, api_tecnico: APIClient
) -> None:
    lancar(api_plataforma)
    custo = Custo.objects.get()

    assert api_tecnico.delete(f"/api/plataforma/custos/{custo.pk}/").status_code == 403
    assert Custo.objects.exists()
