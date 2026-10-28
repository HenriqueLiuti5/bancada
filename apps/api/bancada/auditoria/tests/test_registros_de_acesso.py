from datetime import timedelta

import pytest
from django.utils import timezone

from bancada.auditoria.models import Acao, RegistroDeAuditoria
from bancada.auditoria.registro import registrar
from bancada.auditoria.tasks import apagar_registros_de_acesso_vencidos
from bancada.tenants.models import Usuario


def registro_antigo(usuario: Usuario, acao: str, dias: int) -> RegistroDeAuditoria:
    registro = registrar(
        tenant=usuario.tenant,
        usuario=usuario,
        acao=acao,
        objeto="usuario",
        objeto_id=usuario.pk,
        origem="203.0.113.7",
    )
    RegistroDeAuditoria.objects.filter(pk=registro.pk).update(
        criado_em=timezone.now() - timedelta(days=dias)
    )
    return registro


@pytest.mark.django_db
def test_entradas_e_logins_recusados_somem_depois_de_seis_meses(tecnico: Usuario) -> None:
    registro_antigo(tecnico, Acao.ENTRADA, dias=200)
    registro_antigo(tecnico, Acao.LOGIN_RECUSADO, dias=200)
    recente = registro_antigo(tecnico, Acao.ENTRADA, dias=150)

    assert apagar_registros_de_acesso_vencidos.run() == 2

    assert list(RegistroDeAuditoria.objects.values_list("pk", flat=True)) == [recente.pk]


@pytest.mark.django_db
def test_os_outros_registros_ficam_enquanto_a_conta_existir(tecnico: Usuario) -> None:
    senha_vista = registro_antigo(tecnico, Acao.SENHA_VISTA, dias=400)

    assert apagar_registros_de_acesso_vencidos.run() == 0

    assert RegistroDeAuditoria.objects.filter(pk=senha_vista.pk).exists()
