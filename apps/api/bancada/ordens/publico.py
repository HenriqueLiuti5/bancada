from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any

from django.core.cache import cache
from django.utils import timezone

from bancada.ordens.estados import ESTADOS_FINAIS, StatusOS
from bancada.ordens.fotos import assinar
from bancada.ordens.models import FotoOS, OrdemServico

DIAS_ATE_O_LINK_EXPIRAR = 90
SEGUNDOS_DE_CACHE = 60
PREFIXO_DO_CACHE = "os_publica"

STATUS_QUE_REVELAM_ORCAMENTO = frozenset(
    {
        StatusOS.ORCAMENTO_ENVIADO,
        StatusOS.APROVADO,
        StatusOS.EM_REPARO,
        StatusOS.AGUARDANDO_PECA,
        StatusOS.PRONTO,
        StatusOS.ENTREGUE,
    }
)

MENSAGENS = {
    StatusOS.RECEBIDO: "Recebemos seu aparelho e ele entrou na fila.",
    StatusOS.EM_DIAGNOSTICO: "Estamos avaliando o aparelho para identificar o problema.",
    StatusOS.ORCAMENTO_ENVIADO: "O orçamento está pronto e aguarda sua aprovação.",
    StatusOS.APROVADO: "Orçamento aprovado. O reparo entrou na fila.",
    StatusOS.REPROVADO: "O orçamento foi recusado. O aparelho será devolvido sem reparo.",
    StatusOS.EM_REPARO: "Seu aparelho está sendo reparado.",
    StatusOS.AGUARDANDO_PECA: "Estamos aguardando a chegada de uma peça.",
    StatusOS.PRONTO: "Seu aparelho está pronto para retirada.",
    StatusOS.ENTREGUE: "Aparelho entregue. Obrigado pela confiança.",
    StatusOS.DEVOLVIDO_SEM_REPARO: "Aparelho devolvido sem reparo.",
}


def chave_do_cache(token: str) -> str:
    return f"{PREFIXO_DO_CACHE}:{token}"


def invalidar(token: str) -> None:
    cache.delete(chave_do_cache(token))


def link_expirou(dados: dict[str, Any]) -> bool:
    entregue_em = dados.get("entregue_em")
    if not entregue_em:
        return False
    momento = datetime.fromisoformat(entregue_em)
    return timezone.now() - momento > timedelta(days=DIAS_ATE_O_LINK_EXPIRAR)


def para_o_cliente(foto: FotoOS) -> dict[str, Any]:
    return {
        "assinatura": assinar(foto.pk),
        "momento": foto.momento,
        "momento_rotulo": foto.get_momento_display(),
        "legenda": foto.legenda,
        "largura": foto.largura,
        "altura": foto.altura,
    }


def orcamento_para_o_cliente(ordem: OrdemServico) -> dict[str, Any]:
    itens = list(ordem.itens.all())
    if ordem.orcamento_aprovado:
        itens = [item for item in itens if item.aprovado]

    return {
        "aprovado": ordem.orcamento_aprovado,
        "total": str(sum((item.valor for item in itens), Decimal("0.00"))),
        "itens": [{"descricao": item.descricao, "valor": str(item.valor)} for item in itens],
    }


def montar(ordem: OrdemServico) -> dict[str, Any]:
    linha_do_tempo = [
        {
            "status": evento.para_status,
            "rotulo": StatusOS(evento.para_status).label,
            "em": evento.criado_em.isoformat(),
        }
        for evento in ordem.eventos.all()
    ]

    dados: dict[str, Any] = {
        "numero": ordem.numero,
        "status": ordem.status,
        "status_rotulo": ordem.get_status_display(),
        "mensagem": MENSAGENS.get(StatusOS(ordem.status), ""),
        "encerrada": ordem.status in ESTADOS_FINAIS,
        "aparelho": f"{ordem.aparelho.marca} {ordem.aparelho.modelo}",
        "cliente_primeiro_nome": ordem.cliente.nome.split()[0],
        "assistencia": {
            "nome": ordem.tenant.nome,
            "telefone": ordem.loja.telefone,
        },
        "aberta_em": ordem.criado_em.isoformat(),
        "prometida_para": ordem.prometida_para.isoformat() if ordem.prometida_para else None,
        "entregue_em": ordem.entregue_em.isoformat() if ordem.entregue_em else None,
        "linha_do_tempo": linha_do_tempo,
        "fotos": [para_o_cliente(foto) for foto in ordem.fotos.all() if foto.visivel_ao_cliente],
    }

    if ordem.status in STATUS_QUE_REVELAM_ORCAMENTO:
        dados["orcamento"] = orcamento_para_o_cliente(ordem)

    return dados


def buscar(token: str) -> dict[str, Any] | None:
    guardado = cache.get(chave_do_cache(token))
    if guardado is not None:
        return guardado

    ordem = (
        OrdemServico.objects.select_related("cliente", "aparelho", "tenant", "loja")
        .prefetch_related("eventos", "itens", "fotos")
        .filter(token_publico=token)
        .first()
    )
    if ordem is None:
        return None

    dados = montar(ordem)
    cache.set(chave_do_cache(token), dados, SEGUNDOS_DE_CACHE)
    return dados
