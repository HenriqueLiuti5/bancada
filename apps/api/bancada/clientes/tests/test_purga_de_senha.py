from datetime import timedelta

import pytest
from django.utils import timezone

from bancada.auditoria.models import Acao, RegistroDeAuditoria
from bancada.clientes.models import Aparelho
from bancada.clientes.tasks import DIAS_DE_CARENCIA_APOS_A_ENTREGA, purgar_senhas_de_desbloqueio
from bancada.ordens.estados import StatusOS
from bancada.ordens.models import OrdemServico


def entregar(ordem: OrdemServico) -> None:
    for status in [
        StatusOS.EM_DIAGNOSTICO,
        StatusOS.ORCAMENTO_ENVIADO,
        StatusOS.APROVADO,
        StatusOS.EM_REPARO,
        StatusOS.PRONTO,
        StatusOS.ENTREGUE,
    ]:
        ordem.transicionar(status)


def envelhecer(ordem: OrdemServico, dias: int) -> None:
    OrdemServico.objects.filter(pk=ordem.pk).update(
        atualizado_em=timezone.now() - timedelta(days=dias)
    )


@pytest.mark.django_db
def test_senha_some_depois_da_carencia(ordem: OrdemServico, aparelho: Aparelho) -> None:
    entregar(ordem)
    envelhecer(ordem, DIAS_DE_CARENCIA_APOS_A_ENTREGA + 1)

    assert purgar_senhas_de_desbloqueio.run() == 1

    aparelho.refresh_from_db()
    assert aparelho.senha_desbloqueio == ""


@pytest.mark.django_db
def test_a_purga_fica_registrada_na_auditoria(ordem: OrdemServico, aparelho: Aparelho) -> None:
    entregar(ordem)
    envelhecer(ordem, DIAS_DE_CARENCIA_APOS_A_ENTREGA + 1)

    purgar_senhas_de_desbloqueio.run()

    registro = RegistroDeAuditoria.objects.get(acao=Acao.SENHA_PURGADA)
    assert registro.objeto_id == aparelho.pk
    assert registro.usuario is None
    assert registro.tenant == aparelho.tenant


@pytest.mark.django_db
def test_senha_fica_durante_a_carencia(ordem: OrdemServico, aparelho: Aparelho) -> None:
    entregar(ordem)
    envelhecer(ordem, DIAS_DE_CARENCIA_APOS_A_ENTREGA - 1)

    assert purgar_senhas_de_desbloqueio.run() == 0

    aparelho.refresh_from_db()
    assert aparelho.senha_desbloqueio == "1234"


@pytest.mark.django_db
def test_aparelho_com_ordem_aberta_mantem_a_senha(ordem: OrdemServico, aparelho: Aparelho) -> None:
    ordem.transicionar(StatusOS.EM_DIAGNOSTICO)
    envelhecer(ordem, 400)

    assert purgar_senhas_de_desbloqueio.run() == 0

    aparelho.refresh_from_db()
    assert aparelho.senha_desbloqueio == "1234"


@pytest.mark.django_db
def test_uma_ordem_nova_protege_a_senha_de_uma_antiga(
    tenant: object, loja: object, cliente: object, aparelho: Aparelho, ordem: OrdemServico
) -> None:
    entregar(ordem)
    envelhecer(ordem, 400)
    nova = OrdemServico.abrir(
        tenant=aparelho.tenant,
        loja=ordem.loja,
        cliente=ordem.cliente,
        aparelho=aparelho,
        problema_relatado="Voltou com o mesmo defeito",
    )

    assert purgar_senhas_de_desbloqueio.run() == 0

    aparelho.refresh_from_db()
    assert aparelho.senha_desbloqueio == "1234"
    assert nova.status == StatusOS.RECEBIDO


@pytest.mark.django_db
def test_aparelho_sem_senha_nao_entra_na_purga(ordem: OrdemServico, aparelho: Aparelho) -> None:
    aparelho.senha_desbloqueio = ""
    aparelho.save(update_fields=["senha_desbloqueio"])
    entregar(ordem)
    envelhecer(ordem, 400)

    assert purgar_senhas_de_desbloqueio.run() == 0
    assert RegistroDeAuditoria.objects.count() == 0


@pytest.mark.django_db
def test_aparelho_sem_nenhuma_ordem_mantem_a_senha(aparelho: Aparelho) -> None:
    assert purgar_senhas_de_desbloqueio.run() == 0

    aparelho.refresh_from_db()
    assert aparelho.senha_desbloqueio == "1234"
