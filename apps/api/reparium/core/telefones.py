from urllib.parse import quote

from rest_framework import serializers

CODIGO_DO_BRASIL = "55"
PREFIXO_DE_LONGA_DISTANCIA = "0"
DIGITOS_MINIMOS_PARA_BUSCAR_TELEFONE = 4
DIGITOS_DO_CELULAR = 11
DIGITOS_DO_FIXO = 10
INICIO_DO_CELULAR = "9"
INICIOS_DO_FIXO = frozenset("2345")
PRIMEIRO_INICIO_DE_CELULAR_ANTIGO = 6

DDDS_DO_BRASIL = frozenset(
    [
        *range(11, 20),
        *[21, 22, 24, 27, 28],
        *[31, 32, 33, 34, 35, 37, 38],
        *range(41, 50),
        *[51, 53, 54, 55],
        *range(61, 70),
        *[71, 73, 74, 75, 77, 79],
        *range(81, 90),
        *range(91, 100),
    ]
)

TAMANHOS = "Com o DDD, celular tem 11 dígitos e fixo tem 10."


def so_digitos(texto: str) -> str:
    return "".join(caractere for caractere in texto if "0" <= caractere <= "9")


def _sem_prefixos(digitos: str) -> str:
    if len(digitos) in {12, 13} and digitos.startswith(CODIGO_DO_BRASIL):
        return digitos[len(CODIGO_DO_BRASIL) :]
    if len(digitos) in {11, 12} and digitos.startswith(PREFIXO_DE_LONGA_DISTANCIA):
        return digitos[len(PREFIXO_DE_LONGA_DISTANCIA) :]
    return digitos


def problema_do_telefone(valor: str) -> str | None:
    digitos = _sem_prefixos(so_digitos(valor))
    total = len(digitos)

    if total < DIGITOS_DO_FIXO:
        digitados = "1 dígito" if total == 1 else f"{total} dígitos"
        return f"O número está incompleto: tem {digitados}. {TAMANHOS}"
    if total > DIGITOS_DO_CELULAR:
        return f"O número tem dígitos a mais: são {total}. {TAMANHOS}"
    if int(digitos[:2]) not in DDDS_DO_BRASIL:
        return f"O DDD {digitos[:2]} não existe. Confira os dois primeiros números."

    primeiro = digitos[2]
    if total == DIGITOS_DO_CELULAR and primeiro != INICIO_DO_CELULAR:
        return "Celular começa com 9 depois do DDD. Confira o número."
    if total == DIGITOS_DO_FIXO and primeiro not in INICIOS_DO_FIXO:
        if int(primeiro) >= PRIMEIRO_INICIO_DE_CELULAR_ANTIGO:
            return "Falta um dígito: celular tem 9 números depois do DDD."
        return "Confira o número: depois do DDD, celular começa com 9 e fixo com 2, 3, 4 ou 5."
    return None


def telefone_brasileiro(valor: str) -> str | None:
    if problema_do_telefone(valor) is not None:
        return None
    return _sem_prefixos(so_digitos(valor))


def conferir_telefone(valor: str) -> str:
    problema = problema_do_telefone(valor)
    if problema is not None:
        raise serializers.ValidationError(problema)
    return _sem_prefixos(so_digitos(valor))


def link_do_whatsapp(telefone: str, mensagem: str) -> str | None:
    digitos = telefone_brasileiro(telefone)
    if digitos is None:
        return None
    return f"https://wa.me/{CODIGO_DO_BRASIL}{digitos}?text={quote(mensagem)}"
