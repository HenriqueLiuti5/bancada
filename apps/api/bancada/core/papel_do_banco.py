from collections.abc import Iterable
from dataclasses import dataclass
from typing import Any

from django.core.checks import CheckMessage, Error, Tags, register
from django.core.checks import Warning as Aviso
from django.db import connections


@dataclass(frozen=True)
class PapelDoBanco:
    nome: str
    superusuario: bool
    ignora_rls: bool
    cria_bancos: bool
    tabelas_proprias: int


def ler_o_papel(alias: str = "default") -> PapelDoBanco:
    with connections[alias].cursor() as cursor:
        cursor.execute(
            """
            SELECT r.rolname, r.rolsuper, r.rolbypassrls, r.rolcreatedb,
                   (SELECT count(*) FROM pg_tables
                     WHERE schemaname = 'public' AND tableowner = current_user)
              FROM pg_roles r
             WHERE r.rolname = current_user
            """
        )
        nome, superusuario, ignora_rls, cria_bancos, tabelas_proprias = cursor.fetchone()
    return PapelDoBanco(nome, superusuario, ignora_rls, cria_bancos, tabelas_proprias)


def problemas_do_papel(papel: PapelDoBanco) -> list[CheckMessage]:
    problemas: list[CheckMessage] = []
    if papel.superusuario or papel.ignora_rls:
        problemas.append(
            Error(
                f"O papel {papel.nome} passa por cima do isolamento entre assistências (RLS).",
                hint="Use em POSTGRES_APP_USER o papel da aplicação, sem superusuário nem "
                "BYPASSRLS. Ver infra/producao/postgres/papeis.sql.",
                id="bancada.E001",
            )
        )
    if papel.tabelas_proprias:
        problemas.append(
            Aviso(
                f"O papel {papel.nome} é dono de {papel.tabelas_proprias} tabelas e poderia "
                "desligar o isolamento entre assistências.",
                hint="As tabelas devem pertencer ao papel das migrações, e a aplicação só ler e "
                "gravar nelas.",
                id="bancada.W001",
            )
        )
    if papel.cria_bancos:
        problemas.append(
            Aviso(
                f"O papel {papel.nome} pode criar bancos, o que só os testes usam.",
                id="bancada.W002",
            )
        )
    return problemas


@register(Tags.database, deploy=True)
def conferir_o_papel_do_banco(
    app_configs: Any, databases: Iterable[str] | None = None, **kwargs: Any
) -> list[CheckMessage]:
    if not databases or "default" not in databases:
        return []
    if connections["default"].vendor != "postgresql":
        return []
    return problemas_do_papel(ler_o_papel("default"))
