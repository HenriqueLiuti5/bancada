import threading
import time
from decimal import Decimal
from typing import Any

import pytest
from django.db import connection, transaction
from rest_framework.test import APIClient

from reparium.assinaturas import fundadores, servicos
from reparium.assinaturas.models import (
    VAGAS_DE_FUNDADOR,
    Assinatura,
    Plano,
    SituacaoDaAssinatura,
    VagaDeFundador,
)
from reparium.assinaturas.tests.conftest import TOKEN_DO_WEBHOOK, ProvedorFalso
from reparium.assinaturas.tests.test_api_assinatura import (
    ASSINAR,
    CANCELAR,
    PEDIDO,
    URL,
    assinar,
    assinatura_do,
)
from reparium.auditoria.models import Acao, RegistroDeAuditoria
from reparium.core.fuso import hoje_no_reparium
from reparium.core.rls import aplicar_tenant
from reparium.tenants.models import Tenant

ESPERA_EM_SEGUNDOS = 10


def assinar_sem_a_tela(tenant: Tenant, provedor: ProvedorFalso) -> Assinatura:
    return servicos.assinar(
        tenant,
        documento="52998224725",
        email=f"dono{tenant.pk}@assistencia.test",
        plano=Plano.SOLO,
        ciclo="mensal",
        hoje=hoje_no_reparium(),
        provedor=provedor,
    )


def contratacao_na_auditoria(tenant: Tenant) -> str:
    return RegistroDeAuditoria.objects.get(tenant=tenant, acao=Acao.ASSINATURA_CONTRATADA).detalhe


@pytest.mark.django_db
@pytest.mark.parametrize(
    ("plano", "ciclo", "valor", "periodo"),
    [
        ("equipe", "mensal", "62.90", "mês"),
        ("solo", "anual", "349.00", "ano"),
        ("rede", "anual", "1259.00", "ano"),
    ],
)
def test_quem_assina_com_vaga_ocupa_uma_e_paga_o_preco_de_fundador(
    api_dono: APIClient,
    tenant: Tenant,
    provedor: ProvedorFalso,
    plano: str,
    ciclo: str,
    valor: str,
    periodo: str,
) -> None:
    antes = api_dono.get(URL).json()
    assert (antes["fundador"], antes["ganha_preco_de_fundador"]) == (False, True)
    assert antes["fundadores"] == {"vagas": 15, "restantes": 15, "desconto": 30}

    dados = assinar(api_dono, plano=plano, ciclo=ciclo)

    assert provedor.assinaturas[0]["valor"] == Decimal(valor)
    assert (dados["valor"], dados["faturas"][0]["valor"]) == (valor, valor)
    assert (dados["fundador"], dados["ganha_preco_de_fundador"]) == (True, False)
    assert dados["fundadores"] == {"vagas": 15, "restantes": 14, "desconto": 30}
    vaga = VagaDeFundador.objects.get()
    assert (vaga.numero, vaga.tenant_id) == (1, tenant.pk)
    assert contratacao_na_auditoria(tenant) == (
        f"{Plano(plano).label}, R$ {valor} por {periodo}, preço de fundador"
    )


@pytest.mark.django_db
def test_a_decima_sexta_assinatura_paga_o_preco_cheio(
    api_dono: APIClient, tenant: Tenant, provedor: ProvedorFalso
) -> None:
    for numero in range(1, VAGAS_DE_FUNDADOR + 1):
        assert assinar_sem_a_tela(Tenant.objects.create(nome=f"Loja {numero}"), provedor).fundador

    antes = api_dono.get(URL).json()
    assert antes["ganha_preco_de_fundador"] is False
    assert antes["fundadores"]["restantes"] == 0

    dados = assinar(api_dono)

    assert provedor.assinaturas[-1]["valor"] == Decimal("89.90")
    assert (dados["valor"], dados["fundador"]) == ("89.90", False)
    assert list(VagaDeFundador.objects.values_list("numero", flat=True)) == list(range(1, 16))
    assert not VagaDeFundador.objects.filter(tenant=tenant).exists()
    assert contratacao_na_auditoria(tenant) == "Equipe, R$ 89.90 por mês"


@pytest.mark.django_db
def test_cancelar_acaba_com_o_preco_de_fundador_e_a_vaga_nao_volta(
    api_dono: APIClient, tenant: Tenant, provedor: ProvedorFalso
) -> None:
    assinar(api_dono)

    dados = api_dono.post(CANCELAR).json()

    assert dados["situacao"] == SituacaoDaAssinatura.CANCELADA
    assert (dados["fundador"], dados["ganha_preco_de_fundador"]) == (False, False)
    assert dados["fundadores"]["restantes"] == 14
    assert VagaDeFundador.objects.get().tenant_id == tenant.pk


@pytest.mark.django_db
def test_quem_assina_de_novo_paga_o_preco_cheio_sem_ocupar_outra_vaga(
    api_dono: APIClient, provedor: ProvedorFalso
) -> None:
    assinar(api_dono)
    api_dono.post(CANCELAR)

    dados = assinar(api_dono, ciclo="anual")

    assert provedor.assinaturas[-1]["valor"] == Decimal("899.00")
    assert (dados["valor"], dados["fundador"]) == ("899.00", False)
    assert dados["fundadores"]["restantes"] == 14
    assert VagaDeFundador.objects.count() == 1


@pytest.mark.django_db
def test_assinatura_encerrada_pelo_asaas_perde_o_preco_de_fundador(
    api_dono: APIClient, tenant: Tenant, provedor: ProvedorFalso
) -> None:
    assinar(api_dono)
    webhook = APIClient()
    webhook.credentials(HTTP_ASAAS_ACCESS_TOKEN=TOKEN_DO_WEBHOOK)

    resposta = webhook.post(
        "/api/webhooks/asaas/",
        {"id": "evt_1", "event": "SUBSCRIPTION_DELETED", "subscription": {"id": "sub_1"}},
        format="json",
    )

    assert resposta.json() == {"resultado": "processado"}
    assinatura = assinatura_do(tenant)
    assert assinatura.situacao == SituacaoDaAssinatura.CANCELADA
    assert assinatura.fundador is False
    assert VagaDeFundador.objects.filter(tenant=tenant).exists()


@pytest.mark.django_db
def test_assinatura_recusada_pelo_asaas_nao_gasta_a_vaga(
    api_dono: APIClient, provedor: ProvedorFalso
) -> None:
    provedor.falhar_em = "criar_assinatura"
    assert api_dono.post(ASSINAR, PEDIDO, format="json").status_code == 502
    assert not VagaDeFundador.objects.exists()

    provedor.falhar_em = None
    dados = assinar(api_dono)

    assert dados["fundador"] is True
    assert VagaDeFundador.objects.get().numero == 1


@pytest.mark.django_db
def test_as_vagas_ficam_fora_do_isolamento_entre_assistencias(
    tenant: Tenant, outro_tenant: Tenant
) -> None:
    VagaDeFundador.objects.create(numero=1, tenant=outro_tenant)

    aplicar_tenant(tenant.pk)

    assert not Assinatura.objects.filter(tenant=outro_tenant).exists()
    assert fundadores.vagas_restantes() == 14
    assert fundadores.ganha_preco_de_fundador(tenant) is True
    assert fundadores.ganha_preco_de_fundador(outro_tenant) is False


def _alguem_esperando_uma_trava() -> bool:
    with connection.cursor() as cursor:
        cursor.execute("SELECT count(*) FROM pg_locks WHERE NOT granted")
        return bool(cursor.fetchone()[0])


@pytest.mark.django_db(transaction=True)
def test_duas_assistencias_ao_mesmo_tempo_nao_levam_a_ultima_vaga_juntas() -> None:
    VagaDeFundador.objects.bulk_create(
        VagaDeFundador(numero=numero) for numero in range(1, VAGAS_DE_FUNDADOR)
    )
    primeira = Tenant.objects.create(nome="Primeira")
    segunda = Tenant.objects.create(nome="Segunda")
    no_asaas, liberar = threading.Event(), threading.Event()

    class AsaasLento(ProvedorFalso):
        def criar_assinatura(self, **dados: Any) -> str:
            if dados["referencia"] == servicos.referencia_da_assistencia(primeira):
                no_asaas.set()
                liberar.wait(ESPERA_EM_SEGUNDOS)
            return super().criar_assinatura(**dados)

    provedor = AsaasLento()
    assinaturas: dict[str, Assinatura] = {}

    def assinar_noutra_conexao(tenant: Tenant) -> None:
        try:
            with transaction.atomic():
                assinaturas[tenant.nome] = assinar_sem_a_tela(tenant, provedor)
        finally:
            connection.close()

    pedidos = [
        threading.Thread(target=assinar_noutra_conexao, args=(tenant,))
        for tenant in (primeira, segunda)
    ]
    try:
        pedidos[0].start()
        assert no_asaas.wait(ESPERA_EM_SEGUNDOS)
        # A segunda chega enquanto a primeira está no Asaas e precisa esperar a trava das vagas.
        pedidos[1].start()
        limite = time.monotonic() + ESPERA_EM_SEGUNDOS
        while not _alguem_esperando_uma_trava() and time.monotonic() < limite:
            time.sleep(0.05)
        assert _alguem_esperando_uma_trava()
    finally:
        liberar.set()
        for pedido in pedidos:
            if pedido.ident is not None:
                pedido.join(ESPERA_EM_SEGUNDOS)

    assert assinaturas["Primeira"].fundador is True
    assert assinaturas["Segunda"].fundador is False
    assert assinaturas["Segunda"].valor == Decimal("49.90")
    assert VagaDeFundador.objects.get(numero=VAGAS_DE_FUNDADOR).tenant_id == primeira.pk
    assert fundadores.vagas_restantes() == 0
