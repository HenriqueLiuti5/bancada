import json
from typing import Any

import pytest
from django.core import mail
from django.core.mail.backends.base import BaseEmailBackend
from rest_framework.test import APIClient

from bancada.avisos import tasks
from bancada.avisos.models import AvisoDeStatus
from bancada.ordens.estados import StatusOS
from bancada.ordens.models import EventoOS, OrdemServico


class BackendQueFalha(BaseEmailBackend):
    def send_messages(self, email_messages: Any) -> int:
        raise OSError("servidor de e-mail fora do ar")


def avisar(ordem: OrdemServico, status: str) -> str:
    evento = ordem.eventos.filter(para_status=status).latest("criado_em")
    return tasks.avisar_cliente.run(evento.pk)


@pytest.mark.django_db
def test_abertura_da_ordem_manda_o_link_para_o_cliente(
    ordem_de_quem_tem_email: OrdemServico,
) -> None:
    assert avisar(ordem_de_quem_tem_email, StatusOS.RECEBIDO) == tasks.ENVIADO

    enviado = mail.outbox[0]
    assert enviado.to == ["maria@exemplo.com"]
    assert enviado.subject == "Recebemos seu Motorola Moto G54"
    assert ordem_de_quem_tem_email.token_publico in enviado.body


@pytest.mark.django_db
def test_aviso_nao_escapa_caracteres_como_html(ordem_de_quem_tem_email: OrdemServico) -> None:
    ordem_de_quem_tem_email.tenant.nome = "Cell & Cia D'Ávila"
    ordem_de_quem_tem_email.tenant.save(update_fields=["nome"])

    avisar(ordem_de_quem_tem_email, StatusOS.RECEBIDO)

    corpo = mail.outbox[0].body
    assert "Cell & Cia D'Ávila" in corpo
    assert "&amp;" not in corpo
    assert "&#x27;" not in corpo


@pytest.mark.django_db
def test_status_que_nao_interessa_ao_cliente_nao_gera_email(
    ordem_de_quem_tem_email: OrdemServico,
) -> None:
    ordem_de_quem_tem_email.transicionar(StatusOS.EM_DIAGNOSTICO)
    mail.outbox.clear()

    assert avisar(ordem_de_quem_tem_email, StatusOS.EM_DIAGNOSTICO) == tasks.STATUS_NAO_AVISA
    assert mail.outbox == []


@pytest.mark.django_db
def test_cliente_sem_email_nao_vira_erro(ordem: OrdemServico) -> None:
    assert avisar(ordem, StatusOS.RECEBIDO) == tasks.CLIENTE_SEM_EMAIL
    assert mail.outbox == []
    assert AvisoDeStatus.objects.count() == 0


@pytest.mark.django_db
def test_o_mesmo_evento_nao_e_avisado_duas_vezes(
    ordem_de_quem_tem_email: OrdemServico,
) -> None:
    assert avisar(ordem_de_quem_tem_email, StatusOS.RECEBIDO) == tasks.ENVIADO
    assert avisar(ordem_de_quem_tem_email, StatusOS.RECEBIDO) == tasks.JA_ENVIADO

    assert len(mail.outbox) == 1
    assert AvisoDeStatus.objects.count() == 1


@pytest.mark.django_db
def test_o_aviso_nao_carrega_dado_sensivel(ordem_de_quem_tem_email: OrdemServico) -> None:
    ordem_de_quem_tem_email.transicionar(StatusOS.EM_DIAGNOSTICO, nota="Placa oxidada")
    ordem_de_quem_tem_email.transicionar(StatusOS.ORCAMENTO_ENVIADO)
    mail.outbox.clear()

    avisar(ordem_de_quem_tem_email, StatusOS.ORCAMENTO_ENVIADO)
    enviado = mail.outbox[0]
    bruto = json.dumps([enviado.subject, enviado.body])

    assert ordem_de_quem_tem_email.aparelho.imei not in bruto
    assert "1234" not in bruto
    assert "Souza" not in bruto
    assert "oxidada" not in bruto


@pytest.mark.django_db
def test_falha_de_envio_fica_registrada_e_o_aviso_continua_pendente(
    ordem_de_quem_tem_email: OrdemServico, settings: Any
) -> None:
    settings.EMAIL_BACKEND = "bancada.avisos.tests.test_avisos.BackendQueFalha"

    with pytest.raises(OSError):
        avisar(ordem_de_quem_tem_email, StatusOS.RECEBIDO)

    aviso = AvisoDeStatus.objects.get()
    assert aviso.enviado_em is None
    assert aviso.tentativas == 1
    assert "fora do ar" in aviso.erro


@pytest.mark.django_db
def test_mudar_o_status_pela_api_dispara_o_aviso_depois_do_commit(
    api_tecnico: APIClient,
    ordem_de_quem_tem_email: OrdemServico,
    django_capture_on_commit_callbacks: object,
) -> None:
    ordem_de_quem_tem_email.transicionar(StatusOS.EM_DIAGNOSTICO)
    ordem_de_quem_tem_email.transicionar(StatusOS.ORCAMENTO_ENVIADO)
    ordem_de_quem_tem_email.transicionar(StatusOS.APROVADO)
    ordem_de_quem_tem_email.transicionar(StatusOS.EM_REPARO)
    mail.outbox.clear()

    with django_capture_on_commit_callbacks(execute=True):  # type: ignore[operator]
        resposta = api_tecnico.post(
            f"/api/ordens/{ordem_de_quem_tem_email.pk}/transicionar/",
            {"status": StatusOS.PRONTO},
            format="json",
        )

    assert resposta.status_code == 200
    assert len(mail.outbox) == 1
    assert "pronto para retirada" in mail.outbox[0].subject


@pytest.mark.django_db
def test_o_detalhe_da_ordem_mostra_que_o_cliente_foi_avisado(
    api_tecnico: APIClient, ordem_de_quem_tem_email: OrdemServico
) -> None:
    avisar(ordem_de_quem_tem_email, StatusOS.RECEBIDO)

    corpo = api_tecnico.get(f"/api/ordens/{ordem_de_quem_tem_email.pk}/").json()
    abertura = corpo["eventos"][0]

    assert abertura["aviso"]["destino"] == "maria@exemplo.com"


@pytest.mark.django_db
def test_evento_apagado_nao_derruba_a_tarefa(ordem_de_quem_tem_email: OrdemServico) -> None:
    evento_id = EventoOS.objects.latest("criado_em").pk
    EventoOS.objects.filter(pk=evento_id).delete()

    assert tasks.avisar_cliente.run(evento_id) == tasks.EVENTO_SUMIU


@pytest.mark.django_db
def test_entrega_manda_o_recibo_em_anexo(ordem_de_quem_tem_email: OrdemServico) -> None:
    for status in [
        StatusOS.EM_DIAGNOSTICO,
        StatusOS.ORCAMENTO_ENVIADO,
        StatusOS.APROVADO,
        StatusOS.EM_REPARO,
        StatusOS.PRONTO,
        StatusOS.ENTREGUE,
    ]:
        ordem_de_quem_tem_email.transicionar(status)
    mail.outbox.clear()

    assert avisar(ordem_de_quem_tem_email, StatusOS.ENTREGUE) == tasks.ENVIADO

    enviado = mail.outbox[0]
    nome, conteudo, tipo = enviado.attachments[0]

    assert nome == f"OS-{ordem_de_quem_tem_email.numero}-recibo.pdf"
    assert tipo == "application/pdf"
    assert conteudo[:4] == b"%PDF"
