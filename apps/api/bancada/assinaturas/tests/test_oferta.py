from django.urls import reverse
from rest_framework.test import APIClient

from bancada.assinaturas.regras import DIAS_DE_TESTE


def test_oferta_mostra_o_preco_do_equipe_e_os_dias_de_teste_sem_login() -> None:
    resposta = APIClient().get(reverse("oferta"))

    assert resposta.status_code == 200
    assert resposta.json() == {"valor_mensal": "59.90", "dias_de_teste": DIAS_DE_TESTE}


def test_oferta_nao_toca_no_banco() -> None:
    resposta = APIClient().get(reverse("oferta"))

    assert resposta.status_code == 200
