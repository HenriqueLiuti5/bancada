import threading
from collections.abc import Iterator
from datetime import date
from decimal import Decimal

import pytest

from bancada.assinaturas.asaas_falso import criar_servidor
from bancada.assinaturas.models import SituacaoDaFatura
from bancada.assinaturas.provedor import Asaas, ErroNoProvedor


@pytest.fixture
def asaas_falso() -> Iterator[Asaas]:
    servidor = criar_servidor(0)
    threading.Thread(target=servidor.serve_forever, daemon=True).start()
    yield Asaas(url=f"http://127.0.0.1:{servidor.server_address[1]}/v3", chave="chave-de-teste")
    servidor.shutdown()
    servidor.server_close()


def test_o_asaas_falso_assina_devolve_e_cancela_como_o_bancada_espera(asaas_falso: Asaas) -> None:
    cliente = asaas_falso.criar_cliente(
        nome="Conserta Já",
        documento="52998224725",
        email="dono@ja.test",
        referencia="assistencia-1",
    )
    assinatura = asaas_falso.criar_assinatura(
        cliente=cliente,
        valor=Decimal("399.00"),
        ciclo="anual",
        primeiro_vencimento=date(2026, 11, 27),
        descricao="Assinatura anual do Bancada, plano Solo",
        referencia="assistencia-1",
    )

    [cobranca] = asaas_falso.cobrancas_da_assinatura(assinatura)
    assert (cobranca.valor, cobranca.vencimento, cobranca.situacao) == (
        Decimal("399.00"),
        date(2026, 11, 27),
        SituacaoDaFatura.ABERTA,
    )
    assert cobranca.link.endswith(f"/i/{cobranca.id}")

    link = asaas_falso.devolver_cobranca(cobranca.id, boleto=True)
    assert link.endswith(f"/solicitar-estorno/{cobranca.id}")
    assert asaas_falso.devolver_cobranca(cobranca.id, boleto=False) == ""
    assert asaas_falso.cobrancas_da_assinatura(assinatura)[0].situacao == SituacaoDaFatura.ESTORNADA

    asaas_falso.cancelar_assinatura(assinatura)


def test_o_asaas_falso_recusa_assinatura_que_nao_existe(asaas_falso: Asaas) -> None:
    with pytest.raises(ErroNoProvedor, match="Assinatura não encontrada."):
        asaas_falso.cancelar_assinatura("sub_que_nao_existe")
