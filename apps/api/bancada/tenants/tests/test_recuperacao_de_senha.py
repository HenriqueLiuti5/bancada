import re
from typing import Any

import pytest
from django.core import mail
from pytest_django import DjangoCaptureOnCommitCallbacks
from rest_framework.test import APIClient

from bancada.auditoria.models import Acao, RegistroDeAuditoria
from bancada.tenants.links import link_de_recuperacao
from bancada.tenants.models import Usuario


def pedir(email: str) -> Any:
    return APIClient().post("/api/auth/senha/esqueci/", {"email": email}, format="json")


def redefinir(uid: str, token: str, senha: str = "nova-senha-2026") -> Any:
    return APIClient().post(
        "/api/auth/senha/redefinir/",
        {"uid": uid, "token": token, "senha": senha},
        format="json",
    )


def partes_do_link(link: str) -> tuple[str, str]:
    encontrado = re.search(r"/redefinir-senha/([^/\s]+)/([^/\s]+)", link)
    assert encontrado is not None
    return encontrado.group(1), encontrado.group(2)


@pytest.mark.django_db
def test_pedido_manda_o_link_para_o_email_da_conta(
    tecnico: Usuario, django_capture_on_commit_callbacks: DjangoCaptureOnCommitCallbacks
) -> None:
    with django_capture_on_commit_callbacks(execute=True):
        resposta = pedir("Joana@Central.test")

    assert resposta.status_code == 204
    assert len(mail.outbox) == 1
    assert mail.outbox[0].to == ["joana@central.test"]
    assert "/redefinir-senha/" in str(mail.outbox[0].body)


@pytest.mark.django_db
def test_email_desconhecido_responde_igual_e_nao_manda_nada(
    tecnico: Usuario, django_capture_on_commit_callbacks: DjangoCaptureOnCommitCallbacks
) -> None:
    with django_capture_on_commit_callbacks(execute=True):
        resposta = pedir("ninguem@central.test")

    assert resposta.status_code == 204
    assert mail.outbox == []


@pytest.mark.django_db
def test_conta_desativada_nao_recebe_link(
    tecnico: Usuario, django_capture_on_commit_callbacks: DjangoCaptureOnCommitCallbacks
) -> None:
    tecnico.is_active = False
    tecnico.save(update_fields=["is_active"])

    with django_capture_on_commit_callbacks(execute=True):
        pedir("joana@central.test")

    assert mail.outbox == []


@pytest.mark.django_db
def test_link_troca_a_senha_e_abre_a_sessao(tecnico: Usuario) -> None:
    uid, token = partes_do_link(link_de_recuperacao(tecnico))

    resposta = redefinir(uid, token)

    assert resposta.status_code == 200
    assert resposta.json()["token"]
    tecnico.refresh_from_db()
    assert tecnico.check_password("nova-senha-2026")
    assert tecnico.email_confirmado


@pytest.mark.django_db
def test_redefinir_derruba_as_sessoes_antigas(tecnico: Usuario, api_tecnico: APIClient) -> None:
    assert api_tecnico.get("/api/ordens/").status_code == 200
    uid, token = partes_do_link(link_de_recuperacao(tecnico))

    redefinir(uid, token)

    assert api_tecnico.get("/api/ordens/").status_code == 401


@pytest.mark.django_db
def test_link_so_funciona_uma_vez(tecnico: Usuario) -> None:
    uid, token = partes_do_link(link_de_recuperacao(tecnico))

    assert redefinir(uid, token).status_code == 200
    segunda = redefinir(uid, token, senha="outra-senha-2026")

    assert segunda.status_code == 400
    tecnico.refresh_from_db()
    assert tecnico.check_password("nova-senha-2026")


@pytest.mark.django_db
def test_token_adulterado_e_recusado(tecnico: Usuario) -> None:
    uid, _ = partes_do_link(link_de_recuperacao(tecnico))

    assert redefinir(uid, "abc-123").status_code == 400
    assert redefinir("lixo", "abc-123").status_code == 400


@pytest.mark.django_db
def test_senha_fraca_no_link_e_recusada_sem_gastar_o_link(tecnico: Usuario) -> None:
    uid, token = partes_do_link(link_de_recuperacao(tecnico))

    fraca = redefinir(uid, token, senha="12345678")

    assert fraca.status_code == 400
    assert "senha" in fraca.json()
    assert redefinir(uid, token).status_code == 200


@pytest.mark.django_db
def test_redefinicao_fica_na_auditoria(tecnico: Usuario) -> None:
    uid, token = partes_do_link(link_de_recuperacao(tecnico))

    redefinir(uid, token)

    registro = RegistroDeAuditoria.objects.get(acao=Acao.SENHA_REDEFINIDA)
    assert registro.usuario == tecnico
    assert "link" in registro.detalhe


@pytest.mark.django_db
def test_muitos_pedidos_sao_barrados(tecnico: Usuario) -> None:
    respostas = [pedir("joana@central.test").status_code for _ in range(12)]

    assert 429 in respostas
