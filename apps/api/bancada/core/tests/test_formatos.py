import pytest

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
