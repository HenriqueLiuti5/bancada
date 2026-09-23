from pathlib import Path
from typing import Any

import pytest
from rest_framework.test import APIClient

from bancada.clientes.models import Aparelho
from bancada.ordens import documentos
from bancada.ordens.estados import StatusOS
from bancada.ordens.models import FotoOS, ItemOrcamento, OrdemServico
from bancada.ordens.tests.test_fotos import imagem_enviada


@pytest.fixture(autouse=True)
def media_isolada(settings: Any, tmp_path: Path) -> None:
    settings.MEDIA_ROOT = str(tmp_path)


@pytest.mark.django_db
def test_comprovante_traz_o_que_o_cliente_assina(ordem: OrdemServico) -> None:
    html = documentos.html_do_comprovante(ordem)

    assert "Comprovante de entrada" in html
    assert ordem.cliente.nome in html
    assert "Moto G54" in html
    assert ordem.problema_relatado in html
    assert ordem.token_publico in html
    assert "Assinatura do cliente" in html


@pytest.mark.django_db
def test_comprovante_leva_o_qrcode_do_acompanhamento(ordem: OrdemServico) -> None:
    html = documentos.html_do_comprovante(ordem)

    assert "data:image/png;base64," in html


@pytest.mark.django_db
def test_comprovante_mostra_as_fotos_da_entrada(ordem: OrdemServico) -> None:
    FotoOS.registrar(ordem=ordem, enviado=imagem_enviada())

    html = documentos.html_do_comprovante(ordem)

    assert "Estado do aparelho na entrada" in html
    assert "data:image/jpeg;base64," in html


@pytest.mark.django_db
def test_nenhum_documento_imprime_a_senha_de_desbloqueio(
    ordem: OrdemServico, aparelho: Aparelho
) -> None:
    assert aparelho.senha_desbloqueio == "1234"

    for html in [documentos.html_do_comprovante(ordem), documentos.html_do_recibo(ordem)]:
        assert "1234" not in html
        assert "desbloqueio" not in html


@pytest.mark.django_db
def test_recibo_lista_pecas_servicos_e_total(ordem: OrdemServico) -> None:
    ItemOrcamento.objects.create(ordem=ordem, descricao="Conector de carga", valor="90.00")
    ItemOrcamento.objects.create(ordem=ordem, descricao="Mão de obra", valor="60.00")

    html = documentos.html_do_recibo(ordem)

    assert "Conector de carga" in html
    assert "150,00" in html
    assert "Recebi o aparelho" in html


@pytest.mark.django_db
def test_endpoint_do_comprovante_devolve_um_pdf(
    api_tecnico: APIClient, ordem: OrdemServico
) -> None:
    resposta = api_tecnico.get(f"/api/ordens/{ordem.pk}/comprovante/")

    assert resposta.status_code == 200
    assert resposta["Content-Type"] == "application/pdf"
    assert f"OS-{ordem.numero}-comprovante.pdf" in resposta["Content-Disposition"]
    assert resposta.content[:4] == b"%PDF"


@pytest.mark.django_db
def test_endpoint_do_recibo_devolve_um_pdf(api_tecnico: APIClient, ordem: OrdemServico) -> None:
    ordem.transicionar(StatusOS.EM_DIAGNOSTICO)

    resposta = api_tecnico.get(f"/api/ordens/{ordem.pk}/recibo/")

    assert resposta.status_code == 200
    assert resposta.content[:4] == b"%PDF"


@pytest.mark.django_db
def test_recibo_mostra_o_nome_de_cada_etapa_do_historico(ordem: OrdemServico) -> None:
    ordem.transicionar(StatusOS.EM_DIAGNOSTICO)
    ordem.transicionar(StatusOS.ORCAMENTO_ENVIADO)

    html = documentos.html_do_recibo(ordem)

    assert "Em diagnóstico" in html
    assert "Orçamento enviado" in html


@pytest.mark.django_db
def test_telefone_sai_formatado_no_documento(ordem: OrdemServico) -> None:
    ordem.cliente.telefone = "11988887777"
    ordem.cliente.save(update_fields=["telefone"])

    assert "(11) 98888-7777" in documentos.html_do_comprovante(ordem)


@pytest.mark.django_db
def test_intruso_nao_imprime_documento_de_ordem_alheia(
    api_intruso: APIClient, ordem: OrdemServico
) -> None:
    assert api_intruso.get(f"/api/ordens/{ordem.pk}/comprovante/").status_code == 404
    assert api_intruso.get(f"/api/ordens/{ordem.pk}/recibo/").status_code == 404


@pytest.mark.django_db
def test_sem_autenticacao_nao_ha_documento(ordem: OrdemServico) -> None:
    assert APIClient().get(f"/api/ordens/{ordem.pk}/comprovante/").status_code == 401
