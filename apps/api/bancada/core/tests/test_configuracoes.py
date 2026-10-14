import os
import subprocess
import sys

from django.conf import settings


def carregar_configuracoes(**variaveis: str | None) -> subprocess.CompletedProcess[str]:
    ambiente = dict(os.environ)
    for nome, valor in variaveis.items():
        if valor is None:
            ambiente.pop(nome, None)
        else:
            ambiente[nome] = valor
    return subprocess.run(
        [sys.executable, "-c", "import config.settings"],
        cwd=settings.BASE_DIR,
        env=ambiente,
        capture_output=True,
        text=True,
        check=False,
    )


def test_fora_do_desenvolvimento_a_chave_de_exemplo_e_recusada() -> None:
    resultado = carregar_configuracoes(
        DJANGO_DEBUG="0", DJANGO_SECRET_KEY="troque-esta-chave-em-producao"
    )

    assert resultado.returncode != 0
    assert "DJANGO_SECRET_KEY" in resultado.stderr


def test_fora_do_desenvolvimento_a_chave_e_obrigatoria() -> None:
    resultado = carregar_configuracoes(DJANGO_DEBUG="0", DJANGO_SECRET_KEY=None)

    assert resultado.returncode != 0


def test_fora_do_desenvolvimento_chave_curta_e_recusada() -> None:
    resultado = carregar_configuracoes(DJANGO_DEBUG="0", DJANGO_SECRET_KEY="curta-demais")

    assert resultado.returncode != 0


def test_fora_do_desenvolvimento_chave_propria_e_aceita() -> None:
    resultado = carregar_configuracoes(DJANGO_DEBUG="0", DJANGO_SECRET_KEY="k" * 60)

    assert resultado.returncode == 0, resultado.stderr


def test_no_desenvolvimento_a_chave_pode_faltar() -> None:
    resultado = carregar_configuracoes(DJANGO_DEBUG="1", DJANGO_SECRET_KEY=None)

    assert resultado.returncode == 0, resultado.stderr
