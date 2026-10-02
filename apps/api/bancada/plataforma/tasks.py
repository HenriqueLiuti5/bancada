from celery import shared_task
from django.conf import settings
from django.db import transaction

from bancada.assinaturas.models import Assinatura
from bancada.core.telefones import link_do_whatsapp
from bancada.tenants.models import Papel, Tenant, Usuario
from bancada.tenants.tasks import REPETIR_SE_O_ENVIO_FALHAR, enviar

SEM_DESTINO = "sem destino"
ENVIADO = "enviado"


def mensagem_de_boas_vindas(dono: Usuario | None, conta: Usuario, assistencia: Tenant) -> str:
    saudacao = f"Olá, {dono.nome_de_exibicao.split()[0]}!" if dono else "Olá!"
    return (
        f"{saudacao} Aqui é {conta.nome_de_exibicao.split()[0]}, do Bancada. "
        f"Vi que a {assistencia.nome} se cadastrou. Posso ajudar em alguma coisa?"
    )


@shared_task(name="plataforma.avisar_cadastro", **REPETIR_SE_O_ENVIO_FALHAR)
def avisar_cadastro(tenant_id: int) -> str:
    assistencia = Tenant.objects.filter(pk=tenant_id).first()
    contas = Usuario.objects.filter(da_plataforma=True, is_active=True).exclude(email="")
    if assistencia is None or not contas:
        return SEM_DESTINO

    dono = assistencia.usuarios.filter(papel=Papel.DONO).order_by("date_joined").first()
    assinatura = Assinatura.objects.filter(tenant=assistencia).first()

    for conta in contas:
        enviar(
            conta.email,
            f"Nova assistência no Bancada: {assistencia.nome}",
            "plataforma/novo_cadastro.txt",
            {
                "assistencia": assistencia.nome,
                "dono": dono.nome_de_exibicao if dono else "",
                "email": dono.email if dono else "",
                "whatsapp": assistencia.whatsapp,
                "cadastro": assistencia.criado_em,
                "teste_termina_em": assinatura.teste_termina_em if assinatura else None,
                "link_do_whatsapp": link_do_whatsapp(
                    assistencia.whatsapp, mensagem_de_boas_vindas(dono, conta, assistencia)
                ),
                "link_do_painel": f"{settings.APP_PUBLIC_URL}/plataforma",
            },
        )
    return ENVIADO


def avisar_a_plataforma_do_cadastro(assistencia: Tenant) -> None:
    tenant_id = assistencia.pk
    transaction.on_commit(lambda: avisar_cadastro.delay(tenant_id))
