import json
from typing import Any

import pytest
from rest_framework.test import APIClient

from bancada.avisos.models import AvisoDeStatus
from bancada.core.rls import aplicar_tenant
from bancada.ordens.estados import StatusOS
from bancada.ordens.models import OrdemServico, RegistroOS, TipoDeRegistro

COMENTARIO = "Cliente pediu para ligar antes de trocar a tela."


def comentar(api: APIClient, ordem: OrdemServico, texto: str) -> Any:
    return api.post(f"/api/ordens/{ordem.pk}/comentarios/", {"texto": texto}, format="json")


@pytest.mark.django_db
def test_qualquer_pessoa_da_equipe_comenta_sem_mudar_de_etapa(
    api_atendente: APIClient, ordem: OrdemServico
) -> None:
    resposta = comentar(api_atendente, ordem, f"  {COMENTARIO}  ")

    assert resposta.status_code == 201
    corpo = resposta.json()
    assert corpo["tipo"] == TipoDeRegistro.COMENTARIO
    assert corpo["texto"] == COMENTARIO
    assert corpo["usuario"] == "carla"
    ordem.refresh_from_db()
    assert ordem.status == StatusOS.RECEBIDO
    assert ordem.eventos.count() == 1
    assert not AvisoDeStatus.objects.exists()


@pytest.mark.django_db
def test_comentario_aparece_no_historico_da_ordem(
    api_tecnico: APIClient, ordem: OrdemServico
) -> None:
    comentar(api_tecnico, ordem, COMENTARIO)

    registros = api_tecnico.get(f"/api/ordens/{ordem.pk}/").json()["registros"]

    assert [(registro["usuario"], registro["texto"]) for registro in registros] == [
        ("joana", COMENTARIO)
    ]


@pytest.mark.django_db
def test_comentario_vazio_e_recusado(api_atendente: APIClient, ordem: OrdemServico) -> None:
    resposta = comentar(api_atendente, ordem, "   ")

    assert resposta.status_code == 400
    assert resposta.json()["texto"] == ["Escreva o comentário antes de enviar."]
    assert not RegistroOS.objects.exists()


@pytest.mark.django_db
def test_comentario_longo_demais_e_recusado(api_atendente: APIClient, ordem: OrdemServico) -> None:
    resposta = comentar(api_atendente, ordem, "a" * 2001)

    assert resposta.status_code == 400
    assert resposta.json()["texto"] == ["O comentário pode ter até 2.000 caracteres."]


@pytest.mark.django_db
def test_ordem_encerrada_continua_aceitando_comentario(
    api_atendente: APIClient, ordem: OrdemServico
) -> None:
    OrdemServico.objects.filter(pk=ordem.pk).update(status=StatusOS.ENTREGUE)

    resposta = comentar(api_atendente, ordem, "Cliente voltou dizendo que o toque falha.")

    assert resposta.status_code == 201


@pytest.mark.django_db
def test_cliente_nao_ve_os_comentarios(api_atendente: APIClient, ordem: OrdemServico) -> None:
    comentar(api_atendente, ordem, COMENTARIO)

    pagina = APIClient().get(f"/api/publico/os/{ordem.token_publico}/").json()

    assert "ligar antes" not in json.dumps(pagina)


@pytest.mark.django_db
def test_outra_assistencia_nao_comenta(api_intruso: APIClient, ordem: OrdemServico) -> None:
    resposta = comentar(api_intruso, ordem, "Olá")

    assert resposta.status_code == 404
    assert not RegistroOS.objects.exists()


@pytest.mark.django_db(transaction=False)
def test_comentarios_ficam_isolados_no_banco(api_atendente: APIClient, ordem: OrdemServico) -> None:
    comentar(api_atendente, ordem, COMENTARIO)

    aplicar_tenant(-1)

    assert RegistroOS.objects.count() == 0
