import os
import subprocess
import sys

from django.conf import settings


def carregar_configuracoes(
    codigo: str = "import config.settings", **variaveis: str | None
) -> subprocess.CompletedProcess[str]:
    ambiente = dict(os.environ)
    for nome, valor in variaveis.items():
        if valor is None:
            ambiente.pop(nome, None)
        else:
            ambiente[nome] = valor
    return subprocess.run(
        [sys.executable, "-c", codigo],
        cwd=settings.BASE_DIR,
        env=ambiente,
        capture_output=True,
        text=True,
        check=False,
    )


def ler_configuracao(expressao: str, **variaveis: str | None) -> str:
    resultado = carregar_configuracoes(
        f"import config.settings as s; print({expressao})", **variaveis
    )
    assert resultado.returncode == 0, resultado.stderr
    return resultado.stdout.strip()


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


def test_sem_bucket_as_fotos_ficam_no_disco() -> None:
    backend = ler_configuracao("s.STORAGES['default']['BACKEND']", S3_BUCKET=None)

    assert backend == "django.core.files.storage.FileSystemStorage"


def test_com_bucket_as_fotos_vao_para_o_armazenamento_s3() -> None:
    lido = ler_configuracao(
        "s.STORAGES['default']['BACKEND'], s.STORAGES['default']['OPTIONS']['bucket_name'], "
        "s.STORAGES['default']['OPTIONS']['endpoint_url'], "
        "s.STORAGES['default']['OPTIONS']['default_acl']",
        S3_BUCKET="bancada-fotos",
        S3_ENDPOINT_URL="https://armazenamento.exemplo.invalid",
    )

    assert lido == (
        "storages.backends.s3.S3Storage bancada-fotos https://armazenamento.exemplo.invalid None"
    )


def test_sem_dsn_o_monitoramento_fica_desligado() -> None:
    ativo = ler_configuracao("__import__('sentry_sdk').get_client().is_active()", SENTRY_DSN=None)

    assert ativo == "False"


def test_o_monitoramento_nao_envia_dados_pessoais() -> None:
    opcoes = ler_configuracao(
        "[__import__('sentry_sdk').get_client().options[nome] for nome in "
        "('send_default_pii', 'include_local_variables', 'max_request_body_size', "
        "'max_breadcrumbs')]",
        SENTRY_DSN="https://chave-publica@monitoramento.exemplo.invalid/1",
    )

    assert opcoes == "[False, False, 'never', 0]"
