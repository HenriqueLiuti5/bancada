from dataclasses import dataclass

from bancada.auditoria.models import Acao, RegistroDeAuditoria
from bancada.avisos.models import AvisoDeStatus
from bancada.ordens.models import OrdemServico
from bancada.tenants.models import Loja, Tenant, Usuario


@dataclass(frozen=True)
class Passo:
    chave: str
    feito: bool


def abriu_a_primeira_ordem(tenant: Tenant) -> bool:
    return OrdemServico.objects.filter(tenant=tenant).exists()


def mandou_o_link_ao_cliente(tenant: Tenant) -> bool:
    avisou_por_email = AvisoDeStatus.objects.filter(
        tenant=tenant, enviado_em__isnull=False
    ).exists()
    compartilhou = RegistroDeAuditoria.objects.filter(
        tenant=tenant, acao=Acao.LINK_COMPARTILHADO
    ).exists()
    return avisou_por_email or compartilhou


def completou_o_endereco_da_loja(tenant: Tenant) -> bool:
    lojas = Loja.objects.filter(tenant=tenant)
    return lojas.exists() and not lojas.filter(endereco="").exists()


def convidou_a_equipe(tenant: Tenant) -> bool:
    convidou = RegistroDeAuditoria.objects.filter(tenant=tenant, acao=Acao.CONVITE_CRIADO).exists()
    return convidou or Usuario.objects.filter(tenant=tenant).count() > 1


def primeiros_passos(tenant: Tenant) -> list[Passo]:
    return [
        Passo("abrir-ordem", abriu_a_primeira_ordem(tenant)),
        Passo("mandar-link", mandou_o_link_ao_cliente(tenant)),
        Passo("endereco-da-loja", completou_o_endereco_da_loja(tenant)),
        Passo("convidar-equipe", convidou_a_equipe(tenant)),
    ]


def ordem_mais_recente(tenant: Tenant) -> int | None:
    return (
        OrdemServico.objects.filter(tenant=tenant)
        .order_by("-criado_em")
        .values_list("pk", flat=True)
        .first()
    )
