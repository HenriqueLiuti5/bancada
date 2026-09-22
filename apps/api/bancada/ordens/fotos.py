import uuid
from pathlib import Path

from django.db import models

from bancada.core.models import Carimbado

TAMANHO_MAXIMO_EM_BYTES = 8 * 1024 * 1024
EXTENSOES_ACEITAS = frozenset({".jpg", ".jpeg", ".png", ".webp", ".heic"})


class MomentoDaFoto(models.TextChoices):
    ENTRADA = "entrada", "Entrada"
    SAIDA = "saida", "Saída"


def caminho_do_arquivo(instancia: "FotoOrdem", nome_original: str) -> str:
    extensao = Path(nome_original).suffix.lower() or ".jpg"
    return f"ordens/{instancia.ordem.tenant_id}/{instancia.ordem_id}/{uuid.uuid4().hex}{extensao}"


class FotoOrdem(Carimbado):
    ordem = models.ForeignKey(
        "ordens.OrdemServico",
        on_delete=models.CASCADE,
        related_name="fotos",
    )
    arquivo = models.ImageField(upload_to=caminho_do_arquivo)
    momento = models.CharField(
        max_length=10,
        choices=MomentoDaFoto.choices,
        default=MomentoDaFoto.ENTRADA,
    )
    legenda = models.CharField(max_length=140, blank=True)

    class Meta:
        verbose_name = "foto da ordem"
        verbose_name_plural = "fotos da ordem"
        ordering = ["criado_em"]

    def __str__(self) -> str:
        return f"Foto {self.get_momento_display()} da OS #{self.ordem.numero}"
