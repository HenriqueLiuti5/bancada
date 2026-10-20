from datetime import UTC, date, datetime, time, timedelta
from typing import Any

import pytest
from django.conf import settings
from django.core import mail
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from bancada.assinaturas.models import Assinatura
from bancada.auditoria.models import Acao, RegistroDeAuditoria
from bancada.avisos import tasks as avisos
from bancada.clientes.models import Aparelho, Cliente
from bancada.core.api import SOMENTE_PARA_CONSULTA
from bancada.core.fuso import fuso_pelo_telefone
from bancada.ordens import documentos
from bancada.ordens.estados import StatusOS
from bancada.ordens.models import OrdemServico
from bancada.tenants import tasks as contas
from bancada.tenants.models import Convite, FusoHorario, Loja, Papel, Tenant, Usuario

# Meia-noite e meia do dia 20 em Brasília, que em Manaus ainda são 23h30 do dia 19.
AGORA = datetime(2026, 10, 20, 3, 30, tzinfo=UTC)
DIA_EM_BRASILIA = date(2026, 10, 20)
DIA_EM_MANAUS = date(2026, 10, 19)


@pytest.fixture
def relogio_parado(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(timezone, "now", lambda: AGORA)


def mudar_o_fuso(tenant: Tenant, fuso: str) -> None:
    Tenant.objects.filter(pk=tenant.pk).update(fuso_horario=fuso)
    tenant.fuso_horario = fuso


@pytest.fixture
def api_dono(tenant: Tenant) -> APIClient:
    dono = Usuario.objects.create_user(
        username="marcos",
        email="marcos@central.test",
        password="senha-de-teste",
        tenant=tenant,
        papel=Papel.DONO,
    )
    cliente_api = APIClient()
    token, _ = Token.objects.get_or_create(user=dono)
    cliente_api.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    return cliente_api


@pytest.mark.parametrize(
    ("whatsapp", "fuso"),
    [
        ("(43) 99615-6781", FusoHorario.BRASILIA),
        ("(11) 3333-4444", FusoHorario.BRASILIA),
        ("(81) 98888-7777", FusoHorario.BRASILIA),
        ("(92) 98765-4321", FusoHorario.AMAZONAS),
        ("(97) 98765-4321", FusoHorario.AMAZONAS),
        ("(65) 99999-0000", FusoHorario.AMAZONAS),
        ("(66) 99999-0000", FusoHorario.AMAZONAS),
        ("(67) 99999-0000", FusoHorario.AMAZONAS),
        ("(69) 99999-0000", FusoHorario.AMAZONAS),
        ("(95) 99999-0000", FusoHorario.AMAZONAS),
        ("+55 68 99999-0000", FusoHorario.ACRE),
        ("", FusoHorario.BRASILIA),
        ("123", FusoHorario.BRASILIA),
    ],
)
def test_fuso_sai_do_ddd_do_telefone(whatsapp: str, fuso: str) -> None:
    assert fuso_pelo_telefone(whatsapp) == fuso


@pytest.mark.django_db
@pytest.mark.parametrize(
    ("whatsapp", "fuso"),
    [
        ("(21) 98765-4321", FusoHorario.BRASILIA),
        ("(92) 98765-4321", FusoHorario.AMAZONAS),
        ("(68) 99999-0000", FusoHorario.ACRE),
    ],
)
def test_cadastro_ja_escolhe_o_fuso_pelo_whatsapp(whatsapp: str, fuso: str) -> None:
    resposta = APIClient().post(
        "/api/auth/cadastro/",
        {
            "assistencia": "Conserta Já",
            "nome": "Rafael Lima",
            "email": "rafael@consertaja.test",
            "whatsapp": whatsapp,
            "senha": "bancada-2026-forte",
            "aceite_dos_termos": True,
        },
        format="json",
    )

    assert resposta.status_code == 201
    assert Tenant.objects.get(nome="Conserta Já").fuso_horario == fuso


@pytest.mark.django_db
def test_dono_troca_o_fuso_na_tela_assistencia(api_dono: APIClient, tenant: Tenant) -> None:
    assert api_dono.get("/api/assistencia/").json()["fuso_horario"] == FusoHorario.BRASILIA

    resposta = api_dono.patch(
        "/api/assistencia/", {"fuso_horario": FusoHorario.ACRE}, format="json"
    )

    assert resposta.status_code == 200
    tenant.refresh_from_db()
    assert tenant.fuso_horario == FusoHorario.ACRE
    registro = RegistroDeAuditoria.objects.get(acao=Acao.ASSISTENCIA_ALTERADA)
    assert registro.detalhe == "fuso_horario=America/Rio_Branco"


@pytest.mark.django_db
def test_so_os_fusos_do_brasil_sao_aceitos(api_dono: APIClient, tenant: Tenant) -> None:
    resposta = api_dono.patch("/api/assistencia/", {"fuso_horario": "Europe/Lisbon"}, format="json")

    assert resposta.status_code == 400
    assert resposta.json()["fuso_horario"] == ["Escolha um dos fusos horários do Brasil."]
    tenant.refresh_from_db()
    assert tenant.fuso_horario == FusoHorario.BRASILIA


@pytest.mark.django_db
def test_quem_entra_recebe_o_fuso_da_assistencia(api_tecnico: APIClient, tenant: Tenant) -> None:
    mudar_o_fuso(tenant, FusoHorario.AMAZONAS)

    assert api_tecnico.get("/api/auth/eu/").json()["tenant"]["fuso_horario"] == "America/Manaus"


@pytest.mark.django_db
def test_horarios_da_api_saem_no_fuso_da_assistencia(
    api_tecnico: APIClient, tenant: Tenant, ordem: OrdemServico
) -> None:
    mudar_o_fuso(tenant, FusoHorario.AMAZONAS)

    criada_em = api_tecnico.get(f"/api/ordens/{ordem.pk}/").json()["criado_em"]

    assert criada_em.endswith("-04:00")
    assert datetime.fromisoformat(criada_em) == ordem.criado_em


@pytest.mark.django_db
def test_o_fuso_volta_ao_padrao_depois_de_cada_pedido(
    api_tecnico: APIClient, tenant: Tenant, ordem: OrdemServico
) -> None:
    mudar_o_fuso(tenant, FusoHorario.ACRE)

    api_tecnico.get(f"/api/ordens/{ordem.pk}/")

    assert timezone.get_current_timezone_name() == settings.TIME_ZONE


@pytest.mark.django_db
def test_atrasada_e_para_hoje_seguem_o_fuso_da_assistencia(
    relogio_parado: None, api_tecnico: APIClient, tenant: Tenant, ordem: OrdemServico
) -> None:
    OrdemServico.objects.filter(pk=ordem.pk).update(prometida_para=DIA_EM_MANAUS)

    em_brasilia = api_tecnico.get("/api/ordens/painel/").json()["agora"]
    mudar_o_fuso(tenant, FusoHorario.AMAZONAS)
    em_manaus = api_tecnico.get("/api/ordens/painel/").json()["agora"]
    lista_de_hoje = api_tecnico.get("/api/ordens/", {"para_hoje": "1"}).json()
    lista_de_atrasadas = api_tecnico.get("/api/ordens/", {"atrasadas": "1"}).json()

    assert (em_brasilia["atrasadas"], em_brasilia["para_hoje"]) == (1, 0)
    assert (em_manaus["atrasadas"], em_manaus["para_hoje"]) == (0, 1)
    assert lista_de_hoje["count"] == 1
    assert lista_de_atrasadas["count"] == 0


@pytest.mark.django_db
def test_prazo_de_hoje_vale_pelo_fuso_da_assistencia(
    relogio_parado: None, api_tecnico: APIClient, tenant: Tenant, loja: Loja, aparelho: Aparelho
) -> None:
    pedido = {
        "loja": loja.pk,
        "cliente": aparelho.cliente_id,
        "aparelho": aparelho.pk,
        "problema_relatado": "Não liga",
        "prometida_para": DIA_EM_MANAUS.isoformat(),
    }

    em_brasilia = api_tecnico.post("/api/ordens/", pedido, format="json")
    mudar_o_fuso(tenant, FusoHorario.AMAZONAS)
    em_manaus = api_tecnico.post("/api/ordens/", pedido, format="json")

    assert em_brasilia.status_code == 400
    assert em_brasilia.json()["prometida_para"] == ["O prazo não pode ser antes de hoje."]
    assert em_manaus.status_code == 201


@pytest.mark.django_db
def test_periodo_do_painel_comeca_a_meia_noite_da_assistencia(
    relogio_parado: None, api_tecnico: APIClient, tenant: Tenant, ordem: OrdemServico
) -> None:
    # 23h em Brasília e 22h em Manaus, os dois no dia 19.
    aberta_em = AGORA - timedelta(hours=1, minutes=30)
    OrdemServico.objects.filter(pk=ordem.pk).update(criado_em=aberta_em)

    em_brasilia = api_tecnico.get("/api/ordens/painel/", {"periodo": "hoje"}).json()
    mudar_o_fuso(tenant, FusoHorario.AMAZONAS)
    em_manaus = api_tecnico.get("/api/ordens/painel/", {"periodo": "hoje"}).json()

    assert em_brasilia["periodo"]["inicio"] == DIA_EM_BRASILIA.isoformat()
    assert em_brasilia["operacao"]["abertas"]["atual"] == 0
    assert em_manaus["periodo"]["inicio"] == DIA_EM_MANAUS.isoformat()
    assert em_manaus["operacao"]["abertas"]["atual"] == 1


@pytest.mark.django_db
def test_comprovante_mostra_a_hora_da_assistencia(
    relogio_parado: None,
    monkeypatch: pytest.MonkeyPatch,
    api_tecnico: APIClient,
    tenant: Tenant,
    ordem: OrdemServico,
) -> None:
    monkeypatch.setattr(documentos, "em_pdf", lambda html: html.encode())
    OrdemServico.objects.filter(pk=ordem.pk).update(criado_em=AGORA)
    mudar_o_fuso(tenant, FusoHorario.AMAZONAS)

    html = api_tecnico.get(f"/api/ordens/{ordem.pk}/comprovante/").content.decode()

    assert "Aberta em 19/10/2026 23:30" in html


@pytest.mark.django_db
def test_recibo_do_email_sai_no_fuso_da_assistencia(
    monkeypatch: pytest.MonkeyPatch, tenant: Tenant, ordem: OrdemServico, cliente: Cliente
) -> None:
    fusos: list[str] = []

    def recibo_falso(ordem: OrdemServico) -> bytes:
        fusos.append(timezone.get_current_timezone_name())
        return b"%PDF-"

    monkeypatch.setattr(documentos, "recibo_em_pdf", recibo_falso)
    Cliente.objects.filter(pk=cliente.pk).update(email="maria@exemplo.com")
    mudar_o_fuso(tenant, FusoHorario.ACRE)
    ordem = OrdemServico.objects.get(pk=ordem.pk)
    for status in [
        StatusOS.EM_DIAGNOSTICO,
        StatusOS.ORCAMENTO_ENVIADO,
        StatusOS.APROVADO,
        StatusOS.EM_REPARO,
        StatusOS.PRONTO,
        StatusOS.ENTREGUE,
    ]:
        ordem.transicionar(status)

    entrega = ordem.eventos.get(para_status=StatusOS.ENTREGUE)
    assert avisos.avisar_cliente.run(entrega.pk) == avisos.ENVIADO

    assert fusos == ["America/Rio_Branco"]
    assert timezone.get_current_timezone_name() == settings.TIME_ZONE


@pytest.mark.django_db
def test_convite_por_email_mostra_a_validade_no_dia_da_assistencia(tenant: Tenant) -> None:
    dia = (timezone.now() + timedelta(days=8)).date()
    convite = Convite.objects.create(
        tenant=tenant,
        nome="Paulo Reis",
        papel=Papel.TECNICO,
        email="paulo@central.test",
        expira_em=datetime.combine(dia, time(3, 30), tzinfo=UTC),
    )
    mudar_o_fuso(tenant, FusoHorario.AMAZONAS)

    assert contas.enviar_convite.run(convite.pk) == contas.ENVIADO

    vespera = dia - timedelta(days=1)
    assert f"O convite vale até {vespera:%d/%m/%Y}." in str(mail.outbox[0].body)


@pytest.mark.django_db
def test_pagina_do_cliente_leva_o_fuso_da_assistencia(tenant: Tenant, ordem: OrdemServico) -> None:
    mudar_o_fuso(tenant, FusoHorario.NORONHA)

    corpo = APIClient().get(f"/api/publico/os/{ordem.token_publico}/").json()

    assert corpo["assistencia"]["fuso_horario"] == "America/Noronha"


@pytest.mark.django_db
def test_assinatura_segue_o_horario_de_brasilia(
    relogio_parado: None, api_dono: APIClient, tenant: Tenant, loja: Loja
) -> None:
    # No Acre ainda é dia 19, último dia do teste; em Brasília já é dia 20.
    mudar_o_fuso(tenant, FusoHorario.ACRE)
    Assinatura.objects.filter(tenant=tenant).update(teste_termina_em=DIA_EM_MANAUS)

    resposta: Any = api_dono.post("/api/lojas/", {"nome": "Filial"}, format="json")
    eu = api_dono.get("/api/auth/eu/").json()

    assert resposta.status_code == 403
    assert resposta.json()["detail"] == SOMENTE_PARA_CONSULTA
    assert eu["assinatura"]["pode_editar"] is False
