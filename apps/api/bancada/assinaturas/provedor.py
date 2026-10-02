import json
import secrets
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Any, Protocol

from django.conf import settings

from bancada.assinaturas.models import FormaDeCobranca, SituacaoDaFatura

TEMPO_LIMITE_EM_SEGUNDOS = 20
NOME_DO_SISTEMA = "Bancada"
COBRANCAS_POR_CONSULTA = 100
CABECALHO_DO_TOKEN_DO_WEBHOOK = "asaas-access-token"
EVENTOS_DE_ASSINATURA_ENCERRADA = frozenset({"SUBSCRIPTION_DELETED", "SUBSCRIPTION_INACTIVATED"})

SITUACOES_DO_ASAAS = {
    "PENDING": SituacaoDaFatura.ABERTA,
    "AWAITING_RISK_ANALYSIS": SituacaoDaFatura.ABERTA,
    "CONFIRMED": SituacaoDaFatura.PAGA,
    "RECEIVED": SituacaoDaFatura.PAGA,
    "RECEIVED_IN_CASH": SituacaoDaFatura.PAGA,
    "DUNNING_RECEIVED": SituacaoDaFatura.PAGA,
    "OVERDUE": SituacaoDaFatura.VENCIDA,
    "DUNNING_REQUESTED": SituacaoDaFatura.VENCIDA,
    "REFUNDED": SituacaoDaFatura.ESTORNADA,
    "REFUND_REQUESTED": SituacaoDaFatura.ESTORNADA,
    "REFUND_IN_PROGRESS": SituacaoDaFatura.ESTORNADA,
    "CHARGEBACK_REQUESTED": SituacaoDaFatura.ESTORNADA,
    "CHARGEBACK_DISPUTE": SituacaoDaFatura.ESTORNADA,
    "AWAITING_CHARGEBACK_REVERSAL": SituacaoDaFatura.ESTORNADA,
}

FORMAS_DO_ASAAS = {
    "PIX": FormaDeCobranca.PIX,
    "BOLETO": FormaDeCobranca.BOLETO,
    "CREDIT_CARD": FormaDeCobranca.CARTAO,
}


class ErroNoProvedor(Exception):
    pass


@dataclass(frozen=True)
class Cobranca:
    id: str
    assinatura: str
    valor: Decimal
    vencimento: date
    situacao: str
    forma: str
    paga_em: date | None
    link: str


@dataclass(frozen=True)
class EventoRecebido:
    id: str
    tipo: str
    cobranca: Cobranca | None
    assinatura_encerrada: str | None


class ProvedorDeCobranca(Protocol):
    def criar_cliente(self, *, nome: str, documento: str, email: str, referencia: str) -> str: ...

    def criar_assinatura(
        self,
        *,
        cliente: str,
        valor: Decimal,
        primeiro_vencimento: date,
        descricao: str,
        referencia: str,
    ) -> str: ...

    def cancelar_assinatura(self, assinatura: str) -> None: ...

    def cobrancas_da_assinatura(self, assinatura: str) -> list[Cobranca]: ...


def _data(valor: Any) -> date | None:
    return date.fromisoformat(valor) if isinstance(valor, str) and valor else None


def cobranca_do_asaas(dados: dict[str, Any]) -> Cobranca:
    situacao = (
        SituacaoDaFatura.CANCELADA
        if dados.get("deleted")
        else SITUACOES_DO_ASAAS.get(str(dados.get("status")), SituacaoDaFatura.ABERTA)
    )
    pagamento = (
        dados.get("clientPaymentDate") or dados.get("paymentDate") or dados.get("confirmedDate")
    )
    return Cobranca(
        id=str(dados["id"]),
        assinatura=str(dados.get("subscription") or ""),
        valor=Decimal(str(dados["value"])),
        vencimento=date.fromisoformat(dados["dueDate"]),
        situacao=situacao,
        forma=FORMAS_DO_ASAAS.get(str(dados.get("billingType")), FormaDeCobranca.A_ESCOLHER),
        paga_em=_data(pagamento) if situacao == SituacaoDaFatura.PAGA else None,
        link=str(dados.get("invoiceUrl") or ""),
    )


def _id_do_evento(corpo: dict[str, Any], tipo: str) -> str:
    if corpo.get("id"):
        return str(corpo["id"])
    objeto = corpo.get("payment") or corpo.get("subscription") or {}
    return f"{tipo}:{objeto.get('id', '')}:{corpo.get('dateCreated', '')}"


def _assinatura_encerrada(tipo: str, assinatura: Any) -> str | None:
    if tipo not in EVENTOS_DE_ASSINATURA_ENCERRADA or not isinstance(assinatura, dict):
        return None
    return str(assinatura.get("id") or "") or None


def evento_do_asaas(corpo: dict[str, Any]) -> EventoRecebido:
    tipo = str(corpo.get("event") or "")
    pagamento = corpo.get("payment")
    cobranca = (
        cobranca_do_asaas(pagamento)
        if tipo.startswith("PAYMENT_") and isinstance(pagamento, dict)
        else None
    )
    return EventoRecebido(
        id=_id_do_evento(corpo, tipo),
        tipo=tipo,
        cobranca=cobranca,
        assinatura_encerrada=_assinatura_encerrada(tipo, corpo.get("subscription")),
    )


def token_do_webhook_valido(recebido: str) -> bool:
    esperado = settings.ASAAS_WEBHOOK_TOKEN
    return bool(esperado) and secrets.compare_digest(recebido.encode(), esperado.encode())


def _descricao_do_erro(erro: urllib.error.HTTPError) -> str:
    try:
        corpo = json.loads(erro.read() or b"{}")
    except ValueError:
        corpo = {}

    erros = corpo.get("errors", []) if isinstance(corpo, dict) else []
    descricoes = [
        str(item["description"])
        for item in erros
        if isinstance(item, dict) and item.get("description")
    ]
    return " ".join(descricoes) or f"O Asaas recusou o pedido (código {erro.code})."


class Asaas:
    def __init__(self, *, url: str, chave: str) -> None:
        self.url = url.rstrip("/")
        self.chave = chave

    def _chamar(
        self, metodo: str, caminho: str, corpo: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        if not self.chave:
            raise ErroNoProvedor("A cobrança ainda não está configurada no servidor.")

        pedido = urllib.request.Request(
            f"{self.url}{caminho}",
            method=metodo,
            data=json.dumps(corpo).encode() if corpo is not None else None,
            headers={
                "access_token": self.chave,
                "User-Agent": NOME_DO_SISTEMA,
                "Content-Type": "application/json",
            },
        )
        try:
            with urllib.request.urlopen(pedido, timeout=TEMPO_LIMITE_EM_SEGUNDOS) as resposta:
                return json.load(resposta)
        except urllib.error.HTTPError as erro:
            raise ErroNoProvedor(_descricao_do_erro(erro)) from erro
        except (urllib.error.URLError, TimeoutError) as erro:
            raise ErroNoProvedor(
                "Não foi possível falar com o Asaas agora. Tente de novo em instantes."
            ) from erro

    def criar_cliente(self, *, nome: str, documento: str, email: str, referencia: str) -> str:
        cliente = self._chamar(
            "POST",
            "/customers",
            {"name": nome, "cpfCnpj": documento, "email": email, "externalReference": referencia},
        )
        return str(cliente["id"])

    def criar_assinatura(
        self,
        *,
        cliente: str,
        valor: Decimal,
        primeiro_vencimento: date,
        descricao: str,
        referencia: str,
    ) -> str:
        assinatura = self._chamar(
            "POST",
            "/subscriptions",
            {
                "customer": cliente,
                "billingType": "UNDEFINED",
                "value": float(valor),
                "nextDueDate": primeiro_vencimento.isoformat(),
                "cycle": "MONTHLY",
                "description": descricao,
                "externalReference": referencia,
            },
        )
        return str(assinatura["id"])

    def cancelar_assinatura(self, assinatura: str) -> None:
        self._chamar("DELETE", f"/subscriptions/{assinatura}")

    def cobrancas_da_assinatura(self, assinatura: str) -> list[Cobranca]:
        consulta = self._chamar(
            "GET", f"/subscriptions/{assinatura}/payments?limit={COBRANCAS_POR_CONSULTA}"
        )
        return [cobranca_do_asaas(item) for item in consulta.get("data", [])]


def provedor_configurado() -> ProvedorDeCobranca:
    return Asaas(url=settings.ASAAS_API_URL, chave=settings.ASAAS_API_KEY)
