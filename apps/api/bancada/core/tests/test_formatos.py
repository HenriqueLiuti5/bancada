from decimal import Decimal

import pytest

from bancada.core.formatos import em_reais
from bancada.core.templatetags.formatos import telefone


@pytest.mark.parametrize(
    ("entrada", "esperado"),
    [
        ("11988887777", "(11) 98888-7777"),
        ("1133334444", "(11) 3333-4444"),
        ("(11) 3333-4444", "(11) 3333-4444"),
        ("0800 123 4567", "0800 123 4567"),
        ("+55 11 98888-7777", "+55 11 98888-7777"),
        ("", ""),
        (None, ""),
    ],
)
def test_telefone_ganha_formato_quando_da_para_reconhecer(entrada: str, esperado: str) -> None:
    assert telefone(entrada) == esperado


@pytest.mark.parametrize(
    ("valor", "esperado"),
    [
        (Decimal("0"), "R$ 0,00"),
        (Decimal("80.5"), "R$ 80,50"),
        (Decimal("1300.00"), "R$ 1.300,00"),
        (Decimal("1234567.89"), "R$ 1.234.567,89"),
        (Decimal("-30.00"), "-R$ 30,00"),
    ],
)
def test_valor_em_reais_no_formato_brasileiro(valor: Decimal, esperado: str) -> None:
    assert em_reais(valor) == esperado
