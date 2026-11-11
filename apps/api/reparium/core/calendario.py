import calendar
from datetime import date


def somar_meses[Dia: date](dia: Dia, meses: int) -> Dia:
    ano, indice_do_mes = divmod(dia.year * 12 + dia.month - 1 + meses, 12)
    mes = indice_do_mes + 1
    return dia.replace(year=ano, month=mes, day=min(dia.day, calendar.monthrange(ano, mes)[1]))
