from typing import Any

import pytest
from django.core import mail
from pytest_django import DjangoCaptureOnCommitCallbacks
from rest_framework.test import APIClient

from bancada.auditoria.models import Acao, RegistroDeAuditoria
from bancada.tenants.contas import VERSAO_DOS_TERMOS
from bancada.tenants.models import Loja, Papel, Tenant, Usuario

CADASTRO_VALIDO = {
    "assistencia": "Conserta Já",
    "nome": "Rafael Lima",
    "email": "Rafael@ConsertaJa.test",
    "whatsapp": "(21) 98765-4321",
    "senha": "bancada-2026-forte",
    "aceite_dos_termos": True,
}


def cadastrar(**mudancas: Any) -> Any:
    return APIClient().post("/api/auth/cadastro/", {**CADASTRO_VALIDO, **mudancas}, format="json")


@pytest.mark.django_db
def test_cadastro_cria_assistencia_loja_e_dono_de_uma_vez() -> None:
    resposta = cadastrar()

    assert resposta.status_code == 201
    tenant = Tenant.objects.get(nome="Conserta Já")
    assert tenant.whatsapp == "21987654321"
    assert tenant.versao_dos_termos == VERSAO_DOS_TERMOS
    assert tenant.termos_aceitos_em is not None

    loja = Loja.objects.get(tenant=tenant)
    assert loja.telefone == "21987654321"

    dono = Usuario.objects.get(tenant=tenant)
    assert dono.papel == Papel.DONO
    assert dono.email == "rafael@consertaja.test"
    assert dono.first_name == "Rafael Lima"
    assert dono.check_password("bancada-2026-forte")
    assert not dono.is_staff
    assert not dono.email_confirmado


@pytest.mark.django_db
def test_cadastro_ja_devolve_a_sessao_aberta() -> None:
    corpo = cadastrar().json()

    cliente_api = APIClient()
    cliente_api.credentials(HTTP_AUTHORIZATION=f"Token {corpo['token']}")
    eu = cliente_api.get("/api/auth/eu/").json()

    assert eu["papel"] == "dono"
    assert eu["tenant"]["nome"] == "Conserta Já"
    assert eu["email_confirmado"] is False


@pytest.mark.django_db
def test_cadastro_manda_o_email_de_confirmacao(
    django_capture_on_commit_callbacks: DjangoCaptureOnCommitCallbacks,
) -> None:
    with django_capture_on_commit_callbacks(execute=True):
        cadastrar()

    assert len(mail.outbox) == 1
    mensagem = mail.outbox[0]
    assert mensagem.to == ["rafael@consertaja.test"]
    assert "/confirmar-email/" in str(mensagem.body)


@pytest.mark.django_db
def test_cadastro_fica_na_auditoria() -> None:
    cadastrar()

    registro = RegistroDeAuditoria.objects.get(acao=Acao.ASSISTENCIA_CRIADA)
    assert registro.usuario is not None
    assert registro.usuario.email == "rafael@consertaja.test"
    assert VERSAO_DOS_TERMOS in registro.detalhe


@pytest.mark.django_db
def test_sem_aceite_dos_termos_nao_cria_nada() -> None:
    resposta = cadastrar(aceite_dos_termos=False)

    assert resposta.status_code == 400
    assert "aceite_dos_termos" in resposta.json()
    assert not Tenant.objects.exists()


@pytest.mark.django_db
def test_email_ja_usado_e_recusado_sem_diferenciar_maiusculas(tecnico: Usuario) -> None:
    resposta = cadastrar(email="JOANA@central.test")

    assert resposta.status_code == 400
    assert "email" in resposta.json()
    assert not Tenant.objects.filter(nome="Conserta Já").exists()


@pytest.mark.django_db
@pytest.mark.parametrize("numero", ["1234", "(00) 91234-5678", "91234-5678"])
def test_whatsapp_invalido_e_recusado(numero: str) -> None:
    resposta = cadastrar(whatsapp=numero)

    assert resposta.status_code == 400
    assert "whatsapp" in resposta.json()


@pytest.mark.django_db
def test_whatsapp_com_codigo_do_pais_e_aceito() -> None:
    assert cadastrar(whatsapp="+55 21 98765-4321").status_code == 201
    assert Tenant.objects.get().whatsapp == "21987654321"


@pytest.mark.django_db
def test_senha_fraca_e_recusada() -> None:
    resposta = cadastrar(senha="12345678")

    assert resposta.status_code == 400
    assert "senha" in resposta.json()
    assert not Tenant.objects.exists()


@pytest.mark.django_db
def test_senha_parecida_com_o_email_e_recusada() -> None:
    resposta = cadastrar(senha="rafael@consertaja")

    assert resposta.status_code == 400
    assert "senha" in resposta.json()


@pytest.mark.django_db
def test_duas_assistencias_com_o_mesmo_nome_convivem() -> None:
    assert cadastrar().status_code == 201
    assert cadastrar(email="outra@consertaja.test").status_code == 201

    slugs = set(Tenant.objects.values_list("slug", flat=True))
    assert len(slugs) == 2


@pytest.mark.django_db
def test_muitos_cadastros_do_mesmo_endereco_sao_barrados() -> None:
    respostas = [cadastrar(email=f"pessoa{numero}@teste.test").status_code for numero in range(12)]

    assert 429 in respostas
