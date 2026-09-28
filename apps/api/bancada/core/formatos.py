from decimal import Decimal


def em_reais(valor: Decimal) -> str:
    sinal = "-" if valor < 0 else ""
    inteiro, centavos = f"{abs(valor):.2f}".split(".")
    com_milhares = f"{int(inteiro):,}".replace(",", ".")
    return f"{sinal}R$ {com_milhares},{centavos}"
