import pytest
from django.core import mail
from pytest_django import DjangoCaptureOnCommitCallbacks
from rest_framework.test import APIClient

from bancada.tenants.models import Tenant

CADASTRO = {
    "assistencia": "Conserta Já",
    "nome": "Rafael Lima",
    "email": "rafael@consertaja.test",
    "whatsapp": "(21) 98765-4321",
    "senha": "bancada-2026-forte",
    "aceite_dos_termos": True,
}


def avisos_da_plataforma() -> list[mail.EmailMessage]:
    return [mensagem for mensagem in mail.outbox if "Nova assistência" in mensagem.subject]


@pytest.mark.django_db
@pytest.mark.usefixtures("conta_da_plataforma")
def test_cadastro_novo_avisa_a_conta_da_plataforma(
    django_capture_on_commit_callbacks: DjangoCaptureOnCommitCallbacks,
) -> None:
    with django_capture_on_commit_callbacks(execute=True):
        APIClient().post("/api/auth/cadastro/", CADASTRO, format="json")

    [aviso] = avisos_da_plataforma()
    assert aviso.to == ["henrique@bancada.test"]
    assert aviso.subject == "Nova assistência no Bancada: Conserta Já"
    corpo = str(aviso.body)
    assert "Rafael Lima" in corpo
    assert "rafael@consertaja.test" in corpo
    assert "(21) 98765-4321" in corpo
    assert (
        "https://wa.me/5521987654321?text=Ol%C3%A1%2C%20Rafael%21%20Aqui%20%C3%A9%20Henrique"
        in corpo
    )
    assert "/plataforma" in corpo


@pytest.mark.django_db
def test_sem_conta_da_plataforma_ninguem_e_avisado(
    django_capture_on_commit_callbacks: DjangoCaptureOnCommitCallbacks,
) -> None:
    with django_capture_on_commit_callbacks(execute=True):
        APIClient().post("/api/auth/cadastro/", CADASTRO, format="json")

    assert avisos_da_plataforma() == []
    assert len(mail.outbox) == 1


@pytest.mark.django_db
@pytest.mark.usefixtures("conta_da_plataforma")
def test_assistencia_criada_fora_do_cadastro_nao_gera_aviso(
    django_capture_on_commit_callbacks: DjangoCaptureOnCommitCallbacks,
) -> None:
    with django_capture_on_commit_callbacks(execute=True):
        Tenant.objects.create(nome="Criada pelo painel administrativo")

    assert avisos_da_plataforma() == []
