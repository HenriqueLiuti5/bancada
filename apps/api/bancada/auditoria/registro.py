import ipaddress
from typing import Any

from rest_framework.request import Request

from bancada.auditoria.models import Acao, RegistroDeAuditoria
from bancada.tenants.models import Tenant, Usuario


def registrar(
    *,
    tenant: Tenant | None,
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


def _endereco_valido(valor: str) -> str | None:
    try:
        return str(ipaddress.ip_address(valor.strip()))
    except ValueError:
        return None


def origem_do_pedido(request: Request) -> str | None:
    encaminhado: str = request.META.get("HTTP_X_FORWARDED_FOR", "")
    direto: str = request.META.get("REMOTE_ADDR") or ""
    return _endereco_valido(encaminhado.split(",")[-1]) or _endereco_valido(direto)


def _registrar_no_aparelho(
    request: Request, *, aparelho: Any, acao: str
) -> RegistroDeAuditoria | None:
    usuario = request.user if isinstance(request.user, Usuario) else None
    tenant = usuario.tenant if usuario else None
    if tenant is None:
        return None

    return registrar(
        tenant=tenant,
        usuario=usuario,
        acao=acao,
        objeto="aparelho",
        objeto_id=aparelho.pk,
        detalhe=str(aparelho),
        origem=origem_do_pedido(request),
    )


def registrar_acesso_a_senha(
    request: Request, *, aparelho: Any, permitido: bool
) -> RegistroDeAuditoria | None:
    acao = Acao.SENHA_VISTA if permitido else Acao.SENHA_NEGADA
    return _registrar_no_aparelho(request, aparelho=aparelho, acao=acao)


def registrar_troca_de_senha(request: Request, *, aparelho: Any) -> RegistroDeAuditoria | None:
    return _registrar_no_aparelho(request, aparelho=aparelho, acao=Acao.SENHA_ALTERADA)
