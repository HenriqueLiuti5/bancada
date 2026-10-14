import pytest
from rest_framework import serializers

from bancada.core.cpf_cnpj import conferir_documento_opcional, cpf_ou_cnpj, problema_do_documento


@pytest.mark.parametrize(
    ("digitado", "esperado"),
    [
        ("529.982.247-25", "52998224725"),
        ("52998224725", "52998224725"),
        ("11.222.333/0001-81", "11222333000181"),
        ("12.ABC.345/01DE-35", "12ABC34501DE35"),
        ("12.abc.345/01de-35", "12ABC34501DE35"),
    ],
)
def test_aceita_cpf_cnpj_e_cnpj_com_letras(digitado: str, esperado: str) -> None:
    assert cpf_ou_cnpj(digitado) == esperado


@pytest.mark.parametrize(
    "digitado",
    [
        "529.982.247-24",
        "111.111.111-11",
        "11.222.333/0001-82",
        "12.ABC.345/01DE-36",
        "00.000.000/0000-00",
        "1234",
        "",
        "não é documento",
    ],
)
def test_recusa_digito_errado_sequencia_repetida_e_formato_estranho(digitado: str) -> None:
    assert cpf_ou_cnpj(digitado) is None


@pytest.mark.parametrize(
    ("digitado", "trecho"),
    [
        ("529.982.247-24", "Esse CPF não confere"),
        ("11.222.333/0001-82", "Esse CNPJ não confere"),
        ("529.982.247", "e esse número tem 9."),
    ],
)
def test_explica_por_que_o_documento_nao_confere(digitado: str, trecho: str) -> None:
    problema = problema_do_documento(digitado)

    assert problema is not None
    assert trecho in problema


def test_documento_opcional_aceita_vazio_e_guarda_sem_pontuacao() -> None:
    assert conferir_documento_opcional("  ") == ""
    assert conferir_documento_opcional("529.982.247-25") == "52998224725"
    assert conferir_documento_opcional("11.222.333/0001-81") == "11222333000181"

    with pytest.raises(serializers.ValidationError):
        conferir_documento_opcional("123.456.789-00")
