import io
from collections.abc import Callable
from datetime import timedelta
from pathlib import Path
from typing import Any

import pytest
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from PIL import Image
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from bancada.assinaturas.models import Assinatura
from bancada.auditoria.models import Acao, RegistroDeAuditoria
from bancada.ordens.models import OrdemServico
from bancada.tenants import logo
from bancada.tenants.models import Loja, Papel, Tenant, Usuario

TIPOS = {"PNG": "image/png", "JPEG": "image/jpeg", "WEBP": "image/webp"}
ASSINATURA_DO_PNG = b"\x89PNG\r\n\x1a\n"


@pytest.fixture(autouse=True)
def media_isolada(settings: Any, tmp_path: Path) -> None:
    settings.MEDIA_ROOT = str(tmp_path)


@pytest.fixture
def api_dono(tenant: Tenant) -> APIClient:
    dono = Usuario.objects.create_user(
        username="marcos",
        email="marcos@central.test",
        password="senha-de-teste",
        tenant=tenant,
        papel=Papel.DONO,
    )
    cliente_api = APIClient()
    token, _ = Token.objects.get_or_create(user=dono)
    cliente_api.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    return cliente_api


def imagem(largura: int = 300, altura: int = 100, formato: str = "PNG") -> SimpleUploadedFile:
    modo = "RGB" if formato == "JPEG" else "RGBA"
    figura = Image.new(modo, (largura, altura), (21, 128, 61, 0)[: len(modo)])
    figura.paste((21, 128, 61, 255)[: len(modo)], (largura // 4, 0, largura // 2, altura))
    destino = io.BytesIO()
    figura.save(destino, format=formato)
    return SimpleUploadedFile(f"logo.{formato.lower()}", destino.getvalue(), TIPOS[formato])


def enviar(cliente_api: APIClient, arquivo: Any = None) -> Any:
    return cliente_api.post(
        "/api/assistencia/logo/",
        {"arquivo": arquivo if arquivo is not None else imagem()},
        format="multipart",
    )


def logo_gravada(tenant: Tenant) -> Image.Image:
    tenant.refresh_from_db()
    with tenant.logo.open("rb") as arquivo:
        return Image.open(io.BytesIO(arquivo.read()))


def bytes_da_resposta(resposta: Any) -> bytes:
    return b"".join(resposta.streaming_content)


@pytest.mark.django_db
def test_dono_envia_a_logo_e_ela_aparece_nos_dados_da_assistencia(
    api_dono: APIClient, tenant: Tenant
) -> None:
    resposta = enviar(api_dono)

    assert resposta.status_code == 200
    enviada = resposta.json()["logo"]
    assert enviada["largura"] == 300
    assert enviada["altura"] == 100
    assert api_dono.get("/api/assistencia/").json()["logo"]["largura"] == 300

    registro = RegistroDeAuditoria.objects.get(acao=Acao.ASSISTENCIA_ALTERADA)
    assert registro.detalhe == "logo enviada"


@pytest.mark.django_db
def test_logo_vira_png_e_guarda_o_fundo_transparente(api_dono: APIClient, tenant: Tenant) -> None:
    enviar(api_dono)

    gravada = logo_gravada(tenant)
    assert gravada.format == "PNG"
    assert gravada.mode == "RGBA"
    alfa = gravada.getchannel("A")
    assert alfa.getpixel((0, 0)) == 0
    assert alfa.getpixel((100, 50)) == 255


@pytest.mark.django_db
@pytest.mark.parametrize("formato", ["JPEG", "WEBP"])
def test_jpeg_e_webp_tambem_sao_aceitos(api_dono: APIClient, tenant: Tenant, formato: str) -> None:
    assert enviar(api_dono, imagem(formato=formato)).status_code == 200

    assert logo_gravada(tenant).format == "PNG"


@pytest.mark.django_db
def test_logo_grande_e_reduzida_sem_perder_a_proporcao(api_dono: APIClient, tenant: Tenant) -> None:
    enviar(api_dono, imagem(2000, 1000))

    assert logo_gravada(tenant).size == (logo.LADO_MAXIMO_EM_PIXELS, 256)
    gravadas = Tenant.objects.filter(pk=tenant.pk).values_list("logo_largura", "logo_altura")
    assert gravadas.get() == (logo.LADO_MAXIMO_EM_PIXELS, 256)


@pytest.mark.django_db
def test_arquivo_que_nao_e_imagem_e_recusado(api_dono: APIClient, tenant: Tenant) -> None:
    texto = SimpleUploadedFile("logo.png", b"isto nao e uma imagem", "image/png")

    resposta = enviar(api_dono, texto)

    assert resposta.status_code == 400
    assert "não é uma imagem" in resposta.json()["arquivo"][0]
    tenant.refresh_from_db()
    assert not tenant.logo


@pytest.mark.django_db
def test_imagem_acima_do_limite_de_tamanho_e_recusada(
    api_dono: APIClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(logo, "TAMANHO_MAXIMO_EM_BYTES", 50)

    resposta = enviar(api_dono)

    assert resposta.status_code == 400
    assert "passa de" in resposta.json()["arquivo"][0]


@pytest.mark.django_db
def test_trocar_a_logo_apaga_o_arquivo_anterior(
    api_dono: APIClient,
    tenant: Tenant,
    django_capture_on_commit_callbacks: Callable[..., Any],
) -> None:
    enviar(api_dono)
    tenant.refresh_from_db()
    anterior = tenant.logo.name
    assert anterior

    with django_capture_on_commit_callbacks(execute=True):
        enviar(api_dono, imagem(120, 120))

    tenant.refresh_from_db()
    assert tenant.logo.name != anterior
    assert not tenant.logo.storage.exists(anterior)
    assert (tenant.logo_largura, tenant.logo_altura) == (120, 120)


@pytest.mark.django_db
def test_remover_a_logo_apaga_o_arquivo(
    api_dono: APIClient,
    tenant: Tenant,
    django_capture_on_commit_callbacks: Callable[..., Any],
) -> None:
    enviar(api_dono)
    tenant.refresh_from_db()
    anterior = tenant.logo.name
    assert anterior

    with django_capture_on_commit_callbacks(execute=True):
        resposta = api_dono.delete("/api/assistencia/logo/")

    assert resposta.status_code == 204
    tenant.refresh_from_db()
    assert not tenant.logo
    assert tenant.logo_largura is None
    assert not tenant.logo.storage.exists(anterior)
    assert api_dono.get("/api/assistencia/").json()["logo"] is None
    assert RegistroDeAuditoria.objects.filter(detalhe="logo removida").exists()


@pytest.mark.django_db
def test_so_o_dono_troca_ou_remove_a_logo(api_tecnico: APIClient, tenant: Tenant) -> None:
    assert enviar(api_tecnico).status_code == 403
    assert api_tecnico.delete("/api/assistencia/logo/").status_code == 403


@pytest.mark.django_db
def test_assistencia_so_para_consulta_nao_troca_a_logo(api_dono: APIClient, tenant: Tenant) -> None:
    Assinatura.objects.filter(tenant=tenant).update(
        teste_termina_em=timezone.localdate() - timedelta(days=1)
    )

    assert enviar(api_dono).status_code == 403


@pytest.mark.django_db
def test_link_assinado_entrega_a_logo(api_dono: APIClient) -> None:
    assinatura = enviar(api_dono).json()["logo"]["assinatura"]

    resposta = APIClient().get(f"/api/logos/arquivo/{assinatura}/")

    assert resposta.status_code == 200
    assert resposta["Content-Type"] == "image/png"
    assert bytes_da_resposta(resposta).startswith(ASSINATURA_DO_PNG)


@pytest.mark.django_db
def test_link_adulterado_vencido_ou_sem_logo_da_404(
    api_dono: APIClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    assinatura = enviar(api_dono).json()["logo"]["assinatura"]

    assert APIClient().get(f"/api/logos/arquivo/{assinatura}x/").status_code == 404

    monkeypatch.setattr(logo, "SEGUNDOS_DE_VALIDADE_DO_LINK", -1)
    assert APIClient().get(f"/api/logos/arquivo/{assinatura}/").status_code == 404
    monkeypatch.undo()

    api_dono.delete("/api/assistencia/logo/")
    assert APIClient().get(f"/api/logos/arquivo/{assinatura}/").status_code == 404


@pytest.mark.django_db
def test_pagina_publica_mostra_a_logo_da_assistencia(
    tenant_com_logo: Tenant, ordem: OrdemServico
) -> None:
    assistencia = APIClient().get(f"/api/publico/os/{ordem.token_publico}/").json()["assistencia"]

    assert assistencia["nome"] == "Assistência Central"
    assert assistencia["logo"]["largura"] == 240
    arquivo = APIClient().get(f"/api/logos/arquivo/{assistencia['logo']['assinatura']}/")
    assert arquivo.status_code == 200


@pytest.mark.django_db
def test_pagina_publica_sem_logo_continua_funcionando(ordem: OrdemServico) -> None:
    assistencia = APIClient().get(f"/api/publico/os/{ordem.token_publico}/").json()["assistencia"]

    assert assistencia["logo"] is None


@pytest.mark.django_db
def test_nome_da_loja_so_aparece_quando_a_assistencia_tem_mais_de_uma(
    tenant: Tenant, ordem: OrdemServico
) -> None:
    caminho = f"/api/publico/os/{ordem.token_publico}/"
    assert APIClient().get(caminho).json()["assistencia"]["loja"] == ""

    Loja.objects.create(tenant=tenant, nome="Filial Centro")
    cache.clear()
    assert APIClient().get(caminho).json()["assistencia"]["loja"] == "Matriz"
