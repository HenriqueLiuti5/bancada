import json
from datetime import timedelta

import pytest
from django.core.cache import cache
from django.utils import timezone
from rest_framework.test import APIClient

from bancada.ordens.estados import StatusOS
from bancada.ordens.models import ItemOrcamento, OrdemServico


@pytest.fixture(autouse=True)
def cache_limpo() -> None:
    cache.clear()


@pytest.mark.django_db
def test_qualquer_um_com_o_link_ve_o_acompanhamento(ordem: OrdemServico) -> None:
    resposta = APIClient().get(f"/api/publico/os/{ordem.token_publico}/")

    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["numero"] == ordem.numero
    assert corpo["aparelho"] == "Motorola Moto G54"
    assert corpo["cliente_primeiro_nome"] == "Maria"


@pytest.mark.django_db
def test_token_inexistente_da_404(db: None) -> None:
    assert APIClient().get("/api/publico/os/inventado/").status_code == 404


@pytest.mark.django_db
def test_pagina_publica_nao_expoe_dado_sensivel(ordem: OrdemServico) -> None:
    ordem.transicionar(StatusOS.EM_DIAGNOSTICO, nota="Placa oxidada, trilha rompida")

    bruto = json.dumps(APIClient().get(f"/api/publico/os/{ordem.token_publico}/").json())

    assert ordem.aparelho.imei not in bruto
    assert "1234" not in bruto
    assert "Souza" not in bruto
    assert "oxidada" not in bruto


@pytest.mark.django_db
def test_orcamento_so_aparece_depois_de_enviado(ordem: OrdemServico) -> None:
    ItemOrcamento.objects.create(ordem=ordem, descricao="Conector de carga", valor="90.00")

    antes = APIClient().get(f"/api/publico/os/{ordem.token_publico}/").json()
    assert "orcamento" not in antes

    ordem.transicionar(StatusOS.EM_DIAGNOSTICO)
    ordem.transicionar(StatusOS.ORCAMENTO_ENVIADO)

    depois = APIClient().get(f"/api/publico/os/{ordem.token_publico}/").json()
    assert depois["orcamento"]["total"] == "90.00"


@pytest.mark.django_db
def test_segunda_visita_vem_do_cache_sem_tocar_o_banco(
    ordem: OrdemServico, django_assert_num_queries: object
) -> None:
    cliente_api = APIClient()
    cliente_api.get(f"/api/publico/os/{ordem.token_publico}/")

    with django_assert_num_queries(0):  # type: ignore[operator]
        cliente_api.get(f"/api/publico/os/{ordem.token_publico}/")


@pytest.mark.django_db
def test_mudanca_de_status_invalida_o_cache(ordem: OrdemServico) -> None:
    cliente_api = APIClient()
    antes = cliente_api.get(f"/api/publico/os/{ordem.token_publico}/").json()
    assert antes["status"] == StatusOS.RECEBIDO

    ordem.transicionar(StatusOS.EM_DIAGNOSTICO)

    depois = cliente_api.get(f"/api/publico/os/{ordem.token_publico}/").json()
    assert depois["status"] == StatusOS.EM_DIAGNOSTICO


@pytest.mark.django_db
def test_link_expira_depois_de_entregue(ordem: OrdemServico) -> None:
    for status in [
        StatusOS.EM_DIAGNOSTICO,
        StatusOS.ORCAMENTO_ENVIADO,
        StatusOS.APROVADO,
        StatusOS.EM_REPARO,
        StatusOS.PRONTO,
        StatusOS.ENTREGUE,
    ]:
        ordem.transicionar(status)

    assert APIClient().get(f"/api/publico/os/{ordem.token_publico}/").status_code == 200

    OrdemServico.objects.filter(pk=ordem.pk).update(entregue_em=timezone.now() - timedelta(days=91))
    cache.clear()

    assert APIClient().get(f"/api/publico/os/{ordem.token_publico}/").status_code == 410
