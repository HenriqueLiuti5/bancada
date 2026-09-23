import io
from pathlib import Path
from typing import Any

import pytest
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from rest_framework.test import APIClient

from bancada.core.rls import aplicar_tenant
from bancada.ordens import fotos
from bancada.ordens.models import FotoOS, OrdemServico
from bancada.tenants.models import Tenant

TIPOS = {"JPEG": "image/jpeg", "PNG": "image/png", "WEBP": "image/webp"}


@pytest.fixture(autouse=True)
def media_isolada(settings: Any, tmp_path: Path) -> None:
    settings.MEDIA_ROOT = str(tmp_path)
    cache.clear()


def imagem_enviada(
    largura: int = 800,
    altura: int = 600,
    formato: str = "JPEG",
    orientacao: int | None = None,
) -> SimpleUploadedFile:
    imagem = Image.new("RGB", (largura, altura), (120, 140, 160))
    destino = io.BytesIO()
    extras: dict[str, Any] = {}

    if orientacao is not None:
        exif = Image.Exif()
        exif[0x0112] = orientacao
        exif[0x0110] = "Camera de Teste"
        extras["exif"] = exif

    imagem.save(destino, format=formato, **extras)
    return SimpleUploadedFile("aparelho.jpg", destino.getvalue(), content_type=TIPOS[formato])


def bytes_da_resposta(resposta: Any) -> bytes:
    return b"".join(resposta.streaming_content)


def enviar(cliente_api: APIClient, ordem: OrdemServico, arquivo: Any = None, **campos: Any) -> Any:
    return cliente_api.post(
        f"/api/ordens/{ordem.pk}/fotos/",
        {"arquivo": arquivo if arquivo is not None else imagem_enviada(), **campos},
        format="multipart",
    )


@pytest.mark.django_db
def test_foto_enviada_aparece_no_detalhe_da_ordem(
    api_tecnico: APIClient, ordem: OrdemServico
) -> None:
    resposta = enviar(api_tecnico, ordem, legenda="Tela trincada")

    assert resposta.status_code == 201

    detalhe = api_tecnico.get(f"/api/ordens/{ordem.pk}/").json()
    assert [foto["legenda"] for foto in detalhe["fotos"]] == ["Tela trincada"]
    assert detalhe["fotos"][0]["momento"] == "entrada"


@pytest.mark.django_db
def test_imagem_grande_e_reduzida_ao_lado_maximo(
    api_tecnico: APIClient, ordem: OrdemServico
) -> None:
    corpo = enviar(api_tecnico, ordem, arquivo=imagem_enviada(4000, 3000)).json()

    assert corpo["largura"] == fotos.LADO_MAXIMO_EM_PIXELS
    assert corpo["altura"] == 1200


@pytest.mark.django_db
def test_metadados_da_camera_nao_sobrevivem_ao_envio(
    api_tecnico: APIClient, ordem: OrdemServico
) -> None:
    enviar(api_tecnico, ordem, arquivo=imagem_enviada(orientacao=1))

    guardada = Image.open(FotoOS.objects.get().arquivo.path)

    assert dict(guardada.getexif()) == {}


@pytest.mark.django_db
def test_orientacao_da_camera_e_aplicada_na_imagem(
    api_tecnico: APIClient, ordem: OrdemServico
) -> None:
    corpo = enviar(api_tecnico, ordem, arquivo=imagem_enviada(800, 600, orientacao=6)).json()

    assert (corpo["largura"], corpo["altura"]) == (600, 800)


@pytest.mark.django_db
def test_arquivo_que_nao_e_imagem_e_recusado(api_tecnico: APIClient, ordem: OrdemServico) -> None:
    texto = SimpleUploadedFile("nota.txt", b"isto nao e uma imagem", content_type="text/plain")

    resposta = enviar(api_tecnico, ordem, arquivo=texto)

    assert resposta.status_code == 400
    assert FotoOS.objects.count() == 0


@pytest.mark.django_db
def test_imagem_acima_do_limite_de_tamanho_e_recusada(
    api_tecnico: APIClient, ordem: OrdemServico, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(fotos, "TAMANHO_MAXIMO_EM_BYTES", 500)

    resposta = enviar(api_tecnico, ordem)

    assert resposta.status_code == 400
    assert FotoOS.objects.count() == 0


@pytest.mark.django_db
def test_link_assinado_entrega_a_imagem(api_tecnico: APIClient, ordem: OrdemServico) -> None:
    assinatura = enviar(api_tecnico, ordem).json()["assinatura"]

    resposta = APIClient().get(f"/api/fotos/arquivo/{assinatura}/")

    assert resposta.status_code == 200
    assert resposta["Content-Type"] == "image/jpeg"
    assert Image.open(io.BytesIO(bytes_da_resposta(resposta))).format == "JPEG"


@pytest.mark.django_db
def test_link_com_assinatura_adulterada_da_404(api_tecnico: APIClient, ordem: OrdemServico) -> None:
    assinatura = enviar(api_tecnico, ordem).json()["assinatura"]
    _, resto = assinatura.split(":", 1)

    assert APIClient().get(f"/api/fotos/arquivo/9999:{resto}/").status_code == 404


@pytest.mark.django_db
def test_link_fora_da_validade_da_404(
    api_tecnico: APIClient, ordem: OrdemServico, monkeypatch: pytest.MonkeyPatch
) -> None:
    assinatura = enviar(api_tecnico, ordem).json()["assinatura"]
    monkeypatch.setattr(fotos, "SEGUNDOS_DE_VALIDADE_DO_LINK", -1)

    assert APIClient().get(f"/api/fotos/arquivo/{assinatura}/").status_code == 404


@pytest.mark.django_db
def test_intruso_nao_envia_foto_para_ordem_alheia(
    api_intruso: APIClient, ordem: OrdemServico
) -> None:
    assert enviar(api_intruso, ordem).status_code == 404
    assert FotoOS.objects.count() == 0


@pytest.mark.django_db
def test_tecnico_de_outra_assistencia_nao_apaga_nem_esconde_foto_alheia(
    api_tecnico: APIClient, api_tecnico_intruso: APIClient, ordem: OrdemServico
) -> None:
    foto_id = enviar(api_tecnico, ordem).json()["id"]

    assert api_tecnico_intruso.delete(f"/api/fotos/{foto_id}/").status_code == 404
    assert (
        api_tecnico_intruso.patch(
            f"/api/fotos/{foto_id}/", {"visivel_ao_cliente": False}, format="json"
        ).status_code
        == 404
    )
    assert FotoOS.objects.filter(pk=foto_id).exists()


@pytest.mark.django_db
def test_apagar_a_foto_remove_o_arquivo_do_disco(
    api_tecnico: APIClient, ordem: OrdemServico
) -> None:
    foto_id = enviar(api_tecnico, ordem).json()["id"]
    caminho = Path(FotoOS.objects.get(pk=foto_id).arquivo.path)
    assert caminho.exists()

    assert api_tecnico.delete(f"/api/fotos/{foto_id}/").status_code == 204

    assert not caminho.exists()
    assert FotoOS.objects.count() == 0


@pytest.mark.django_db
def test_pagina_publica_mostra_as_fotos_do_aparelho(
    api_tecnico: APIClient, ordem: OrdemServico
) -> None:
    enviar(api_tecnico, ordem, legenda="Risco na traseira")

    corpo = APIClient().get(f"/api/publico/os/{ordem.token_publico}/").json()

    assert [foto["legenda"] for foto in corpo["fotos"]] == ["Risco na traseira"]

    assinatura = corpo["fotos"][0]["assinatura"]
    assert APIClient().get(f"/api/fotos/arquivo/{assinatura}/").status_code == 200


@pytest.mark.django_db
def test_foto_escondida_nao_aparece_na_pagina_publica(
    api_tecnico: APIClient, ordem: OrdemServico
) -> None:
    foto_id = enviar(api_tecnico, ordem).json()["id"]

    resposta = api_tecnico.patch(
        f"/api/fotos/{foto_id}/", {"visivel_ao_cliente": False}, format="json"
    )

    assert resposta.status_code == 200
    corpo = APIClient().get(f"/api/publico/os/{ordem.token_publico}/").json()
    assert corpo["fotos"] == []


@pytest.mark.django_db(transaction=False)
def test_a_trava_do_banco_vale_para_as_fotos(tenant: Tenant, ordem: OrdemServico) -> None:
    FotoOS.registrar(ordem=ordem, enviado=imagem_enviada())

    aplicar_tenant(-1)

    assert FotoOS.objects.count() == 0
