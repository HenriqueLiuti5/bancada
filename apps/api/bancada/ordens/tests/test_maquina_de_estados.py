import pytest

from bancada.ordens.estados import StatusOS, TransicaoInvalida
from bancada.ordens.models import OrdemServico
from bancada.tenants.models import Usuario


@pytest.mark.django_db
def test_ordem_nasce_como_recebida(ordem: OrdemServico) -> None:
    assert ordem.status == StatusOS.RECEBIDO


@pytest.mark.django_db
def test_caminho_feliz_ate_a_entrega(ordem: OrdemServico) -> None:
    caminho = [
        StatusOS.EM_DIAGNOSTICO,
        StatusOS.ORCAMENTO_ENVIADO,
        StatusOS.APROVADO,
        StatusOS.EM_REPARO,
        StatusOS.PRONTO,
        StatusOS.ENTREGUE,
    ]
    for status in caminho:
        ordem.transicionar(status)

    assert ordem.status == StatusOS.ENTREGUE
    assert ordem.encerrada
    assert ordem.entregue_em is not None


@pytest.mark.django_db
def test_nao_pode_pular_etapas(ordem: OrdemServico) -> None:
    with pytest.raises(TransicaoInvalida):
        ordem.transicionar(StatusOS.ENTREGUE)

    ordem.refresh_from_db()
    assert ordem.status == StatusOS.RECEBIDO


@pytest.mark.django_db
def test_ordem_encerrada_nao_aceita_mais_transicoes(ordem: OrdemServico) -> None:
    for status in [
        StatusOS.EM_DIAGNOSTICO,
        StatusOS.ORCAMENTO_ENVIADO,
        StatusOS.REPROVADO,
        StatusOS.DEVOLVIDO_SEM_REPARO,
    ]:
        ordem.transicionar(status)

    with pytest.raises(TransicaoInvalida):
        ordem.transicionar(StatusOS.EM_REPARO)


@pytest.mark.django_db
def test_aguardando_peca_volta_para_reparo(ordem: OrdemServico) -> None:
    for status in [
        StatusOS.EM_DIAGNOSTICO,
        StatusOS.ORCAMENTO_ENVIADO,
        StatusOS.APROVADO,
        StatusOS.EM_REPARO,
        StatusOS.AGUARDANDO_PECA,
        StatusOS.EM_REPARO,
    ]:
        ordem.transicionar(status)

    assert ordem.status == StatusOS.EM_REPARO


@pytest.mark.django_db
def test_cada_transicao_grava_um_evento(ordem: OrdemServico, tecnico: Usuario) -> None:
    ordem.transicionar(StatusOS.EM_DIAGNOSTICO, usuario=tecnico, nota="Bancada 2")

    eventos = list(ordem.eventos.all())
    assert len(eventos) == 2
    assert eventos[0].de_status == ""
    assert eventos[1].de_status == StatusOS.RECEBIDO
    assert eventos[1].para_status == StatusOS.EM_DIAGNOSTICO
    assert eventos[1].usuario == tecnico
    assert eventos[1].nota == "Bancada 2"


@pytest.mark.django_db
def test_transicao_invalida_nao_grava_evento(ordem: OrdemServico) -> None:
    with pytest.raises(TransicaoInvalida):
        ordem.transicionar(StatusOS.PRONTO)

    assert ordem.eventos.count() == 1
