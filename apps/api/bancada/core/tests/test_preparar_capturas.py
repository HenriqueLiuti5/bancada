from io import StringIO

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import override_settings

from bancada.orientacao.serializers import TOURS
from bancada.tenants.models import Papel, Tenant, Usuario


def test_o_dono_de_exemplo_fica_sem_tour_e_sem_primeiros_passos(
    tenant: Tenant, tecnico: Usuario
) -> None:
    dono = Usuario.objects.create_user(
        username="marcos", password="senha-de-teste", tenant=tenant, papel=Papel.DONO
    )

    with override_settings(DEBUG=True):
        call_command("preparar_capturas", stdout=StringIO())

    dono.refresh_from_db()
    assert dono.tours_vistos == TOURS
    assert dono.primeiros_passos_escondidos
    tecnico.refresh_from_db()
    assert tecnico.tours_vistos == []


def test_sem_o_dono_de_exemplo_o_comando_pede_o_semear(tenant: Tenant) -> None:
    with override_settings(DEBUG=True), pytest.raises(CommandError, match="make semear"):
        call_command("preparar_capturas", stdout=StringIO())
