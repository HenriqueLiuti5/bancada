import io
from typing import IO, NamedTuple, cast

from django.core.files import File
from django.core.files.base import ContentFile
from django.core.signing import BadSignature, TimestampSigner
from django.db import models
from PIL import Image, ImageOps, UnidentifiedImageError


class MomentoDaFoto(models.TextChoices):
    ENTRADA = "entrada", "Na entrada"
    SAIDA = "saida", "Na entrega"


MEGABYTE = 1024 * 1024
TAMANHO_MAXIMO_EM_BYTES = 10 * MEGABYTE
LADO_MAXIMO_EM_PIXELS = 1600
QUALIDADE_DO_JPEG = 82
FORMATOS_ACEITOS = frozenset({"JPEG", "PNG", "WEBP"})
SEGUNDOS_DE_VALIDADE_DO_LINK = 900
SAL_DA_ASSINATURA = "bancada.foto"


class FotoInvalida(Exception):
    pass


class FotoNormalizada(NamedTuple):
    conteudo: ContentFile
    largura: int
    altura: int


def normalizar(enviado: File) -> FotoNormalizada:
    if enviado.size > TAMANHO_MAXIMO_EM_BYTES:
        raise FotoInvalida(f"A imagem passa de {TAMANHO_MAXIMO_EM_BYTES // MEGABYTE} MB.")

    try:
        original = Image.open(cast(IO[bytes], enviado))
        if original.format not in FORMATOS_ACEITOS:
            raise FotoInvalida("Formato não aceito. Envie JPEG, PNG ou WebP.")
        visivel = ImageOps.exif_transpose(original).convert("RGB")
    except FotoInvalida:
        raise
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError, ValueError) as erro:
        raise FotoInvalida("O arquivo enviado não é uma imagem que possamos abrir.") from erro

    visivel.thumbnail((LADO_MAXIMO_EM_PIXELS, LADO_MAXIMO_EM_PIXELS))

    destino = io.BytesIO()
    visivel.save(destino, format="JPEG", quality=QUALIDADE_DO_JPEG, optimize=True)

    return FotoNormalizada(
        conteudo=ContentFile(destino.getvalue()),
        largura=visivel.width,
        altura=visivel.height,
    )


def _assinador() -> TimestampSigner:
    return TimestampSigner(salt=SAL_DA_ASSINATURA)


def assinar(foto_id: int) -> str:
    return _assinador().sign(str(foto_id))


def identificar(assinatura: str) -> int | None:
    try:
        valor = _assinador().unsign(assinatura, max_age=SEGUNDOS_DE_VALIDADE_DO_LINK)
    except BadSignature:
        return None
    return int(valor)
