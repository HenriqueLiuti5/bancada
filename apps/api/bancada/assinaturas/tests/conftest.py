from datetime import date
from decimal import Decimal
from typing import Any

import pytest
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from bancada.assinaturas.models import FormaDeCobranca, SituacaoDaFatura
from bancada.assinaturas.provedor import Cobranca, ErroNoProvedor
from bancada.tenants.models import Papel, Tenant, Usuario

TOKEN_DO_WEBHOOK = "token-de-teste-do-webhook-com-mais-de-32-caracteres"


class ProvedorFalso:
    def __init__(self) -> None:
        self.clientes: list[dict[str, Any]] = []
        self.assinaturas: list[dict[str, Any]] = []
        self.canceladas: list[str] = []
        self.cobrancas: dict[str, list[Cobranca]] = {}
        self.falhar_em: str | None = None

    def _talvez_falhar(self, operacao: str) -> None:
        if self.falhar_em == operacao:
            raise ErroNoProvedor("O Asaas está fora do ar.")

    def criar_cliente(self, *, nome: str, documento: str, email: str, referencia: str) -> str:
        self._talvez_falhar("criar_cliente")
        self.clientes.append(
            {"nome": nome, "documento": documento, "email": email, "referencia": referencia}
        )
        return f"cus_{len(self.clientes)}"

    def criar_assinatura(
        self,
        *,
        cliente: str,
        valor: Decimal,
        primeiro_vencimento: date,
        descricao: str,
        referencia: str,
    ) -> str:
        self._talvez_falhar("criar_assinatura")
        identificador = f"sub_{len(self.assinaturas) + 1}"
        self.assinaturas.append(
            {
                "id": identificador,
                "cliente": cliente,
                "valor": valor,
                "primeiro_vencimento": primeiro_vencimento,
                "referencia": referencia,
            }
        )
        self.cobrancas[identificador] = [
            Cobranca(
                id=f"pay_{identificador}",
                assinatura=identificador,
                valor=valor,
                vencimento=primeiro_vencimento,
                situacao=SituacaoDaFatura.ABERTA,
                forma=FormaDeCobranca.A_ESCOLHER,
                paga_em=None,
                link=f"https://sandbox.asaas.test/i/{identificador}",
            )
        ]
        return identificador

    def cancelar_assinatura(self, assinatura: str) -> None:
        self._talvez_falhar("cancelar_assinatura")
        self.canceladas.append(assinatura)

    def cobrancas_da_assinatura(self, assinatura: str) -> list[Cobranca]:
        self._talvez_falhar("cobrancas_da_assinatura")
        return list(self.cobrancas.get(assinatura, []))


@pytest.fixture
def provedor(monkeypatch: pytest.MonkeyPatch) -> ProvedorFalso:
    falso = ProvedorFalso()
    monkeypatch.setattr("bancada.assinaturas.servicos.provedor_configurado", lambda: falso)
    monkeypatch.setattr("bancada.assinaturas.tasks.provedor_configurado", lambda: falso)
    return falso


@pytest.fixture(autouse=True)
def configuracao_da_cobranca(settings: Any) -> None:
    settings.ASAAS_WEBHOOK_TOKEN = TOKEN_DO_WEBHOOK
    settings.VALOR_DA_ASSINATURA = Decimal("59.90")


@pytest.fixture
def dono(tenant: Tenant) -> Usuario:
    return Usuario.objects.create_user(
        username="marcos@central.test",
        email="marcos@central.test",
        first_name="Marcos Lima",
        password="senha-de-teste",
        tenant=tenant,
        papel=Papel.DONO,
    )


@pytest.fixture
def api_dono(dono: Usuario) -> APIClient:
    cliente_api = APIClient()
    token, _ = Token.objects.get_or_create(user=dono)
    cliente_api.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
    return cliente_api
