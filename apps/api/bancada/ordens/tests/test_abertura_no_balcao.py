from typing import Any

import pytest
from rest_framework.test import APIClient

from bancada.clientes.models import Aparelho, Cliente
from bancada.ordens.models import OrdemServico
from bancada.tenants.models import Loja, Tenant

CLIENTE_NOVO = {
    "nome": "  Ana Beatriz  ",
    "telefone": "(31) 99876-5432",
    "email": "ana@exemplo.test",
}
APARELHO_NOVO = {
    "marca": "Apple",
    "modelo": "iPhone 13",
    "cor": "Azul",
    "imei": "35-209900-176148-1",
    "senha_desbloqueio": "2580",
}


def abrir(api: APIClient, loja: Loja, **partes: Any) -> Any:
    corpo = {"loja": loja.pk, "problema_relatado": "Tela quebrada", **partes}
    return api.post("/api/ordens/", corpo, format="json")


@pytest.mark.django_db
def test_abre_ordem_cadastrando_cliente_e_aparelho_de_uma_vez(
    api_tecnico: APIClient, loja: Loja, tenant: Tenant
) -> None:
    resposta = abrir(api_tecnico, loja, cliente_novo=CLIENTE_NOVO, aparelho_novo=APARELHO_NOVO)

    assert resposta.status_code == 201
    cliente = Cliente.objects.get()
    assert cliente.tenant == tenant
    assert cliente.nome == "Ana Beatriz"
    assert cliente.telefone == "31998765432"

    aparelho = Aparelho.objects.get()
    assert aparelho.cliente == cliente
    assert aparelho.imei == "352099001761481"
    assert aparelho.senha_desbloqueio == "2580"

    ordem = OrdemServico.objects.get()
    assert ordem.cliente == cliente
    assert ordem.aparelho == aparelho


@pytest.mark.django_db
def test_cliente_que_ja_existe_ganha_aparelho_novo(
    api_tecnico: APIClient, loja: Loja, cliente: Cliente, aparelho: Aparelho
) -> None:
    resposta = abrir(
        api_tecnico,
        loja,
        cliente=cliente.pk,
        aparelho_novo={"marca": "Xiaomi", "modelo": "Redmi 13"},
    )

    assert resposta.status_code == 201
    assert Cliente.objects.count() == 1
    assert cliente.aparelhos.count() == 2


@pytest.mark.django_db
def test_senha_do_aparelho_nao_volta_na_resposta(api_tecnico: APIClient, loja: Loja) -> None:
    resposta = abrir(api_tecnico, loja, cliente_novo=CLIENTE_NOVO, aparelho_novo=APARELHO_NOVO)

    assert "2580" not in resposta.content.decode()


@pytest.mark.django_db
def test_erro_no_aparelho_nao_deixa_cliente_solto(api_tecnico: APIClient, loja: Loja) -> None:
    resposta = abrir(api_tecnico, loja, cliente_novo=CLIENTE_NOVO, aparelho_novo={"marca": "Apple"})

    assert resposta.status_code == 400
    assert "modelo" in resposta.json()["aparelho_novo"]
    assert not Cliente.objects.exists()
    assert not OrdemServico.objects.exists()


@pytest.mark.django_db
def test_telefone_sem_ddd_e_recusado(api_tecnico: APIClient, loja: Loja) -> None:
    resposta = abrir(
        api_tecnico,
        loja,
        cliente_novo={**CLIENTE_NOVO, "telefone": "99876-5432"},
        aparelho_novo=APARELHO_NOVO,
    )

    assert resposta.status_code == 400
    assert "telefone" in resposta.json()["cliente_novo"]


@pytest.mark.django_db
def test_precisa_de_cliente(api_tecnico: APIClient, loja: Loja) -> None:
    resposta = abrir(api_tecnico, loja, aparelho_novo=APARELHO_NOVO)

    assert resposta.status_code == 400
    assert "cliente" in resposta.json()


@pytest.mark.django_db
def test_nao_aceita_cliente_existente_e_novo_ao_mesmo_tempo(
    api_tecnico: APIClient, loja: Loja, cliente: Cliente
) -> None:
    resposta = abrir(
        api_tecnico,
        loja,
        cliente=cliente.pk,
        cliente_novo=CLIENTE_NOVO,
        aparelho_novo=APARELHO_NOVO,
    )

    assert resposta.status_code == 400
    assert Cliente.objects.count() == 1


@pytest.mark.django_db
def test_aparelho_existente_nao_vai_para_cliente_novo(
    api_tecnico: APIClient, loja: Loja, aparelho: Aparelho
) -> None:
    resposta = abrir(api_tecnico, loja, cliente_novo=CLIENTE_NOVO, aparelho=aparelho.pk)

    assert resposta.status_code == 400
    assert "aparelho" in resposta.json()
    assert Cliente.objects.count() == 1


@pytest.mark.django_db
def test_nao_usa_cliente_de_outra_assistencia(
    api_tecnico: APIClient, loja: Loja, outro_tenant: Tenant
) -> None:
    alheio = Cliente.objects.create(tenant=outro_tenant, nome="De fora", telefone="11900000000")

    resposta = abrir(api_tecnico, loja, cliente=alheio.pk, aparelho_novo=APARELHO_NOVO)

    assert resposta.status_code == 400
    assert not Aparelho.objects.exists()


@pytest.mark.django_db
def test_busca_de_cliente_por_nome_ou_telefone(
    api_tecnico: APIClient, cliente: Cliente, outro_tenant: Tenant
) -> None:
    Cliente.objects.create(tenant=cliente.tenant, nome="João Pereira", telefone="11988887777")
    Cliente.objects.create(tenant=outro_tenant, nome="Maria de Fora", telefone="11999990000")

    def nomes(busca: str) -> list[str]:
        corpo = api_tecnico.get("/api/clientes/", {"busca": busca}).json()
        return [item["nome"] for item in corpo["results"]]

    assert nomes("maria") == ["Maria Souza"]
    assert nomes("(11) 99999") == ["Maria Souza"]
    assert nomes("8888-7777") == ["João Pereira"]
