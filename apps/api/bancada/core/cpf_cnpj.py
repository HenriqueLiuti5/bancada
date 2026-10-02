import re

PONTUACAO = re.compile(r"[\s./-]")
FORMATO_DO_CPF = re.compile(r"^[0-9]{11}$")
FORMATO_DO_CNPJ = re.compile(r"^[0-9A-Z]{12}[0-9]{2}$")
PESOS_DO_PRIMEIRO_DIGITO_DO_CNPJ = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
PESOS_DO_SEGUNDO_DIGITO_DO_CNPJ = [6, *PESOS_DO_PRIMEIRO_DIGITO_DO_CNPJ]


def _digito_do_cpf(digitos: str) -> int:
    pesos = range(len(digitos) + 1, 1, -1)
    soma = sum(int(digito) * peso for digito, peso in zip(digitos, pesos, strict=True))
    return soma * 10 % 11 % 10


def _cpf_valido(numero: str) -> bool:
    if len(set(numero)) == 1:
        return False
    primeiro = _digito_do_cpf(numero[:9])
    segundo = _digito_do_cpf(f"{numero[:9]}{primeiro}")
    return numero[9:] == f"{primeiro}{segundo}"


def _valor_no_cnpj(caractere: str) -> int:
    return ord(caractere) - ord("0")


def _digito_do_cnpj(caracteres: str, pesos: list[int]) -> int:
    soma = sum(
        _valor_no_cnpj(caractere) * peso for caractere, peso in zip(caracteres, pesos, strict=True)
    )
    resto = soma % 11
    return 0 if resto < 2 else 11 - resto


def _cnpj_valido(numero: str) -> bool:
    if len(set(numero)) == 1:
        return False
    primeiro = _digito_do_cnpj(numero[:12], PESOS_DO_PRIMEIRO_DIGITO_DO_CNPJ)
    segundo = _digito_do_cnpj(f"{numero[:12]}{primeiro}", PESOS_DO_SEGUNDO_DIGITO_DO_CNPJ)
    return numero[12:] == f"{primeiro}{segundo}"


def cpf_ou_cnpj(valor: str) -> str | None:
    numero = PONTUACAO.sub("", valor).upper()
    if FORMATO_DO_CPF.match(numero):
        return numero if _cpf_valido(numero) else None
    if FORMATO_DO_CNPJ.match(numero):
        return numero if _cnpj_valido(numero) else None
    return None
