from decimal import Decimal
from typing import Any

from django.urls import reverse
from rest_framework.test import APIClient

from bancada.assinaturas.regras import DIAS_DE_TESTE


def test_oferta_mostra_o_preco_cobrado_e_os_dias_de_teste_sem_login(settings: Any) -> None:
    settings.VALOR_DA_ASSINATURA = Decimal("64.90")

    resposta = APIClient().get(reverse("oferta"))

    assert resposta.status_code == 200
    assert resposta.json() == {"valor_mensal": "64.90", "dias_de_teste": DIAS_DE_TESTE}


def test_oferta_nao_toca_no_banco() -> None:
    resposta = APIClient().get(reverse("oferta"))

    assert resposta.status_code == 200
