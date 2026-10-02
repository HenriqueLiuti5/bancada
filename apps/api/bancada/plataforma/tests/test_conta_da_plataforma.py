from collections.abc import Iterator

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError

from bancada.tenants.models import Usuario

SENHA_FORTE = "painel-2026-seguro"


@pytest.fixture
def senhas_digitadas(monkeypatch: pytest.MonkeyPatch) -> list[str]:
    digitadas = [SENHA_FORTE, SENHA_FORTE]
    respostas: Iterator[str] = iter(digitadas)
    monkeypatch.setattr(
        "bancada.plataforma.management.commands.criar_conta_da_plataforma.getpass",
        lambda _pergunta: next(respostas),
    )
    return digitadas


def criar(**opcoes: str) -> None:
    call_command(
        "criar_conta_da_plataforma",
        nome=opcoes.get("nome", "Henrique Liuti"),
        email=opcoes.get("email", "Henrique@Bancada.test"),
    )


@pytest.mark.django_db
@pytest.mark.usefixtures("senhas_digitadas")
def test_comando_cria_a_conta_da_plataforma() -> None:
    criar()

    conta = Usuario.objects.get(email="henrique@bancada.test")
    assert conta.da_plataforma is True
    assert conta.tenant is None
    assert conta.papel == ""
    assert conta.email_confirmado
    assert conta.check_password(SENHA_FORTE)


@pytest.mark.django_db
@pytest.mark.usefixtures("senhas_digitadas", "tecnico")
def test_email_que_ja_tem_conta_e_recusado() -> None:
    with pytest.raises(CommandError, match="Já existe uma conta"):
        criar(email="joana@central.test")


@pytest.mark.django_db
def test_senhas_diferentes_sao_recusadas(senhas_digitadas: list[str]) -> None:
    senhas_digitadas[1] = "outra-senha-qualquer"

    with pytest.raises(CommandError, match="não são iguais"):
        criar()

    assert not Usuario.objects.filter(da_plataforma=True).exists()


@pytest.mark.django_db
def test_senha_fraca_e_recusada(senhas_digitadas: list[str]) -> None:
    senhas_digitadas[:] = ["123", "123"]

    with pytest.raises(CommandError):
        criar()

    assert not Usuario.objects.filter(da_plataforma=True).exists()
