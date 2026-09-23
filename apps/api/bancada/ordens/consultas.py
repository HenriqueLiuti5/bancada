from collections.abc import Mapping

from django.db.models import Q, QuerySet
from django.utils import timezone

from bancada.ordens.estados import ESTADOS_FINAIS, StatusOS
from bancada.ordens.models import OrdemServico

ORDENACOES: dict[str, list[str]] = {
    "recentes": ["-criado_em"],
    "antigas": ["criado_em"],
    "numero": ["-numero"],
    "prazo": ["prometida_para", "-criado_em"],
}

ROTULOS_DE_ORDENACAO: dict[str, str] = {
    "recentes": "Mais recentes",
    "antigas": "Mais antigas",
    "numero": "Número da OS",
    "prazo": "Prazo prometido",
}

ORDENACAO_PADRAO = "recentes"
DIGITOS_MINIMOS_PARA_TELEFONE = 4
DIGITOS_MINIMOS_PARA_IMEI = 6


def so_digitos(texto: str) -> str:
    return "".join(caractere for caractere in texto if caractere.isdigit())


def por_texto(consulta: QuerySet[OrdemServico], texto: str) -> QuerySet[OrdemServico]:
    procurado = texto.strip().lstrip("#")
    if not procurado:
        return consulta

    filtro = (
        Q(cliente__nome__icontains=procurado)
        | Q(aparelho__marca__icontains=procurado)
        | Q(aparelho__modelo__icontains=procurado)
        | Q(problema_relatado__icontains=procurado)
    )

    digitos = so_digitos(procurado)
    if len(digitos) >= DIGITOS_MINIMOS_PARA_TELEFONE:
        filtro |= Q(cliente__telefone__contains=digitos)
    if len(digitos) >= DIGITOS_MINIMOS_PARA_IMEI:
        filtro |= Q(aparelho__imei__contains=digitos)
    if procurado.isdigit():
        filtro |= Q(numero=int(procurado))

    return consulta.filter(filtro)


def por_situacao(consulta: QuerySet[OrdemServico], situacao: str) -> QuerySet[OrdemServico]:
    if situacao == "abertas":
        return consulta.exclude(status__in=ESTADOS_FINAIS)
    if situacao == "encerradas":
        return consulta.filter(status__in=ESTADOS_FINAIS)
    return consulta


def apenas_atrasadas(consulta: QuerySet[OrdemServico]) -> QuerySet[OrdemServico]:
    return consulta.exclude(status__in=ESTADOS_FINAIS).filter(
        prometida_para__lt=timezone.localdate()
    )


def ordenar(consulta: QuerySet[OrdemServico], chave: str) -> QuerySet[OrdemServico]:
    return consulta.order_by(*ORDENACOES.get(chave, ORDENACOES[ORDENACAO_PADRAO]))


def filtrar(
    consulta: QuerySet[OrdemServico], parametros: Mapping[str, str]
) -> QuerySet[OrdemServico]:
    busca = parametros.get("busca", "")
    if busca:
        consulta = por_texto(consulta, busca)

    situacao = parametros.get("situacao", "")
    if situacao:
        consulta = por_situacao(consulta, situacao)

    status = parametros.get("status", "")
    if status in StatusOS.values:
        consulta = consulta.filter(status=status)

    tecnico = parametros.get("tecnico", "")
    if tecnico == "sem":
        consulta = consulta.filter(tecnico__isnull=True)
    elif tecnico.isdigit():
        consulta = consulta.filter(tecnico_id=int(tecnico))

    loja = parametros.get("loja", "")
    if loja.isdigit():
        consulta = consulta.filter(loja_id=int(loja))

    if parametros.get("atrasadas") in {"1", "true", "sim"}:
        consulta = apenas_atrasadas(consulta)

    return ordenar(consulta, parametros.get("ordem", ORDENACAO_PADRAO))
