import pytest
from django.db import connection

from bancada.clientes.models import Aparelho


@pytest.mark.django_db
def test_senha_de_desbloqueio_e_lida_normalmente_pelo_orm(aparelho: Aparelho) -> None:
    recarregado = Aparelho.objects.get(pk=aparelho.pk)

    assert recarregado.senha_desbloqueio == "1234"


@pytest.mark.django_db
def test_senha_de_desbloqueio_nao_fica_em_texto_puro_no_banco(aparelho: Aparelho) -> None:
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT senha_desbloqueio FROM clientes_aparelho WHERE id = %s", [aparelho.pk]
        )
        guardado = cursor.fetchone()[0]

    assert guardado != "1234"
    assert "1234" not in guardado


@pytest.mark.django_db
def test_imei_e_mascarado_para_exibicao(aparelho: Aparelho) -> None:
    assert aparelho.imei_mascarado.endswith("1110")
    assert aparelho.imei_mascarado.count("*") == len(aparelho.imei) - 4
