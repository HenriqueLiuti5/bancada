import io
from typing import IO, Any, cast
from uuid import uuid4

from django.core.files import File
from django.core.files.base import ContentFile
from django.core.signing import BadSignature, TimestampSigner
from django.db import transaction
from PIL import Image, ImageOps, UnidentifiedImageError

from bancada.ordens.fotos import FORMATOS_ACEITOS, MEGABYTE, TAMANHO_MAXIMO_EM_BYTES
from bancada.tenants.models import Tenant

LADO_MAXIMO_EM_PIXELS = 512
SEGUNDOS_DE_VALIDADE_DO_LINK = 900
SAL_DA_ASSINATURA = "bancada.logo"


class LogoInvalida(Exception):
    pass


def normalizar(enviado: File) -> ContentFile:
    if enviado.size > TAMANHO_MAXIMO_EM_BYTES:
        raise LogoInvalida(f"A imagem passa de {TAMANHO_MAXIMO_EM_BYTES // MEGABYTE} MB.")

    try:
        original = Image.open(cast(IO[bytes], enviado))
        if original.format not in FORMATOS_ACEITOS:
            raise LogoInvalida("Formato não aceito. Envie PNG, JPEG ou WebP.")
        visivel = ImageOps.exif_transpose(original).convert("RGBA")
    except LogoInvalida:
        raise
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError, ValueError) as erro:
        raise LogoInvalida("O arquivo enviado não é uma imagem que possamos abrir.") from erro

    visivel.thumbnail((LADO_MAXIMO_EM_PIXELS, LADO_MAXIMO_EM_PIXELS))

    destino = io.BytesIO()
    visivel.save(destino, format="PNG", optimize=True)
    return ContentFile(destino.getvalue(), name="logo.png")


def _apagar_depois_de_gravar(tenant: Tenant, nome: str | None) -> None:
    if nome:
        transaction.on_commit(lambda: tenant.logo.storage.delete(nome))


def trocar(tenant: Tenant, enviado: File) -> None:
    conteudo = normalizar(enviado)
    anterior = tenant.logo.name
    tenant.logo.save(f"{uuid4().hex}.png", conteudo, save=True)
    _apagar_depois_de_gravar(tenant, anterior)


def remover(tenant: Tenant) -> None:
    anterior = tenant.logo.name
    tenant.logo = None
    tenant.save(update_fields=["logo", "logo_largura", "logo_altura", "atualizado_em"])
    _apagar_depois_de_gravar(tenant, anterior)


def conteudo(tenant: Tenant) -> bytes | None:
    if not tenant.logo:
        return None
    try:
        with tenant.logo.open("rb") as arquivo:
            return arquivo.read()
    except OSError:
        return None


def _assinador() -> TimestampSigner:
    return TimestampSigner(salt=SAL_DA_ASSINATURA)


def assinar(tenant_id: int) -> str:
    return _assinador().sign(str(tenant_id))


def identificar(assinatura: str) -> int | None:
    try:
        valor = _assinador().unsign(assinatura, max_age=SEGUNDOS_DE_VALIDADE_DO_LINK)
    except BadSignature:
        return None
    return int(valor)


def caber(
    tenant: Tenant, largura_maxima: float, altura_maxima: float
) -> tuple[float, float] | None:
    largura, altura = tenant.logo_largura, tenant.logo_altura
    if not tenant.logo or not largura or not altura:
        return None
    escala = min(largura_maxima / largura, altura_maxima / altura)
    return largura * escala, altura * escala


def para_exibir(tenant: Tenant) -> dict[str, Any] | None:
    if not tenant.logo:
        return None
    return {
        "assinatura": assinar(tenant.pk),
        "largura": tenant.logo_largura,
        "altura": tenant.logo_altura,
    }
