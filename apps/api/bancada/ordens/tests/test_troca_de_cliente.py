from collections.abc import Callable
from typing import Any

import pytest
from django.core import mail
from django.core.cache import cache
from rest_framework.test import APIClient

from bancada.auditoria.models import Acao, RegistroDeAuditoria
from bancada.avisos import tasks
from bancada.clientes.models import Aparelho, Cliente
from bancada.ordens.estados import StatusOS
from bancada.ordens.models import ItemOrcamento, OrdemServico, RegistroOS, TipoDeRegistro
from bancada.tenants.models import Loja, Tenant, Usuario

CLIENTE_NOVO = {"nome": "  Ana Prado  ", "telefone": "(21) 97777-6666", "email": "ana@exemplo.test"}
APARELHO_NOVO = {
    "marca": "Apple",
    "modelo": "iPhone 13",
    "imei": "35-209900-176148-1",
    "senha_desbloqueio": "2580",
}


@pytest.fixture(autouse=True)
def cache_limpo() -> None:
    cache.clear()


@pytest.fixture
def maria_silva(tenant: Tenant) -> Cliente:
    return Cliente.objects.create(
        tenant=tenant, nome="Maria Silva", telefone="11977776666", email="silva@exemplo.test"
    )


@pytest.fixture
def ordem_na_cliente_errada(tenant: Tenant, loja: Loja, maria_silva: Cliente) -> OrdemServico:
    aparelho = Aparelho.objects.create(
        tenant=tenant,
        cliente=maria_silva,
        marca="Samsung",
        modelo="Galaxy A54",
        senha_desbloqueio="1-2-3-6-9",
    )
    return OrdemServico.abrir(
        tenant=tenant,
        loja=loja,
        cliente=maria_silva,
        aparelho=aparelho,
        problema_relatado="Tela trincada",
    )


@pytest.fixture
def aparelho_com_outra_ordem(
    tenant: Tenant, loja: Loja, ordem_na_cliente_errada: OrdemServico
) -> Aparelho:
    aparelho = ordem_na_cliente_errada.aparelho
    OrdemServico.objects.create(
        tenant=tenant,
        loja=loja,
        cliente=aparelho.cliente,
        aparelho=aparelho,
        problema_relatado="Bateria estufada",
        status=StatusOS.ENTREGUE,
    )
    return aparelho


def trocar(api: APIClient, ordem: OrdemServico, **corpo: Any) -> Any:
    return api.post(f"/api/ordens/{ordem.pk}/trocar-cliente/", corpo, format="json")


@pytest.mark.django_db
def test_ordem_passa_para_o_cliente_certo_levando_o_aparelho(
    api_atendente: APIClient,
    ordem_na_cliente_errada: OrdemServico,
    cliente: Cliente,
    maria_silva: Cliente,
) -> None:
    resposta = trocar(api_atendente, ordem_na_cliente_errada, cliente=cliente.pk)

    assert resposta.status_code == 200
    assert resposta.json()["cliente_nome"] == "Maria Souza"
    ordem_na_cliente_errada.refresh_from_db()
    assert ordem_na_cliente_errada.cliente == cliente
    assert ordem_na_cliente_errada.aparelho.cliente == cliente
    assert ordem_na_cliente_errada.aparelho.senha_desbloqueio == "1-2-3-6-9"
    assert ordem_na_cliente_errada.status == StatusOS.RECEBIDO
    assert Cliente.objects.filter(pk=maria_silva.pk).exists()


@pytest.mark.django_db
def test_troca_fica_no_historico_com_quem_fez(
    api_atendente: APIClient, ordem_na_cliente_errada: OrdemServico, cliente: Cliente
) -> None:
    resposta = trocar(api_atendente, ordem_na_cliente_errada, cliente=cliente.pk)

    [registro] = resposta.json()["registros"]
    assert registro["tipo"] == TipoDeRegistro.TROCA_DE_CLIENTE
    assert registro["texto"] == "De Maria Silva para Maria Souza."
    assert registro["usuario"] == "carla"
    assert ordem_na_cliente_errada.eventos.count() == 1


@pytest.mark.django_db
def test_troca_fica_na_auditoria(
    api_atendente: APIClient,
    atendente_do_tenant: Usuario,
    ordem_na_cliente_errada: OrdemServico,
    cliente: Cliente,
    maria_silva: Cliente,
) -> None:
    trocar(api_atendente, ordem_na_cliente_errada, cliente=cliente.pk)

    registro = RegistroDeAuditoria.objects.get(acao=Acao.CLIENTE_TROCADO)
    assert registro.usuario == atendente_do_tenant
    assert registro.objeto == "ordem"
    assert registro.objeto_id == ordem_na_cliente_errada.pk
    assert registro.detalhe == (
        f"OS #{ordem_na_cliente_errada.numero}, de Maria Silva (id {maria_silva.pk}) "
        f"para Maria Souza (id {cliente.pk})"
    )


@pytest.mark.django_db
def test_troca_cadastrando_o_cliente_certo_na_hora(
    api_atendente: APIClient, ordem_na_cliente_errada: OrdemServico, tenant: Tenant
) -> None:
    resposta = trocar(api_atendente, ordem_na_cliente_errada, cliente_novo=CLIENTE_NOVO)

    assert resposta.status_code == 200
    novo = Cliente.objects.get(nome="Ana Prado")
    assert novo.tenant == tenant
    assert novo.telefone == "21977776666"
    ordem_na_cliente_errada.refresh_from_db()
    assert ordem_na_cliente_errada.cliente == novo
    assert ordem_na_cliente_errada.aparelho.cliente == novo


@pytest.mark.django_db
def test_troca_gera_link_novo_e_o_antigo_para_de_abrir(
    api_atendente: APIClient,
    ordem_na_cliente_errada: OrdemServico,
    cliente: Cliente,
    aparelho: Aparelho,
    aparelho_com_outra_ordem: Aparelho,
    django_capture_on_commit_callbacks: Callable[..., Any],
) -> None:
    publico = APIClient()
    link_antigo = f"/api/publico/os/{ordem_na_cliente_errada.token_publico}/"
    assert publico.get(link_antigo).status_code == 200

    with django_capture_on_commit_callbacks(execute=True):
        resposta = trocar(
            api_atendente, ordem_na_cliente_errada, cliente=cliente.pk, aparelho=aparelho.pk
        )

    novo_token = resposta.json()["token_publico"]
    assert novo_token != ordem_na_cliente_errada.token_publico
    assert publico.get(link_antigo).status_code == 404
    pagina = publico.get(f"/api/publico/os/{novo_token}/").json()
    assert pagina["aparelho"] == "Motorola Moto G54"


@pytest.mark.django_db
def test_aparelho_com_outras_ordens_fica_com_o_cliente_errado(
    api_atendente: APIClient,
    ordem_na_cliente_errada: OrdemServico,
    cliente: Cliente,
    maria_silva: Cliente,
    aparelho_com_outra_ordem: Aparelho,
) -> None:
    resposta = trocar(api_atendente, ordem_na_cliente_errada, cliente=cliente.pk)

    assert resposta.status_code == 400
    assert resposta.json()["aparelho"] == [
        "O Samsung Galaxy A54 tem outras ordens e continua com Maria Silva. "
        "Escolha o aparelho do cliente certo ou cadastre outro."
    ]
    ordem_na_cliente_errada.refresh_from_db()
    assert ordem_na_cliente_errada.cliente == maria_silva


@pytest.mark.django_db
def test_troca_para_um_aparelho_que_o_cliente_certo_ja_tinha(
    api_atendente: APIClient,
    ordem_na_cliente_errada: OrdemServico,
    cliente: Cliente,
    aparelho: Aparelho,
    maria_silva: Cliente,
    aparelho_com_outra_ordem: Aparelho,
) -> None:
    resposta = trocar(
        api_atendente, ordem_na_cliente_errada, cliente=cliente.pk, aparelho=aparelho.pk
    )

    assert resposta.status_code == 200
    ordem_na_cliente_errada.refresh_from_db()
    assert ordem_na_cliente_errada.aparelho == aparelho
    aparelho_com_outra_ordem.refresh_from_db()
    assert aparelho_com_outra_ordem.cliente == maria_silva
    registro = RegistroOS.objects.get(ordem=ordem_na_cliente_errada)
    assert registro.texto == (
        "De Maria Silva para Maria Souza. "
        "Aparelho trocado de Samsung Galaxy A54 para Motorola Moto G54."
    )


@pytest.mark.django_db
def test_troca_cadastrando_cliente_e_aparelho_novos(
    api_atendente: APIClient,
    ordem_na_cliente_errada: OrdemServico,
    aparelho_com_outra_ordem: Aparelho,
) -> None:
    resposta = trocar(
        api_atendente,
        ordem_na_cliente_errada,
        cliente_novo=CLIENTE_NOVO,
        aparelho_novo=APARELHO_NOVO,
    )

    assert resposta.status_code == 200
    ordem_na_cliente_errada.refresh_from_db()
    novo = ordem_na_cliente_errada.aparelho
    assert novo.cliente.nome == "Ana Prado"
    assert str(novo) == "Apple iPhone 13"
    assert novo.imei == "352099001761481"
    assert novo.senha_desbloqueio == "2580"


@pytest.mark.django_db
def test_aparelho_que_vai_junto_nao_e_trocado(
    api_atendente: APIClient,
    ordem_na_cliente_errada: OrdemServico,
    cliente: Cliente,
    aparelho: Aparelho,
) -> None:
    resposta = trocar(
        api_atendente, ordem_na_cliente_errada, cliente=cliente.pk, aparelho=aparelho.pk
    )

    assert resposta.status_code == 400
    assert resposta.json()["aparelho"] == [
        "O Samsung Galaxy A54 só tem esta ordem e vai junto para o cliente certo."
    ]


@pytest.mark.django_db
def test_aparelho_de_outro_cliente_e_recusado(
    api_atendente: APIClient,
    ordem_na_cliente_errada: OrdemServico,
    cliente: Cliente,
    tenant: Tenant,
    aparelho_com_outra_ordem: Aparelho,
) -> None:
    terceiro = Cliente.objects.create(tenant=tenant, nome="João Lima", telefone="11966665555")
    do_terceiro = Aparelho.objects.create(
        tenant=tenant, cliente=terceiro, marca="Xiaomi", modelo="Redmi 13"
    )

    resposta = trocar(
        api_atendente, ordem_na_cliente_errada, cliente=cliente.pk, aparelho=do_terceiro.pk
    )

    assert resposta.status_code == 400
    assert resposta.json()["aparelho"] == ["Não pertence a esse cliente."]


@pytest.mark.django_db
def test_mesmo_cliente_e_recusado(
    api_atendente: APIClient, ordem_na_cliente_errada: OrdemServico, maria_silva: Cliente
) -> None:
    resposta = trocar(api_atendente, ordem_na_cliente_errada, cliente=maria_silva.pk)

    assert resposta.status_code == 400
    assert resposta.json()["cliente"] == ["A ordem já está com esse cliente."]


@pytest.mark.django_db
def test_sem_cliente_e_recusado(
    api_atendente: APIClient, ordem_na_cliente_errada: OrdemServico
) -> None:
    resposta = trocar(api_atendente, ordem_na_cliente_errada)

    assert resposta.status_code == 400
    assert resposta.json()["cliente"] == ["Escolha o cliente certo ou cadastre um novo."]


@pytest.mark.django_db
def test_ordem_encerrada_nao_troca_de_cliente(
    api_atendente: APIClient, ordem_na_cliente_errada: OrdemServico, cliente: Cliente
) -> None:
    OrdemServico.objects.filter(pk=ordem_na_cliente_errada.pk).update(status=StatusOS.ENTREGUE)

    resposta = trocar(api_atendente, ordem_na_cliente_errada, cliente=cliente.pk)

    assert resposta.status_code == 409
    assert resposta.json()["detail"] == "Esta ordem já foi encerrada e não troca mais de cliente."


@pytest.mark.django_db
def test_cliente_de_outra_assistencia_e_recusado(
    api_atendente: APIClient, ordem_na_cliente_errada: OrdemServico, outro_tenant: Tenant
) -> None:
    alheio = Cliente.objects.create(tenant=outro_tenant, nome="Pedro", telefone="11955554444")

    resposta = trocar(api_atendente, ordem_na_cliente_errada, cliente=alheio.pk)

    assert resposta.status_code == 400
    assert "cliente" in resposta.json()
    assert not OrdemServico.objects.filter(cliente=alheio).exists()


@pytest.mark.django_db
def test_outra_assistencia_nao_troca_o_cliente(
    api_intruso: APIClient, ordem_na_cliente_errada: OrdemServico, cliente: Cliente
) -> None:
    resposta = trocar(api_intruso, ordem_na_cliente_errada, cliente=cliente.pk)

    assert resposta.status_code == 404


@pytest.mark.django_db
def test_proximo_aviso_vai_para_o_cliente_certo(
    api_atendente: APIClient, ordem_na_cliente_errada: OrdemServico, cliente: Cliente
) -> None:
    cliente.email = "souza@exemplo.test"
    cliente.save(update_fields=["email"])
    trocar(api_atendente, ordem_na_cliente_errada, cliente=cliente.pk)

    ordem = OrdemServico.objects.get(pk=ordem_na_cliente_errada.pk)
    ItemOrcamento.objects.create(ordem=ordem, descricao="Tela", valor="450.00")
    ordem.transicionar(StatusOS.EM_DIAGNOSTICO)
    evento = ordem.transicionar(StatusOS.ORCAMENTO_ENVIADO)
    tasks.avisar_cliente.run(evento.pk)

    [enviado] = mail.outbox
    assert enviado.to == ["souza@exemplo.test"]
    assert ordem.token_publico in enviado.body
