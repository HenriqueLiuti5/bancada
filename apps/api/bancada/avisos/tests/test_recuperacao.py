from datetime import timedelta

import pytest
from django.core import mail
from django.utils import timezone

from bancada.avisos import tasks
from bancada.avisos.models import AvisoDeStatus
from bancada.ordens.estados import StatusOS
from bancada.ordens.models import EventoOS, OrdemServico


def envelhecer_eventos(ordem: OrdemServico, horas: int) -> None:
    EventoOS.objects.filter(ordem=ordem).update(criado_em=timezone.now() - timedelta(hours=horas))


@pytest.mark.django_db
def test_evento_sem_aviso_volta_para_a_fila(ordem_de_quem_tem_email: OrdemServico) -> None:
    assert AvisoDeStatus.objects.count() == 0

    assert tasks.recuperar_avisos_perdidos.run() == 1
    assert len(mail.outbox) == 1
    assert AvisoDeStatus.objects.get().enviado_em is not None


@pytest.mark.django_db
def test_evento_ja_avisado_fica_de_fora(ordem_de_quem_tem_email: OrdemServico) -> None:
    tasks.recuperar_avisos_perdidos.run()
    mail.outbox.clear()

    assert tasks.recuperar_avisos_perdidos.run() == 0
    assert mail.outbox == []


@pytest.mark.django_db
def test_evento_velho_demais_nao_e_recuperado(ordem_de_quem_tem_email: OrdemServico) -> None:
    envelhecer_eventos(ordem_de_quem_tem_email, tasks.HORAS_PARA_RECUPERAR_UM_AVISO + 1)

    assert tasks.recuperar_avisos_perdidos.run() == 0
    assert mail.outbox == []


@pytest.mark.django_db
def test_aviso_de_status_ja_superado_nao_e_enviado(ordem_de_quem_tem_email: OrdemServico) -> None:
    ordem_de_quem_tem_email.transicionar(StatusOS.EM_DIAGNOSTICO)
    ordem_de_quem_tem_email.transicionar(StatusOS.ORCAMENTO_ENVIADO)
    ordem_de_quem_tem_email.transicionar(StatusOS.APROVADO)

    assert tasks.recuperar_avisos_perdidos.run() == 0
    assert mail.outbox == []


@pytest.mark.django_db
def test_cliente_sem_email_nao_entra_na_varredura(ordem: OrdemServico) -> None:
    assert tasks.recuperar_avisos_perdidos.run() == 0


@pytest.mark.django_db
def test_aviso_que_ja_falhou_demais_e_abandonado(ordem_de_quem_tem_email: OrdemServico) -> None:
    evento = ordem_de_quem_tem_email.eventos.get()
    AvisoDeStatus.objects.create(
        tenant=ordem_de_quem_tem_email.tenant,
        evento=evento,
        destino="maria@exemplo.com",
        assunto="Recebemos seu aparelho",
        tentativas=tasks.TENTATIVAS_ANTES_DE_DESISTIR,
        erro="servidor de e-mail fora do ar",
    )

    assert tasks.recuperar_avisos_perdidos.run() == 0
    assert mail.outbox == []
