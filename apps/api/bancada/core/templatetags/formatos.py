from decimal import Decimal

from django import template

from bancada.core.formatos import em_reais

register = template.Library()

DDD_MINIMO = 11
DDD_MAXIMO = 99
TAMANHO_DO_CPF = 11
TAMANHO_DO_CNPJ = 14


def _tem_ddd(digitos: str) -> bool:
    return DDD_MINIMO <= int(digitos[:2]) <= DDD_MAXIMO


@register.filter
def telefone(valor: str | None) -> str:
    original = str(valor or "")
    digitos = "".join(caractere for caractere in original if caractere.isdigit())

    if len(digitos) == 11 and _tem_ddd(digitos) and digitos[2] == "9":
        return f"({digitos[:2]}) {digitos[2:7]}-{digitos[7:]}"
    if len(digitos) == 10 and _tem_ddd(digitos):
        return f"({digitos[:2]}) {digitos[2:6]}-{digitos[6:]}"

    return original


@register.filter
def documento(valor: str | None) -> str:
    numero = str(valor or "")

    if len(numero) == TAMANHO_DO_CPF and numero.isdigit():
        return f"{numero[:3]}.{numero[3:6]}.{numero[6:9]}-{numero[9:]}"
    if len(numero) == TAMANHO_DO_CNPJ and numero.isalnum():
        return f"{numero[:2]}.{numero[2:5]}.{numero[5:8]}/{numero[8:12]}-{numero[12:]}"

    return numero


@register.filter
def reais(valor: Decimal | None) -> str:
    return em_reais(Decimal(valor or 0))
