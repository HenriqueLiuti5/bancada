from collections.abc import Iterator
from datetime import timedelta
from decimal import Decimal
from typing import Any

import pytest
from django.urls import URLPattern, URLResolver, get_resolver
from django.utils import timezone
from rest_framework.test import APIClient

from bancada.assinaturas.models import Assinatura, Fatura, SituacaoDaFatura
from bancada.assinaturas.tests.conftest import ProvedorFalso
from bancada.core.api import SOMENTE_PARA_CONSULTA, AssinaturaPermiteEditar
from bancada.ordens.models import OrdemServico
from bancada.tenants.models import Tenant

METODOS_DE_ESCRITA = {"post", "put", "patch", "delete"}
ROTAS_QUE_FUNCIONAM_SEM_ASSINATURA = {
    "login",
    "logout",
    "cadastro",
    "esqueci-a-senha",
    "redefinir-a-senha",
    "confirmar-email",
    "reenviar-confirmacao",
    "aceite-de-convite",
    "tour-visto",
    "primeiros-passos",
    "assinatura",
    "assinar",
    "cancelar-assinatura",
    "webhook-do-asaas",
}
NOVO_CLIENTE = {"nome": "Ana Prado", "telefone": "11977776666"}


def rotas(padroes: list[Any], prefixo: str = "") -> Iterator[tuple[str, URLPattern]]:
    for padrao in padroes:
        if isinstance(padrao, URLResolver):
            yield from rotas(padrao.url_patterns, prefixo + str(padrao.pattern))
        elif isinstance(padrao, URLPattern):
            yield prefixo + str(padrao.pattern), padrao


def classe_da_view(padrao: URLPattern) -> Any:
    visao: Any = padrao.callback
    return visao.cls


def escreve(padrao: URLPattern) -> bool:
    classe = classe_da_view(padrao)
    acoes = getattr(padrao.callback, "actions", None)
    metodos = set(acoes) if acoes else {m for m in METODOS_DE_ESCRITA if hasattr(classe, m)}
    return bool(metodos & METODOS_DE_ESCRITA & set(classe.http_method_names))


def permissoes(padrao: URLPattern) -> list[type]:
    classe = classe_da_view(padrao)
    for acao in (getattr(padrao.callback, "actions", None) or {}).values():
        proprias = getattr(getattr(classe, acao, None), "kwargs", {}).get("permission_classes")
        if proprias is not None:
            return list(proprias)
    return list(classe.permission_classes)


def test_toda_rota_que_escreve_obedece_a_assinatura() -> None:
    conferidas = []
    sem_trava = []

    for caminho, padrao in rotas(get_resolver().url_patterns):
        if not hasattr(padrao.callback, "cls") or not escreve(padrao):
            continue
        if padrao.name in ROTAS_QUE_FUNCIONAM_SEM_ASSINATURA:
            continue
        conferidas.append(caminho)
        if AssinaturaPermiteEditar not in permissoes(padrao):
            sem_trava.append(caminho)

    assert len(conferidas) > 10
    assert sem_trava == []


@pytest.fixture
def teste_vencido(tenant: Tenant) -> None:
    Assinatura.objects.filter(tenant=tenant).update(
        teste_termina_em=timezone.localdate() - timedelta(days=1)
    )


@pytest.mark.django_db
@pytest.mark.usefixtures("teste_vencido")
def test_teste_vencido_deixa_consultar_mas_nao_alterar(
    api_tecnico: APIClient, ordem: OrdemServico
) -> None:
    assert api_tecnico.get("/api/ordens/").status_code == 200
    assert api_tecnico.get(f"/api/ordens/{ordem.pk}/").status_code == 200

    criacao = api_tecnico.post("/api/clientes/", NOVO_CLIENTE, format="json")
    transicao = api_tecnico.post(
        f"/api/ordens/{ordem.pk}/transicionar/", {"status": "em_diagnostico"}, format="json"
    )

    assert criacao.status_code == 403
    assert criacao.json()["detail"] == SOMENTE_PARA_CONSULTA
    assert transicao.status_code == 403
    ordem.refresh_from_db()
    assert ordem.status == "recebido"


@pytest.mark.django_db
@pytest.mark.usefixtures("teste_vencido")
def test_teste_vencido_trava_tambem_as_telas_do_dono(api_dono: APIClient) -> None:
    assert api_dono.patch("/api/assistencia/", {"nome": "Outra"}, format="json").status_code == 403
    convite = api_dono.post("/api/convites/", {"nome": "Joana", "papel": "tecnico"}, format="json")
    assert convite.status_code == 403


@pytest.mark.django_db
@pytest.mark.usefixtures("teste_vencido")
def test_sem_assinatura_ainda_da_para_assinar_e_voltar_a_editar(
    api_dono: APIClient, provedor: ProvedorFalso
) -> None:
    assert api_dono.get("/api/auth/eu/").json()["assinatura"]["pode_editar"] is False
    assert api_dono.post("/api/orientacao/tours/", {"tour": "ordens"}).status_code == 204
    assert api_dono.get("/api/assinatura/").status_code == 200

    assinatura = api_dono.post(
        "/api/assinatura/assinar/", {"documento": "529.982.247-25"}, format="json"
    )

    assert assinatura.status_code == 201
    assert api_dono.post("/api/clientes/", NOVO_CLIENTE, format="json").status_code == 201


@pytest.mark.django_db
def test_atraso_dentro_da_tolerancia_continua_editando(
    api_tecnico: APIClient, tenant: Tenant
) -> None:
    assinatura = Assinatura.objects.get(tenant=tenant)
    assinatura.assinatura_no_provedor = "sub_1"
    assinatura.save()
    vencimento = timezone.localdate() - timedelta(days=3)
    Fatura.objects.create(
        tenant=tenant,
        assinatura=assinatura,
        id_no_provedor="pay_1",
        valor=Decimal("59.90"),
        vencimento=vencimento,
        situacao=SituacaoDaFatura.VENCIDA,
    )

    resumo = api_tecnico.get("/api/auth/eu/").json()["assinatura"]

    assert resumo["situacao"] == "inadimplente"
    assert resumo["pagar_ate"] == (vencimento + timedelta(days=7)).isoformat()
    assert api_tecnico.post("/api/clientes/", NOVO_CLIENTE, format="json").status_code == 201
