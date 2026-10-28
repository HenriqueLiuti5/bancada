from datetime import date, datetime

from bancada.core.calendario import somar_meses


def test_somar_meses_atravessa_o_ano_para_os_dois_lados() -> None:
    assert somar_meses(date(2026, 9, 15), 6) == date(2027, 3, 15)
    assert somar_meses(date(2026, 3, 15), -6) == date(2025, 9, 15)
    assert somar_meses(date(2026, 6, 1), -6) == date(2025, 12, 1)


def test_somar_meses_cai_no_ultimo_dia_do_mes_mais_curto() -> None:
    assert somar_meses(date(2026, 8, 31), 6) == date(2027, 2, 28)
    assert somar_meses(datetime(2026, 8, 31, 10, 30), -6) == datetime(2026, 2, 28, 10, 30)
