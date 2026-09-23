import json

import pytest
from django.core import mail
from rest_framework.test import APIClient

from bancada.avisos import tasks
from bancada.avisos.models import AvisoDeStatus
from bancada.clientes.models import Aparelho, Cliente
from bancada.ordens.estados import StatusOS
from bancada.ordens.models import EventoOS, OrdemServico
from bancada.tenants.models import Loja, Tenant


@pytest.fixture
def cliente_com_email(tenant: Tenant) -> Cliente:
    return Cliente.objects.create(
        tenant=tenant,
        nome="Maria Souza",
        telefone="11999990000",
        email="maria@exemplo.com",
    )


@pytest.fixture
def ordem_de_quem_tem_email(
    tenant: Tenant, loja: Loja, cliente_com_email: Cliente, aparelho: Aparelho
) -> OrdemServico:
    aparelho.cliente = cliente_com_email
    aparelho.save(update_fields=["cliente"])
    return OrdemServico.abrir(
        tenant=tenant,
        loja=loja,
        cliente=cliente_com_email,
        aparelho=aparelho,
        problema_relatado="Não carrega",
    )


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
    ordem_de_quem_tem_email: OrdemServico, settings: object, monkeypatch: pytest.MonkeyPatch
) -> None:
    def recusar(*args: object, **kwargs: object) -> int:
        raise OSError("servidor de e-mail fora do ar")

    monkeypatch.setattr(tasks, "send_mail", recusar)

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
