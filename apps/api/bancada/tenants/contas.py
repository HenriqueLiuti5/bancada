from django.db import transaction
from django.utils import timezone

from bancada.tenants.models import Convite, Loja, Papel, Tenant, Usuario, normalizar_email
from bancada.tenants.tasks import (
    enviar_confirmacao_de_email,
    enviar_convite,
    enviar_recuperacao_de_senha,
)

VERSAO_DOS_TERMOS = "2026-09-rascunho"
NOME_DA_PRIMEIRA_LOJA = "Matriz"


class ConviteIndisponivel(Exception):
    pass


def criar_conta(*, tenant: Tenant, nome: str, email: str, senha: str, papel: str) -> Usuario:
    endereco = normalizar_email(email)
    return Usuario.objects.create_user(
        username=endereco,
        email=endereco,
        password=senha,
        first_name=nome.strip(),
        tenant=tenant,
        papel=papel,
    )


@transaction.atomic
def criar_assistencia(
    *, nome_da_assistencia: str, nome_do_dono: str, email: str, whatsapp: str, senha: str
) -> tuple[Tenant, Usuario]:
    tenant = Tenant.objects.create(
        nome=nome_da_assistencia.strip(),
        whatsapp=whatsapp,
        termos_aceitos_em=timezone.now(),
        versao_dos_termos=VERSAO_DOS_TERMOS,
    )
    Loja.objects.create(tenant=tenant, nome=NOME_DA_PRIMEIRA_LOJA, telefone=whatsapp)
    dono = criar_conta(tenant=tenant, nome=nome_do_dono, email=email, senha=senha, papel=Papel.DONO)
    return tenant, dono


def convite_valido(token: str, *, travar: bool = False) -> Convite:
    consulta = Convite.objects.select_related("tenant", "criado_por").filter(
        token=token, tenant__ativo=True
    )
    if travar:
        consulta = consulta.select_for_update(of=("self",))

    convite = consulta.first()
    if convite is None:
        raise ConviteIndisponivel("Convite não encontrado.")
    if convite.aceito:
        raise ConviteIndisponivel("Este convite já foi usado. Entre com o seu e-mail e senha.")
    if convite.expirado:
        raise ConviteIndisponivel("Este convite expirou. Peça um novo ao dono da assistência.")
    return convite


@transaction.atomic
def aceitar_convite(token: str, *, nome: str, email: str, senha: str) -> tuple[Tenant, Usuario]:
    convite = convite_valido(token, travar=True)
    usuario = criar_conta(
        tenant=convite.tenant, nome=nome, email=email, senha=senha, papel=convite.papel
    )
    if convite.email and normalizar_email(convite.email) == usuario.email:
        confirmar_email(usuario)

    convite.aceito_em = timezone.now()
    convite.usuario = usuario
    convite.save(update_fields=["aceito_em", "usuario", "atualizado_em"])
    return convite.tenant, usuario


def confirmar_email(usuario: Usuario) -> None:
    if usuario.email_confirmado:
        return
    usuario.email_confirmado_em = timezone.now()
    usuario.save(update_fields=["email_confirmado_em"])


def pedir_confirmacao_de_email(usuario: Usuario) -> None:
    usuario_id = usuario.pk
    transaction.on_commit(lambda: enviar_confirmacao_de_email.delay(usuario_id))


def pedir_recuperacao_de_senha(usuario: Usuario) -> None:
    usuario_id = usuario.pk
    transaction.on_commit(lambda: enviar_recuperacao_de_senha.delay(usuario_id))


def mandar_convite_por_email(convite: Convite) -> None:
    convite_id = convite.pk
    transaction.on_commit(lambda: enviar_convite.delay(convite_id))
