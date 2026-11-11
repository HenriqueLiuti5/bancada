import io
from decimal import Decimal

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError

from reparium.assinaturas.models import Assinatura, Ciclo, Plano, SituacaoDaAssinatura
from reparium.assinaturas.tests.conftest import ProvedorFalso
from reparium.auditoria.models import Acao, RegistroDeAuditoria
from reparium.plataforma.tests.conftest import contratar, dono_da, nova_assistencia
from reparium.tenants.models import Loja, Papel, Tenant, Usuario


@pytest.fixture
def provedor(monkeypatch: pytest.MonkeyPatch) -> ProvedorFalso:
    falso = ProvedorFalso()
    monkeypatch.setattr("reparium.assinaturas.servicos.provedor_configurado", lambda: falso)
    return falso


def trocar(dono: Usuario, plano: str) -> str:
    saida = io.StringIO()
    call_command("trocar_plano", dono.email, plano, stdout=saida)
    return saida.getvalue()


def tecnico_da(tenant: Tenant, nome: str) -> Usuario:
    return Usuario.objects.create_user(
        username=f"{nome}@{tenant.slug}.test", tenant=tenant, papel=Papel.TECNICO
    )


def trocas_na_auditoria(tenant: Tenant) -> list[str]:
    return list(
        RegistroDeAuditoria.objects.filter(tenant=tenant, acao=Acao.PLANO_TROCADO).values_list(
            "detalhe", flat=True
        )
    )


@pytest.mark.django_db
def test_subir_de_plano_muda_o_valor_das_proximas_faturas_no_asaas(
    provedor: ProvedorFalso,
) -> None:
    tenant = nova_assistencia("Conserta Já")
    dono = dono_da(tenant)
    assinatura = contratar(tenant, plano=Plano.SOLO, valor=Decimal("49.90"))

    saida = trocar(dono, "rede")

    assert provedor.atualizadas == [
        {
            "id": assinatura.assinatura_no_provedor,
            "valor": Decimal("179.90"),
            "descricao": "Assinatura mensal do Reparium, plano Rede",
        }
    ]
    assinatura.refresh_from_db()
    assert (assinatura.plano, assinatura.ciclo, assinatura.valor) == (
        Plano.REDE,
        Ciclo.MENSAL,
        Decimal("179.90"),
    )
    assert trocas_na_auditoria(tenant) == ["Solo para Rede, R$ 179.90 por mês"]
    assert "Conserta Já passou do plano Solo para o Rede: R$ 179,90 por mês" in saida


@pytest.mark.django_db
def test_subir_nao_depende_do_tamanho_da_assistencia(provedor: ProvedorFalso) -> None:
    tenant = nova_assistencia("Quatro Lojas")
    dono = dono_da(tenant)
    for numero in range(4):
        Loja.objects.create(tenant=tenant, nome=f"Loja {numero}")
    contratar(tenant)

    trocar(dono, "rede")

    assert Assinatura.objects.get(tenant=tenant).plano == Plano.REDE


@pytest.mark.django_db
def test_descer_so_quando_a_assistencia_cabe_no_plano_menor(provedor: ProvedorFalso) -> None:
    tenant = nova_assistencia("Conserta Já")
    dono = dono_da(tenant)
    tecnico_da(tenant, "ana")
    bia = tecnico_da(tenant, "bia")
    contratar(tenant)

    with pytest.raises(CommandError) as recusa:
        trocar(dono, "solo")

    assert str(recusa.value) == (
        "A assistência tem 3 pessoas, contando os convites ainda não aceitos, e o plano Solo é "
        "para até 2. Nada foi trocado."
    )
    assert provedor.atualizadas == []
    assert Assinatura.objects.get(tenant=tenant).plano == Plano.EQUIPE
    assert trocas_na_auditoria(tenant) == []

    Usuario.objects.filter(pk=bia.pk).update(is_active=False)
    trocar(dono, "solo")

    assinatura = Assinatura.objects.get(tenant=tenant)
    assert (assinatura.plano, assinatura.valor) == (Plano.SOLO, Decimal("49.90"))
    assert trocas_na_auditoria(tenant) == ["Equipe para Solo, R$ 49.90 por mês"]


@pytest.mark.django_db
def test_fundadora_continua_com_o_preco_de_fundador_no_plano_novo(
    provedor: ProvedorFalso,
) -> None:
    tenant = nova_assistencia("Conserta Já")
    dono = dono_da(tenant)
    contratar(tenant, ciclo=Ciclo.ANUAL, valor=Decimal("629.00"), fundador=True)

    saida = trocar(dono, "rede")

    assert provedor.atualizadas[0]["valor"] == Decimal("1259.00")
    assert provedor.atualizadas[0]["descricao"] == "Assinatura anual do Reparium, plano Rede"
    assinatura = Assinatura.objects.get(tenant=tenant)
    assert (assinatura.valor, assinatura.fundador) == (Decimal("1259.00"), True)
    assert trocas_na_auditoria(tenant) == [
        "Equipe para Rede, R$ 1259.00 por ano, preço de fundador"
    ]
    assert "R$ 1.259,00 por ano a partir da próxima fatura" in saida


@pytest.mark.django_db
@pytest.mark.parametrize(
    ("situacao", "plano", "falha", "motivo"),
    [
        (None, "rede", None, "A assistência não tem uma assinatura ativa."),
        (
            SituacaoDaAssinatura.CANCELADA,
            "rede",
            None,
            "A assistência não tem uma assinatura ativa.",
        ),
        (SituacaoDaAssinatura.ATIVA, "equipe", None, "A assistência já está no plano Equipe."),
        (SituacaoDaAssinatura.ATIVA, "rede", "atualizar_assinatura", "O Asaas está fora do ar."),
    ],
)
def test_troca_recusada_nao_muda_nada(
    provedor: ProvedorFalso,
    situacao: str | None,
    plano: str,
    falha: str | None,
    motivo: str,
) -> None:
    tenant = nova_assistencia("Conserta Já")
    dono = dono_da(tenant)
    if situacao is not None:
        contratar(tenant, situacao=situacao)
    antes = Assinatura.objects.get(tenant=tenant)
    provedor.falhar_em = falha

    with pytest.raises(CommandError) as recusa:
        trocar(dono, plano)

    assert str(recusa.value) == f"{motivo} Nada foi trocado."
    depois = Assinatura.objects.get(tenant=tenant)
    assert (depois.plano, depois.valor) == (antes.plano, antes.valor)
    assert trocas_na_auditoria(tenant) == []


@pytest.mark.django_db
def test_troca_de_plano_recusa_quem_nao_e_dono(tecnico: Usuario) -> None:
    with pytest.raises(CommandError, match="Nenhum dono de assistência"):
        trocar(tecnico, "rede")
