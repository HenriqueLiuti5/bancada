import logging

from celery import shared_task
from django.conf import settings
from django.db import transaction

from reparium.assinaturas import fundadores, regras, servicos
from reparium.assinaturas.models import Assinatura, SituacaoDaAssinatura
from reparium.assinaturas.planos import PLANOS
from reparium.assinaturas.provedor import ErroNoProvedor, provedor_configurado
from reparium.core.fuso import hoje_no_reparium
from reparium.tenants.models import Papel, Usuario
from reparium.tenants.tasks import REPETIR_SE_O_ENVIO_FALHAR, enviar

registrador = logging.getLogger(__name__)

SEM_DESTINO = "sem destino"
JA_ASSINOU = "ja assinou"
ENVIADO = "enviado"


def quando_termina(dias: int) -> str:
    if dias <= 0:
        return "hoje"
    if dias == 1:
        return "amanhã"
    return f"em {dias} dias"


@shared_task(name="assinaturas.avisar_fim_do_teste", **REPETIR_SE_O_ENVIO_FALHAR)
def avisar_fim_do_teste(assinatura_id: int) -> str:
    assinatura = Assinatura.objects.select_related("tenant").filter(pk=assinatura_id).first()
    if assinatura is None:
        return SEM_DESTINO
    if assinatura.contratada:
        return JA_ASSINOU

    donos = Usuario.objects.filter(
        tenant=assinatura.tenant, papel=Papel.DONO, is_active=True
    ).exclude(email="")
    quando = quando_termina(regras.dias_para_o_fim_do_teste(assinatura, hoje_no_reparium()))
    vagas_de_fundador = (
        fundadores.situacao_dos_fundadores()
        if fundadores.ganha_preco_de_fundador(assinatura.tenant)
        else None
    )
    precos = [condicoes.mensal for condicoes in PLANOS.values()]
    precos_de_fundador = [condicoes.fundador_mensal for condicoes in PLANOS.values()]

    for dono in donos:
        enviar(
            dono.email,
            f"Seu teste grátis do Reparium termina {quando}",
            "assinaturas/fim_do_teste.txt",
            {
                "primeiro_nome": dono.nome_de_exibicao.split()[0],
                "assistencia": assinatura.tenant.nome,
                "quando": quando,
                "teste_termina_em": assinatura.teste_termina_em,
                "menor_preco": min(precos),
                "maior_preco": max(precos),
                "fundadores": vagas_de_fundador,
                "menor_preco_de_fundador": min(precos_de_fundador),
                "maior_preco_de_fundador": max(precos_de_fundador),
                "link": f"{settings.APP_PUBLIC_URL}/assinatura",
            },
        )
    return ENVIADO if donos else SEM_DESTINO


@shared_task(name="assinaturas.revisar_assinaturas")
def revisar_assinaturas() -> int:
    hoje = hoje_no_reparium()
    mudaram = 0

    for assinatura in Assinatura.objects.exclude(situacao=SituacaoDaAssinatura.CANCELADA):
        antes = assinatura.situacao
        servicos.recalcular(assinatura, hoje)
        mudaram += assinatura.situacao != antes

        pendentes = regras.avisos_de_fim_do_teste_pendentes(assinatura, hoje)
        if pendentes:
            assinatura.avisos_de_fim_do_teste = [*assinatura.avisos_de_fim_do_teste, *pendentes]
            assinatura.save(update_fields=["avisos_de_fim_do_teste", "atualizado_em"])
            avisar_fim_do_teste.delay(assinatura.pk)

    return mudaram


@shared_task(name="assinaturas.sincronizar_cobrancas")
def sincronizar_cobrancas() -> int:
    hoje = hoje_no_reparium()
    provedor = provedor_configurado()
    sincronizadas = 0

    contratadas = (
        Assinatura.objects.select_related("tenant")
        .exclude(assinatura_no_provedor="")
        .exclude(situacao=SituacaoDaAssinatura.CANCELADA)
    )
    for assinatura in contratadas:
        try:
            with transaction.atomic():
                servicos.sincronizar(assinatura, provedor, hoje)
        except ErroNoProvedor as erro:
            registrador.warning(
                "Cobranças da %s não sincronizadas: %s", assinatura.tenant.nome, erro
            )
            continue
        sincronizadas += 1

    return sincronizadas
