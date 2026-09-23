from typing import Any

from rest_framework.request import Request

from bancada.auditoria.models import Acao, RegistroDeAuditoria
from bancada.tenants.models import Tenant, Usuario


def registrar(
    *,
    tenant: Tenant,
    acao: str,
    objeto: str,
    objeto_id: int,
    usuario: Usuario | None = None,
    detalhe: str = "",
    origem: str | None = None,
) -> RegistroDeAuditoria:
    return RegistroDeAuditoria.objects.create(
        tenant=tenant,
        usuario=usuario,
        acao=acao,
        objeto=objeto,
        objeto_id=objeto_id,
        detalhe=detalhe[:200],
        origem=origem,
    )


def origem_do_pedido(request: Request) -> str | None:
    endereco: Any = request.META.get("REMOTE_ADDR")
    return endereco or None


def registrar_acesso_a_senha(
    request: Request, *, aparelho: Any, permitido: bool
) -> RegistroDeAuditoria | None:
    usuario = request.user if isinstance(request.user, Usuario) else None
    tenant = usuario.tenant if usuario else None
    if tenant is None:
        return None

    return registrar(
        tenant=tenant,
        usuario=usuario,
        acao=Acao.SENHA_VISTA if permitido else Acao.SENHA_NEGADA,
        objeto="aparelho",
        objeto_id=aparelho.pk,
        detalhe=str(aparelho),
        origem=origem_do_pedido(request),
    )
