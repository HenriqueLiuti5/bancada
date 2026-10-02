from datetime import date, timedelta
from decimal import Decimal

import pytest
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from bancada.assinaturas.models import (
    Assinatura,
    Fatura,
    FormaDeCobranca,
    SituacaoDaAssinatura,
    SituacaoDaFatura,
)
from bancada.clientes.models import Aparelho, Cliente
from bancada.ordens.models import OrdemServico
from bancada.tenants.models import Loja, Papel, Tenant, Usuario

MENSALIDADE = Decimal("59.90")


@pytest.fixture
def conta_da_plataforma(db: None) -> Usuario:
    return Usuario.objects.create_user(
        username="henrique@bancada.test",
        email="henrique@bancada.test",
        first_name="Henrique Liuti",
        password="senha-de-teste",
        da_plataforma=True,
    )


@pytest.fixture
def api_plataforma(conta_da_plataforma: Usuario) -> APIClient:
    cliente_api = APIClient()
    token, _ = Token.objects.get_or_create(user=conta_da_plataforma)
    cliente_api.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    return cliente_api


def nova_assistencia(nome: str, *, dias_desde_o_cadastro: int = 0) -> Tenant:
    tenant = Tenant.objects.create(nome=nome, whatsapp="11987654321")
    if dias_desde_o_cadastro:
        Tenant.objects.filter(pk=tenant.pk).update(
            criado_em=timezone.now() - timedelta(days=dias_desde_o_cadastro)
        )
        tenant.refresh_from_db()
    return tenant


def dono_da(tenant: Tenant, nome: str = "Rafael Lima") -> Usuario:
    endereco = f"dono{tenant.pk}@assistencia.test"
    return Usuario.objects.create_user(
        username=endereco,
        email=endereco,
        first_name=nome,
        password="senha-de-teste",
        tenant=tenant,
        papel=Papel.DONO,
    )


def contratar(
    tenant: Tenant,
    *,
    situacao: str = SituacaoDaAssinatura.ATIVA,
    valor: Decimal = MENSALIDADE,
    dias_desde_a_assinatura: int = 0,
) -> Assinatura:
    assinatura = Assinatura.objects.get(tenant=tenant)
    assinatura.assinatura_no_provedor = f"sub_{tenant.pk}"
    assinatura.valor_mensal = valor
    assinatura.assinada_em = timezone.now() - timedelta(days=dias_desde_a_assinatura)
    assinatura.situacao = situacao
    assinatura.save()
    return assinatura


def fatura(
    assinatura: Assinatura,
    *,
    vencimento: date,
    situacao: str = SituacaoDaFatura.PAGA,
    valor: Decimal = MENSALIDADE,
    valor_liquido: Decimal | None = None,
) -> Fatura:
    return Fatura.objects.create(
        tenant=assinatura.tenant,
        assinatura=assinatura,
        id_no_provedor=f"pay_{assinatura.pk}_{vencimento.isoformat()}",
        valor=valor,
        valor_liquido=valor_liquido,
        vencimento=vencimento,
        situacao=situacao,
        forma_de_pagamento=FormaDeCobranca.PIX,
        paga_em=vencimento if situacao == SituacaoDaFatura.PAGA else None,
    )


def abrir_ordem(tenant: Tenant, *, dias_atras: int = 0) -> OrdemServico:
    loja = Loja.objects.filter(tenant=tenant).first() or Loja.objects.create(
        tenant=tenant, nome="Matriz"
    )
    cliente = Cliente.objects.create(tenant=tenant, nome="Maria Souza", telefone="11999990000")
    aparelho = Aparelho.objects.create(
        tenant=tenant, cliente=cliente, marca="Samsung", modelo="Galaxy A15"
    )
    ordem = OrdemServico.abrir(
        tenant=tenant,
        loja=loja,
        cliente=cliente,
        aparelho=aparelho,
        problema_relatado="Tela trincada",
    )
    if dias_atras:
        OrdemServico.objects.filter(pk=ordem.pk).update(
            criado_em=timezone.now() - timedelta(days=dias_atras)
        )
    return ordem
