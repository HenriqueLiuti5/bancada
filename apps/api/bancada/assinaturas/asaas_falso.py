# Um Asaas falso, só para os testes de navegador da CI assinarem sem cobrança de verdade (ADR 0040).
# Responde à parte da API que o provedor.py usa e guarda tudo na memória. Não carrega o Django:
#   python -m bancada.assinaturas.asaas_falso 8010
import json
import re
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from itertools import count
from typing import Any

PORTA_PADRAO = 8010
CICLOS = {"MONTHLY", "YEARLY"}


class Estado:
    def __init__(self) -> None:
        self.numeros = count(1)
        self.assinaturas: dict[str, dict[str, Any]] = {}
        self.cobrancas: dict[str, dict[str, Any]] = {}

    def novo_id(self, prefixo: str) -> str:
        return f"{prefixo}_{next(self.numeros)}"


class Pedido(BaseHTTPRequestHandler):
    estado: Estado

    def _responder(self, situacao: int, corpo: dict[str, Any]) -> None:
        dados = json.dumps(corpo).encode()
        self.send_response(situacao)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(dados)))
        self.end_headers()
        self.wfile.write(dados)

    def _recusar(self, situacao: int, descricao: str) -> None:
        self._responder(situacao, {"errors": [{"code": "invalid", "description": descricao}]})

    def _corpo(self) -> dict[str, Any]:
        tamanho = int(self.headers.get("Content-Length") or 0)
        lido = json.loads(self.rfile.read(tamanho) or b"{}")
        return lido if isinstance(lido, dict) else {}

    def _caminho(self) -> str:
        return self.path.split("?")[0].removeprefix("/v3")

    def _atender(self, metodo: str) -> None:
        if not self.headers.get("access_token"):
            self._recusar(401, "Sem a chave de acesso.")
            return

        caminho = self._caminho()
        for padrao, acao in ROTAS[metodo]:
            achado = re.fullmatch(padrao, caminho)
            if achado:
                acao(self, *achado.groups())
                return
        self._recusar(404, f"O Asaas falso não conhece {metodo} {caminho}.")

    def do_GET(self) -> None:
        self._atender("GET")

    def do_POST(self) -> None:
        self._atender("POST")

    def do_DELETE(self) -> None:
        self._atender("DELETE")

    def criar_cliente(self) -> None:
        self._responder(200, {"id": self.estado.novo_id("cus"), **self._corpo()})

    def criar_assinatura(self) -> None:
        corpo = self._corpo()
        if corpo.get("cycle") not in CICLOS:
            self._recusar(400, "Ciclo inválido.")
            return

        assinatura = {"id": self.estado.novo_id("sub"), "status": "ACTIVE", **corpo}
        cobranca_id = self.estado.novo_id("pay")
        self.estado.assinaturas[assinatura["id"]] = assinatura
        self.estado.cobrancas[cobranca_id] = {
            "id": cobranca_id,
            "subscription": assinatura["id"],
            "value": corpo.get("value"),
            "netValue": corpo.get("value"),
            "dueDate": corpo.get("nextDueDate"),
            "status": "PENDING",
            "billingType": corpo.get("billingType", "UNDEFINED"),
            "invoiceUrl": f"http://{self.headers.get('Host')}/i/{cobranca_id}",
            "deleted": False,
        }
        self._responder(200, assinatura)

    def cobrancas_da_assinatura(self, assinatura: str) -> None:
        dados = [c for c in self.estado.cobrancas.values() if c["subscription"] == assinatura]
        self._responder(200, {"data": dados, "totalCount": len(dados)})

    def cancelar_assinatura(self, assinatura: str) -> None:
        if assinatura not in self.estado.assinaturas:
            self._recusar(404, "Assinatura não encontrada.")
            return
        self.estado.assinaturas[assinatura]["status"] = "INACTIVE"
        for cobranca in self.estado.cobrancas.values():
            if cobranca["subscription"] == assinatura and cobranca["status"] == "PENDING":
                cobranca["deleted"] = True
        self._responder(200, {"deleted": True, "id": assinatura})

    def _cobranca(self, cobranca: str) -> dict[str, Any] | None:
        achada = self.estado.cobrancas.get(cobranca)
        if achada is None:
            self._recusar(404, "Cobrança não encontrada.")
        return achada

    def receber_em_dinheiro(self, cobranca: str) -> None:
        achada = self._cobranca(cobranca)
        if achada is not None:
            achada.update(status="RECEIVED_IN_CASH", paymentDate=self._corpo().get("paymentDate"))
            self._responder(200, achada)

    def devolver(self, cobranca: str) -> None:
        achada = self._cobranca(cobranca)
        if achada is not None:
            achada["status"] = "REFUNDED"
            self._responder(200, achada)

    def devolver_boleto(self, cobranca: str) -> None:
        if self._cobranca(cobranca) is not None:
            endereco = f"http://{self.headers.get('Host')}/solicitar-estorno/{cobranca}"
            self._responder(200, {"requestUrl": endereco})


ROTAS: dict[str, list[tuple[str, Any]]] = {
    "GET": [(r"/subscriptions/([\w-]+)/payments", Pedido.cobrancas_da_assinatura)],
    "POST": [
        (r"/customers", Pedido.criar_cliente),
        (r"/subscriptions", Pedido.criar_assinatura),
        (r"/payments/([\w-]+)/receiveInCash", Pedido.receber_em_dinheiro),
        (r"/payments/([\w-]+)/refund", Pedido.devolver),
        (r"/payments/([\w-]+)/bankSlip/refund", Pedido.devolver_boleto),
    ],
    "DELETE": [(r"/subscriptions/([\w-]+)", Pedido.cancelar_assinatura)],
}


def criar_servidor(porta: int) -> ThreadingHTTPServer:
    class PedidoComEstado(Pedido):
        estado = Estado()

    return ThreadingHTTPServer(("0.0.0.0", porta), PedidoComEstado)


if __name__ == "__main__":
    porta = int(sys.argv[1]) if len(sys.argv) > 1 else PORTA_PADRAO
    print(f"Asaas falso na porta {porta}", flush=True)
    criar_servidor(porta).serve_forever()
