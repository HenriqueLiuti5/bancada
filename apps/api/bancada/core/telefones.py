DDD_MINIMO = 11
DDD_MAXIMO = 99
CODIGO_DO_BRASIL = "55"
DIGITOS_MINIMOS_PARA_BUSCAR_TELEFONE = 4


def so_digitos(texto: str) -> str:
    return "".join(caractere for caractere in texto if caractere.isdigit())


def telefone_brasileiro(valor: str) -> str | None:
    digitos = so_digitos(valor)
    if len(digitos) in {12, 13} and digitos.startswith(CODIGO_DO_BRASIL):
        digitos = digitos[len(CODIGO_DO_BRASIL) :]
    if len(digitos) not in {10, 11}:
        return None
    if not DDD_MINIMO <= int(digitos[:2]) <= DDD_MAXIMO:
        return None
    return digitos
