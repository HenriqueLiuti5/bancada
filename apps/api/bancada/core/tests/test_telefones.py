import pytest
from rest_framework import serializers

from bancada.core.telefones import (
    DDDS_DO_BRASIL,
    conferir_telefone,
    link_do_whatsapp,
    problema_do_telefone,
    telefone_brasileiro,
)


@pytest.mark.parametrize(
    ("digitado", "esperado"),
    [
        ("(43) 99615-6781", "43996156781"),
        ("43996156781", "43996156781"),
        ("+55 (43) 99615-6781", "43996156781"),
        ("043 99615-6781", "43996156781"),
        ("(11) 3333-4444", "1133334444"),
        ("0 11 3333-4444", "1133334444"),
        ("55 11 3333-4444", "1133334444"),
    ],
)
def test_aceita_celular_e_fixo_com_ddd(digitado: str, esperado: str) -> None:
    assert problema_do_telefone(digitado) is None
    assert telefone_brasileiro(digitado) == esperado


@pytest.mark.parametrize(
    ("digitado", "trecho"),
    [
        ("99615", "incompleto: tem 5 dígitos."),
        ("9", "incompleto: tem 1 dígito."),
        ("99615-6781", "incompleto: tem 9 dígitos."),
        ("(43) 99615-67811", "dígitos a mais: são 12."),
        ("(23) 99615-6781", "O DDD 23 não existe."),
        ("(43) 39615-6781", "Celular começa com 9 depois do DDD."),
        ("(43) 9961-5678", "Falta um dígito"),
        ("(43) 1961-5678", "celular começa com 9 e fixo com 2, 3, 4 ou 5"),
        ("sem número", "incompleto: tem 0 dígitos."),
    ],
)
def test_diz_o_que_esta_errado_no_numero(digitado: str, trecho: str) -> None:
    problema = problema_do_telefone(digitado)

    assert problema is not None
    assert trecho in problema
    assert telefone_brasileiro(digitado) is None


def test_lista_tem_os_67_ddds_do_brasil() -> None:
    assert len(DDDS_DO_BRASIL) == 67
    assert {11, 43, 61, 99} <= DDDS_DO_BRASIL
    assert not {10, 20, 23, 30, 50, 90} & DDDS_DO_BRASIL


def test_conferencia_devolve_so_os_digitos_ou_a_explicacao() -> None:
    assert conferir_telefone("(43) 99615-6781") == "43996156781"

    with pytest.raises(serializers.ValidationError) as erro:
        conferir_telefone("99615")

    assert "tem 5 dígitos" in str(erro.value.detail)


def test_numero_invalido_nao_vira_link_de_whatsapp() -> None:
    assert link_do_whatsapp("99615", "Oi") is None
    assert link_do_whatsapp("(43) 99615-6781", "Oi") == "https://wa.me/5543996156781?text=Oi"
