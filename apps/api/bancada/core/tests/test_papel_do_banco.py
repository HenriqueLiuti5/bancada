import pytest

from bancada.core.papel_do_banco import (
    PapelDoBanco,
    conferir_o_papel_do_banco,
    ler_o_papel,
    problemas_do_papel,
)


def papel(**diferencas: object) -> PapelDoBanco:
    valores: dict[str, object] = {
        "nome": "bancada_app",
        "superusuario": False,
        "ignora_rls": False,
        "cria_bancos": False,
        "tabelas_proprias": 0,
    }
    valores.update(diferencas)
    return PapelDoBanco(**valores)  # type: ignore[arg-type]


def ids(problemas: list) -> set[str]:
    return {problema.id for problema in problemas}


def test_o_papel_de_producao_passa_sem_problemas() -> None:
    assert problemas_do_papel(papel()) == []


def test_superusuario_e_recusado_porque_ignora_o_rls() -> None:
    assert ids(problemas_do_papel(papel(superusuario=True))) == {"bancada.E001"}


def test_papel_com_bypassrls_e_recusado() -> None:
    assert ids(problemas_do_papel(papel(ignora_rls=True))) == {"bancada.E001"}


def test_dono_das_tabelas_gera_aviso() -> None:
    problemas = problemas_do_papel(papel(tabelas_proprias=12))

    assert ids(problemas) == {"bancada.W001"}
    assert "12 tabelas" in problemas[0].msg


def test_papel_que_cria_bancos_gera_aviso() -> None:
    assert ids(problemas_do_papel(papel(cria_bancos=True))) == {"bancada.W002"}


@pytest.mark.django_db
def test_le_o_papel_da_conexao() -> None:
    lido = ler_o_papel()

    assert lido.nome
    assert not lido.superusuario, "os testes precisam rodar sem superusuário para o RLS valer"


@pytest.mark.django_db
def test_no_desenvolvimento_o_papel_unico_aparece_como_problema() -> None:
    problemas = conferir_o_papel_do_banco(None, databases=["default"])

    assert {"bancada.W001", "bancada.W002"} <= ids(problemas)
    assert "bancada.E001" not in ids(problemas)


def test_sem_o_banco_na_conferencia_nada_e_consultado() -> None:
    assert conferir_o_papel_do_banco(None, databases=None) == []
