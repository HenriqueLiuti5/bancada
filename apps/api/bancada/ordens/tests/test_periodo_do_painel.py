from datetime import date

import pytest

from bancada.ordens.painel.periodo import (
    HOJE,
    MES,
    PERSONALIZADO,
    SETE_DIAS,
    Periodo,
    anterior,
    pedido,
)

QUARTA = date(2026, 9, 23)


@pytest.mark.parametrize(
    ("chave", "esperado"),
    [
        (HOJE, Periodo(QUARTA, QUARTA)),
        (SETE_DIAS, Periodo(date(2026, 9, 17), QUARTA)),
        (MES, Periodo(date(2026, 9, 1), QUARTA)),
    ],
)
def test_periodos_prontos_terminam_hoje(chave: str, esperado: Periodo) -> None:
    assert pedido(chave, QUARTA) == esperado


def test_personalizado_sem_datas_volta_para_o_mes() -> None:
    assert pedido(PERSONALIZADO, QUARTA) == Periodo(date(2026, 9, 1), QUARTA)


def test_hoje_compara_com_ontem() -> None:
    assert anterior(HOJE, Periodo(QUARTA, QUARTA)) == Periodo(date(2026, 9, 22), date(2026, 9, 22))


def test_sete_dias_compara_com_os_sete_anteriores() -> None:
    atual = pedido(SETE_DIAS, QUARTA)

    assert anterior(SETE_DIAS, atual) == Periodo(date(2026, 9, 10), date(2026, 9, 16))


def test_mes_compara_com_o_mesmo_trecho_do_mes_anterior() -> None:
    atual = pedido(MES, QUARTA)

    assert anterior(MES, atual) == Periodo(date(2026, 8, 1), date(2026, 8, 23))


def test_fim_de_mes_longo_compara_com_o_mes_anterior_inteiro() -> None:
    atual = pedido(MES, date(2026, 3, 31))

    assert anterior(MES, atual) == Periodo(date(2026, 2, 1), date(2026, 2, 28))


def test_janeiro_compara_com_dezembro_do_ano_anterior() -> None:
    atual = pedido(MES, date(2027, 1, 15))

    assert anterior(MES, atual) == Periodo(date(2026, 12, 1), date(2026, 12, 15))


def test_intervalo_conta_os_dois_extremos() -> None:
    periodo = Periodo(date(2026, 9, 1), date(2026, 9, 10))

    assert periodo.dias == 10
    assert periodo.desde.isoformat() == "2026-09-01T00:00:00-03:00"
    assert periodo.ate.isoformat() == "2026-09-11T00:00:00-03:00"
