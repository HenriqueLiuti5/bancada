from django.core.files.storage import Storage
from django.db import transaction
from django.utils import timezone

from bancada.assinaturas import servicos
from bancada.assinaturas.models import Assinatura, Fatura
from bancada.assinaturas.provedor import ProvedorDeCobranca
from bancada.auditoria.models import Acao, RegistroDeAuditoria
from bancada.auditoria.registro import registrar
from bancada.auditoria.tasks import REGISTROS_DE_ACESSO
from bancada.core.fuso import hoje_no_bancada
from bancada.core.rls import ver_todas_as_assistencias
from bancada.estoque.models import MovimentoDeEstoque
from bancada.ordens import publico
from bancada.ordens.models import OrdemServico
from bancada.tenants.models import Papel, Tenant, Usuario

A_PEDIDO_DO_DONO = "a pedido do dono"
SO_PARA_CONSULTA = "6 meses seguidos só para consulta"
NOME_DA_FICHA = "Assistência apagada"


def assistencia_do_dono(email: str) -> Tenant | None:
    dono = Usuario.pelo_email(email)
    if dono is None or dono.papel != Papel.DONO:
        return None
    return dono.tenant


def _ficha_das_cobrancas(tenant: Tenant) -> Tenant:
    # As cobranças ficam pelo prazo da lei fiscal numa assistência sem nenhum dado. O bulk_create
    # não dispara o sinal que abre um teste grátis para cada assistência nova.
    [ficha] = Tenant.objects.bulk_create(
        [
            Tenant(
                nome=NOME_DA_FICHA,
                slug=f"apagada-{tenant.pk}",
                fuso_horario=tenant.fuso_horario,
                ativo=False,
                apagada_em=timezone.now(),
                termos_aceitos_em=tenant.termos_aceitos_em,
                versao_dos_termos=tenant.versao_dos_termos,
            )
        ]
    )
    Tenant.objects.filter(pk=ficha.pk).update(criado_em=tenant.criado_em)
    return ficha


def _limpar_depois(armazenamento: Storage, logo: str | None, tokens: list[str]) -> None:
    if logo:
        armazenamento.delete(logo)
    for token in tokens:
        publico.invalidar(token)


@transaction.atomic
def apagar_assistencia(
    tenant: Tenant, *, motivo: str, provedor: ProvedorDeCobranca | None = None
) -> Tenant:
    ver_todas_as_assistencias()
    assinatura = Assinatura.objects.filter(tenant=tenant).first()
    if assinatura is not None and assinatura.contratada:
        servicos.cancelar(tenant, hoje=hoje_no_bancada(), provedor=provedor)

    ficha = _ficha_das_cobrancas(tenant)
    Assinatura.objects.filter(tenant=tenant).update(tenant=ficha, documento_do_pagador="")
    Fatura.objects.filter(tenant=tenant).update(
        tenant=ficha, link_de_pagamento="", link_da_devolucao=""
    )
    # Os registros de acesso ficam os 6 meses do Marco Civil, ligados só ao e-mail de quem entrou.
    RegistroDeAuditoria.objects.filter(tenant=tenant, acao__in=REGISTROS_DE_ACESSO).update(
        tenant=None
    )

    id_da_assistencia = tenant.pk
    tokens = list(
        OrdemServico.objects.filter(tenant=tenant).values_list("token_publico", flat=True)
    )
    logo, armazenamento = tenant.logo.name, tenant.logo.storage

    # A ordem protege a loja, o cliente e o aparelho, e o estoque guarda de que ordem saiu cada
    # peça: as duas saem antes, e o resto vai junto com a assistência.
    MovimentoDeEstoque.objects.filter(tenant=tenant).delete()
    OrdemServico.objects.filter(tenant=tenant).delete()
    tenant.delete()

    registrar(
        tenant=None,
        acao=Acao.ASSISTENCIA_APAGADA,
        objeto="assistencia",
        objeto_id=id_da_assistencia,
        detalhe=motivo,
    )
    transaction.on_commit(lambda: _limpar_depois(armazenamento, logo, tokens))
    return ficha
