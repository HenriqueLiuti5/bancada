import pytest

from bancada.ordens.estados import StatusOS
from bancada.ordens.forms import OrdemServicoForm
from bancada.ordens.models import OrdemServico


def _dados(ordem: OrdemServico, status: str) -> dict[str, object]:
    return {
        "tenant": ordem.tenant_id,
        "loja": ordem.loja_id,
        "cliente": ordem.cliente_id,
        "aparelho": ordem.aparelho_id,
        "tecnico": "",
        "status": status,
        "problema_relatado": ordem.problema_relatado,
        "diagnostico": "",
        "laudo": "",
        "prometida_para": "",
        "garantia_ate": "",
    }


@pytest.mark.django_db
def test_formulario_aceita_transicao_valida(ordem: OrdemServico) -> None:
    form = OrdemServicoForm(data=_dados(ordem, StatusOS.EM_DIAGNOSTICO), instance=ordem)

    assert form.is_valid(), form.errors


@pytest.mark.django_db
def test_formulario_recusa_transicao_invalida(ordem: OrdemServico) -> None:
    form = OrdemServicoForm(data=_dados(ordem, StatusOS.ENTREGUE), instance=ordem)

    assert not form.is_valid()
    assert "status" in form.errors
