import logging
from datetime import date

from django.conf import settings
from django.utils import timezone

from bancada.assinaturas import regras
from bancada.assinaturas.models import (
    Assinatura,
    Fatura,
    SituacaoDaAssinatura,
    SituacaoDaFatura,
)
from bancada.assinaturas.provedor import (
    Cobranca,
    ErroNoProvedor,
    EventoRecebido,
    ProvedorDeCobranca,
    provedor_configurado,
)
from bancada.core.rls import aplicar_tenant
from bancada.tenants.models import Tenant

registrador = logging.getLogger(__name__)

DESCRICAO_DA_ASSINATURA = "Assinatura mensal do Bancada"
PROCESSADO = "processado"
IGNORADO = "ignorado"


class AssinaturaIndisponivel(Exception):
    pass


def referencia_da_assistencia(tenant: Tenant) -> str:
    return f"assistencia-{tenant.pk}"


def abrir_teste(tenant: Tenant, hoje: date) -> Assinatura:
    assinatura, _ = Assinatura.objects.get_or_create(
        tenant=tenant, defaults={"teste_termina_em": regras.fim_do_teste(hoje)}
    )
    return assinatura


def guardar_cobranca(assinatura: Assinatura, cobranca: Cobranca) -> Fatura:
    fatura, _ = Fatura.objects.update_or_create(
        id_no_provedor=cobranca.id,
        defaults={
            "tenant_id": assinatura.tenant_id,
            "assinatura": assinatura,
            "valor": cobranca.valor,
            "vencimento": cobranca.vencimento,
            "situacao": cobranca.situacao,
            "forma_de_pagamento": cobranca.forma,
            "paga_em": cobranca.paga_em,
            "link_de_pagamento": cobranca.link,
        },
    )
    return fatura


def recalcular(assinatura: Assinatura, hoje: date) -> Assinatura:
    situacao = regras.retrato(assinatura, hoje).situacao
    if assinatura.situacao != situacao:
        assinatura.situacao = situacao
        assinatura.save(update_fields=["situacao", "atualizado_em"])
    return assinatura


def sincronizar(assinatura: Assinatura, provedor: ProvedorDeCobranca, hoje: date) -> Assinatura:
    for cobranca in provedor.cobrancas_da_assinatura(assinatura.assinatura_no_provedor):
        guardar_cobranca(assinatura, cobranca)
    return recalcular(assinatura, hoje)


def _garantir_cliente(
    assinatura: Assinatura, provedor: ProvedorDeCobranca, *, documento: str, email: str
) -> None:
    if assinatura.cliente_no_provedor and assinatura.documento_do_pagador == documento:
        return

    assinatura.cliente_no_provedor = provedor.criar_cliente(
        nome=assinatura.tenant.nome,
        documento=documento,
        email=email,
        referencia=referencia_da_assistencia(assinatura.tenant),
    )
    assinatura.documento_do_pagador = documento
    assinatura.save(update_fields=["cliente_no_provedor", "documento_do_pagador", "atualizado_em"])


def assinar(
    tenant: Tenant,
    *,
    documento: str,
    email: str,
    hoje: date,
    provedor: ProvedorDeCobranca | None = None,
) -> Assinatura:
    provedor = provedor or provedor_configurado()
    assinatura = Assinatura.objects.select_for_update().select_related("tenant").get(tenant=tenant)
    if assinatura.contratada:
        raise AssinaturaIndisponivel("A assistência já tem uma assinatura ativa.")

    _garantir_cliente(assinatura, provedor, documento=documento, email=email)

    valor = settings.VALOR_DA_ASSINATURA
    assinatura.assinatura_no_provedor = provedor.criar_assinatura(
        cliente=assinatura.cliente_no_provedor,
        valor=valor,
        primeiro_vencimento=regras.primeiro_vencimento(assinatura, hoje),
        descricao=DESCRICAO_DA_ASSINATURA,
        referencia=referencia_da_assistencia(tenant),
    )
    assinatura.valor_mensal = valor
    assinatura.assinada_em = timezone.now()
    assinatura.cancelada_em = None
    assinatura.acesso_ate = None
    assinatura.situacao = SituacaoDaAssinatura.ATIVA
    assinatura.save()

    try:
        return sincronizar(assinatura, provedor, hoje)
    except ErroNoProvedor as erro:
        registrador.warning("A primeira fatura da %s fica para depois: %s", tenant.nome, erro)
        return assinatura


def encerrar(assinatura: Assinatura, hoje: date) -> Assinatura:
    assinatura.acesso_ate = regras.acesso_depois_do_cancelamento(assinatura, hoje)
    assinatura.situacao = SituacaoDaAssinatura.CANCELADA
    assinatura.cancelada_em = timezone.now()
    assinatura.save(update_fields=["acesso_ate", "situacao", "cancelada_em", "atualizado_em"])
    assinatura.faturas.filter(
        situacao__in=[SituacaoDaFatura.ABERTA, SituacaoDaFatura.VENCIDA]
    ).update(situacao=SituacaoDaFatura.CANCELADA)
    return assinatura


def cancelar(
    tenant: Tenant, *, hoje: date, provedor: ProvedorDeCobranca | None = None
) -> Assinatura:
    provedor = provedor or provedor_configurado()
    assinatura = Assinatura.objects.select_for_update().get(tenant=tenant)
    if not assinatura.contratada:
        raise AssinaturaIndisponivel("Não há assinatura ativa para cancelar.")

    provedor.cancelar_assinatura(assinatura.assinatura_no_provedor)
    return encerrar(assinatura, hoje)


def _assinatura_da_cobranca(cobranca: Cobranca) -> Assinatura | None:
    if cobranca.assinatura:
        assinatura = Assinatura.objects.filter(assinatura_no_provedor=cobranca.assinatura).first()
        if assinatura is not None:
            return assinatura

    fatura = Fatura.objects.select_related("assinatura").filter(id_no_provedor=cobranca.id).first()
    return fatura.assinatura if fatura else None


def processar_evento(evento: EventoRecebido, hoje: date) -> str:
    if evento.cobranca is not None:
        assinatura = _assinatura_da_cobranca(evento.cobranca)
        if assinatura is None:
            return IGNORADO
        aplicar_tenant(assinatura.tenant_id)
        guardar_cobranca(assinatura, evento.cobranca)
        recalcular(assinatura, hoje)
        return PROCESSADO

    if evento.assinatura_encerrada:
        assinatura = Assinatura.objects.filter(
            assinatura_no_provedor=evento.assinatura_encerrada
        ).first()
        if assinatura is None or not assinatura.contratada:
            return IGNORADO
        aplicar_tenant(assinatura.tenant_id)
        encerrar(assinatura, hoje)
        return PROCESSADO

    return IGNORADO
