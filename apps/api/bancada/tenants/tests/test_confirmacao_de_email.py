import time
from datetime import timedelta
from typing import Any
from urllib.parse import quote

import pytest
from django.core import mail
from pytest_django import DjangoCaptureOnCommitCallbacks
from rest_framework.test import APIClient

from bancada.tenants.links import VALIDADE_DA_CONFIRMACAO, link_de_confirmacao
from bancada.tenants.models import Usuario


def confirmar(link: str) -> Any:
    token = link.rsplit("/confirmar-email/", 1)[1]
    return APIClient().post("/api/auth/email/confirmar/", {"token": token}, format="json")


@pytest.mark.django_db
def test_link_confirma_o_email(tecnico: Usuario) -> None:
    resposta = confirmar(link_de_confirmacao(tecnico))

    assert resposta.status_code == 200
    assert resposta.json()["email"] == "joana@central.test"
    tecnico.refresh_from_db()
    assert tecnico.email_confirmado


@pytest.mark.django_db
def test_confirmar_de_novo_nao_da_erro(tecnico: Usuario) -> None:
    link = link_de_confirmacao(tecnico)

    assert confirmar(link).status_code == 200
    assert confirmar(link).status_code == 200


@pytest.mark.django_db
def test_link_de_um_email_antigo_nao_confirma_o_novo(tecnico: Usuario) -> None:
    link = link_de_confirmacao(tecnico)
    tecnico.email = "joana.nova@central.test"
    tecnico.save(update_fields=["email"])

    assert confirmar(link).status_code == 400
    tecnico.refresh_from_db()
    assert not tecnico.email_confirmado


@pytest.mark.django_db
def test_link_vencido_nao_confirma(tecnico: Usuario, monkeypatch: pytest.MonkeyPatch) -> None:
    vencimento = VALIDADE_DA_CONFIRMACAO + timedelta(minutes=1)
    no_passado = time.time() - vencimento.total_seconds()
    monkeypatch.setattr("django.core.signing.time.time", lambda: no_passado)
    link = link_de_confirmacao(tecnico)
    monkeypatch.undo()

    assert confirmar(link).status_code == 400


@pytest.mark.django_db
def test_token_so_usa_caracteres_que_nao_precisam_de_escape_na_url(tecnico: Usuario) -> None:
    token = link_de_confirmacao(tecnico).rsplit("/", 1)[1]

    assert quote(token, safe="") == token


@pytest.mark.django_db
def test_token_adulterado_e_recusado(tecnico: Usuario) -> None:
    assert confirmar(link_de_confirmacao(tecnico) + "x").status_code == 400


@pytest.mark.django_db
def test_reenvio_manda_novo_link(
    api_tecnico: APIClient, django_capture_on_commit_callbacks: DjangoCaptureOnCommitCallbacks
) -> None:
    with django_capture_on_commit_callbacks(execute=True):
        resposta = api_tecnico.post("/api/auth/email/reenviar/")

    assert resposta.status_code == 204
    assert len(mail.outbox) == 1
    assert "/confirmar-email/" in str(mail.outbox[0].body)


@pytest.mark.django_db
def test_reenvio_para_email_ja_confirmado_nao_manda_nada(
    tecnico: Usuario,
    api_tecnico: APIClient,
    django_capture_on_commit_callbacks: DjangoCaptureOnCommitCallbacks,
) -> None:
    confirmar(link_de_confirmacao(tecnico))

    with django_capture_on_commit_callbacks(execute=True):
        api_tecnico.post("/api/auth/email/reenviar/")

    assert mail.outbox == []
