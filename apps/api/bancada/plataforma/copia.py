import csv
import io
import logging
from datetime import datetime
from typing import IO, Any
from zipfile import ZIP_DEFLATED, ZipFile
from zoneinfo import ZoneInfo

from django.db import models
from django.utils import timezone

from bancada.assinaturas.models import Assinatura, Fatura
from bancada.auditoria.models import RegistroDeAuditoria
from bancada.avisos.models import AvisoDeStatus
from bancada.clientes.models import Aparelho, Cliente
from bancada.estoque.models import (
    ItemDaVenda,
    MovimentoDeEstoque,
    PagamentoDaVenda,
    Produto,
    Venda,
)
from bancada.financeiro.models import (
    ConferenciaDoCaixa,
    ContaAPagar,
    ContaFixa,
    MovimentoDoCaixa,
)
from bancada.ordens.models import (
    EventoOS,
    FotoOS,
    ItemOrcamento,
    OrdemServico,
    Pagamento,
    RegistroOS,
)
from bancada.tenants import logo
from bancada.tenants.models import Convite, Loja, Tenant, Usuario

registrador = logging.getLogger(__name__)

PLANILHAS: list[tuple[str, type[models.Model]]] = [
    ("assistencia", Tenant),
    ("lojas", Loja),
    ("equipe", Usuario),
    ("clientes", Cliente),
    ("aparelhos", Aparelho),
    ("ordens", OrdemServico),
    ("itens-do-orcamento", ItemOrcamento),
    ("etapas-das-ordens", EventoOS),
    ("historico-das-ordens", RegistroOS),
    ("pagamentos-das-ordens", Pagamento),
    ("fotos-das-ordens", FotoOS),
    ("produtos", Produto),
    ("movimentos-do-estoque", MovimentoDeEstoque),
    ("vendas", Venda),
    ("itens-das-vendas", ItemDaVenda),
    ("pagamentos-das-vendas", PagamentoDaVenda),
    ("contas-fixas", ContaFixa),
    ("contas-a-pagar", ContaAPagar),
    ("movimentos-do-caixa", MovimentoDoCaixa),
    ("conferencias-do-caixa", ConferenciaDoCaixa),
]

# A cobrança e a auditoria são registros do Bancada, o convite leva o link de entrar na equipe e
# o aviso guarda só o envio de cada e-mail ao cliente.
FORA_DA_COPIA: set[type[models.Model]] = {
    Assinatura,
    Fatura,
    RegistroDeAuditoria,
    Convite,
    AvisoDeStatus,
}

# Senhas, links secretos e o que só o sistema usa por dentro. Fotos e logo vão como arquivos.
CAMPOS_FORA_DA_COPIA = {
    "password",
    "senha_desbloqueio",
    "token_publico",
    "is_superuser",
    "is_staff",
    "da_plataforma",
    "tours_vistos",
    "primeiros_passos_escondidos",
    "slug",
    "ativo",
    "apagada_em",
    "logo",
    "logo_largura",
    "logo_altura",
    "arquivo",
}

LEIA_ME = """Cópia dos dados da {assistencia} no Bancada, feita em {dia}.

Cada arquivo .csv é uma tabela do sistema, com as colunas separadas por ponto e vírgula, e abre no
Excel ou no Google Planilhas. A coluna id identifica cada linha, e as colunas que terminam em _id
apontam para o id de outra tabela: o cliente_id de uma ordem é o id do cliente na tabela clientes.
Datas e horas estão no fuso da assistência.

As fotos das ordens ficam na pasta fotos, com o id da tabela fotos-das-ordens no nome do arquivo.
A senha de desbloqueio dos aparelhos não entra na cópia.
"""


def _da_assistencia(modelo: type[models.Model], tenant: Tenant) -> models.QuerySet[Any]:
    if modelo is Tenant:
        return Tenant.objects.filter(pk=tenant.pk)
    campos = {campo.name for campo in modelo._meta.get_fields()}
    filtro = "tenant" if "tenant" in campos else "ordem__tenant"
    return modelo._default_manager.filter(**{filtro: tenant})


def _celula(valor: Any, fuso: ZoneInfo) -> str:
    if valor is None:
        return ""
    if isinstance(valor, bool):
        return "sim" if valor else "não"
    if isinstance(valor, datetime):
        return timezone.localtime(valor, fuso).isoformat(timespec="seconds")
    return str(valor)


def _planilha(modelo: type[models.Model], consulta: models.QuerySet[Any], fuso: ZoneInfo) -> bytes:
    colunas = [
        campo.attname
        for campo in modelo._meta.concrete_fields
        if campo.name not in CAMPOS_FORA_DA_COPIA
    ]
    saida = io.StringIO()
    escritor = csv.writer(saida, delimiter=";")
    escritor.writerow(colunas)
    for linha in consulta.order_by("pk").values_list(*colunas):
        escritor.writerow([_celula(valor, fuso) for valor in linha])
    # O BOM faz o Excel abrir os acentos certos.
    return saida.getvalue().encode("utf-8-sig")


def exportar(tenant: Tenant, destino: IO[bytes]) -> None:
    fuso = ZoneInfo(tenant.fuso_horario)
    with ZipFile(destino, "w", ZIP_DEFLATED) as copia:
        dia = timezone.localdate(timezone=fuso).strftime("%d/%m/%Y")
        copia.writestr("LEIA-ME.txt", LEIA_ME.format(assistencia=tenant.nome, dia=dia))

        for nome, modelo in PLANILHAS:
            copia.writestr(f"{nome}.csv", _planilha(modelo, _da_assistencia(modelo, tenant), fuso))

        for foto in FotoOS.objects.filter(tenant=tenant).order_by("pk"):
            try:
                with foto.arquivo.open("rb") as arquivo:
                    copia.writestr(f"fotos/{foto.pk}.jpg", arquivo.read())
            except OSError:
                registrador.warning("A foto %s da %s não foi encontrada.", foto.pk, tenant.nome)

        conteudo_da_logo = logo.conteudo(tenant)
        if conteudo_da_logo:
            copia.writestr("logo.png", conteudo_da_logo)
