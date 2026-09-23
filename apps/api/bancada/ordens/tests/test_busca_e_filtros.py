from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from bancada.clientes.models import Aparelho, Cliente
from bancada.ordens.estados import StatusOS
from bancada.ordens.models import OrdemServico
from bancada.tenants.models import Loja, Papel, Tenant, Usuario


@pytest.fixture
def cenario(tenant: Tenant, loja: Loja, tecnico: Usuario) -> dict[str, OrdemServico]:
    maria = Cliente.objects.create(tenant=tenant, nome="Maria Souza", telefone="11999990000")
    joao = Cliente.objects.create(tenant=tenant, nome="João Pereira", telefone="11988887777")

    moto = Aparelho.objects.create(
        tenant=tenant,
        cliente=maria,
        marca="Motorola",
        modelo="Moto G54",
        imei="358240051111110",
    )
    galaxy = Aparelho.objects.create(
        tenant=tenant,
        cliente=joao,
        marca="Samsung",
        modelo="Galaxy A15",
        imei="352099001761481",
    )

    da_maria = OrdemServico.abrir(
        tenant=tenant,
        loja=loja,
        cliente=maria,
        aparelho=moto,
        problema_relatado="Não carrega",
        tecnico=tecnico,
    )
    do_joao = OrdemServico.abrir(
        tenant=tenant,
        loja=loja,
        cliente=joao,
        aparelho=galaxy,
        problema_relatado="Tela trincada",
    )

    return {"maria": da_maria, "joao": do_joao}


def numeros(resposta: object) -> list[int]:
    return [ordem["numero"] for ordem in resposta.json()["results"]]  # type: ignore[attr-defined]


@pytest.mark.django_db
def test_busca_pelo_nome_do_cliente(api_tecnico: APIClient, cenario: dict) -> None:
    resposta = api_tecnico.get("/api/ordens/", {"busca": "maria"})

    assert numeros(resposta) == [cenario["maria"].numero]


@pytest.mark.django_db
def test_busca_pelo_modelo_do_aparelho(api_tecnico: APIClient, cenario: dict) -> None:
    resposta = api_tecnico.get("/api/ordens/", {"busca": "galaxy"})

    assert numeros(resposta) == [cenario["joao"].numero]


@pytest.mark.django_db
def test_busca_pelo_numero_da_ordem(api_tecnico: APIClient, cenario: dict) -> None:
    resposta = api_tecnico.get("/api/ordens/", {"busca": f"#{cenario['joao'].numero}"})

    assert numeros(resposta) == [cenario["joao"].numero]


@pytest.mark.django_db
def test_busca_pelo_imei(api_tecnico: APIClient, cenario: dict) -> None:
    resposta = api_tecnico.get("/api/ordens/", {"busca": "352099001761481"})

    assert numeros(resposta) == [cenario["joao"].numero]


@pytest.mark.django_db
def test_busca_por_pedaco_curto_de_numero_nao_varre_imeis(
    api_tecnico: APIClient, cenario: dict
) -> None:
    resposta = api_tecnico.get("/api/ordens/", {"busca": "2"})

    assert numeros(resposta) == [cenario["joao"].numero]


@pytest.mark.django_db
def test_busca_pelo_telefone_com_mascara(api_tecnico: APIClient, cenario: dict) -> None:
    resposta = api_tecnico.get("/api/ordens/", {"busca": "(11) 99999-0000"})

    assert numeros(resposta) == [cenario["maria"].numero]


@pytest.mark.django_db
def test_busca_sem_resultado_devolve_lista_vazia(api_tecnico: APIClient, cenario: dict) -> None:
    resposta = api_tecnico.get("/api/ordens/", {"busca": "iphone"})

    assert resposta.json()["count"] == 0


@pytest.mark.django_db
def test_busca_nao_atravessa_a_parede_entre_assistencias(
    api_intruso: APIClient, cenario: dict
) -> None:
    assert api_intruso.get("/api/ordens/", {"busca": "maria"}).json()["count"] == 0


@pytest.mark.django_db
def test_filtro_por_situacao_separa_abertas_de_encerradas(
    api_tecnico: APIClient, cenario: dict
) -> None:
    for status in [
        StatusOS.EM_DIAGNOSTICO,
        StatusOS.ORCAMENTO_ENVIADO,
        StatusOS.REPROVADO,
        StatusOS.DEVOLVIDO_SEM_REPARO,
    ]:
        cenario["joao"].transicionar(status)

    abertas = api_tecnico.get("/api/ordens/", {"situacao": "abertas"})
    encerradas = api_tecnico.get("/api/ordens/", {"situacao": "encerradas"})

    assert numeros(abertas) == [cenario["maria"].numero]
    assert numeros(encerradas) == [cenario["joao"].numero]


@pytest.mark.django_db
def test_filtro_por_status(api_tecnico: APIClient, cenario: dict) -> None:
    cenario["maria"].transicionar(StatusOS.EM_DIAGNOSTICO)

    resposta = api_tecnico.get("/api/ordens/", {"status": StatusOS.EM_DIAGNOSTICO})

    assert numeros(resposta) == [cenario["maria"].numero]


@pytest.mark.django_db
def test_filtro_por_tecnico_responsavel(
    api_tecnico: APIClient, cenario: dict, tecnico: Usuario
) -> None:
    comigo = api_tecnico.get("/api/ordens/", {"tecnico": tecnico.pk})
    sem_dono = api_tecnico.get("/api/ordens/", {"tecnico": "sem"})

    assert numeros(comigo) == [cenario["maria"].numero]
    assert numeros(sem_dono) == [cenario["joao"].numero]


@pytest.mark.django_db
def test_filtro_de_atrasadas_olha_a_data_prometida(api_tecnico: APIClient, cenario: dict) -> None:
    ontem = timezone.localdate() - timedelta(days=1)
    OrdemServico.objects.filter(pk=cenario["joao"].pk).update(prometida_para=ontem)

    resposta = api_tecnico.get("/api/ordens/", {"atrasadas": "1"})

    assert numeros(resposta) == [cenario["joao"].numero]


@pytest.mark.django_db
def test_ordem_encerrada_nunca_conta_como_atrasada(api_tecnico: APIClient, cenario: dict) -> None:
    ontem = timezone.localdate() - timedelta(days=1)
    OrdemServico.objects.filter(pk=cenario["joao"].pk).update(prometida_para=ontem)
    for status in [
        StatusOS.EM_DIAGNOSTICO,
        StatusOS.ORCAMENTO_ENVIADO,
        StatusOS.REPROVADO,
        StatusOS.DEVOLVIDO_SEM_REPARO,
    ]:
        cenario["joao"].transicionar(status)

    assert api_tecnico.get("/api/ordens/", {"atrasadas": "1"}).json()["count"] == 0


@pytest.mark.django_db
def test_ordenacao_por_numero_e_por_antiguidade(api_tecnico: APIClient, cenario: dict) -> None:
    recentes = api_tecnico.get("/api/ordens/", {"ordem": "recentes"})
    antigas = api_tecnico.get("/api/ordens/", {"ordem": "antigas"})

    assert numeros(recentes) == list(reversed(numeros(antigas)))


@pytest.mark.django_db
def test_filtros_se_somam(api_tecnico: APIClient, cenario: dict, tecnico: Usuario) -> None:
    resposta = api_tecnico.get(
        "/api/ordens/",
        {"busca": "moto", "situacao": "abertas", "tecnico": str(tecnico.pk)},
    )

    assert numeros(resposta) == [cenario["maria"].numero]


@pytest.mark.django_db
def test_equipe_lista_apenas_colegas_da_propria_assistencia(
    api_tecnico: APIClient, tecnico: Usuario, outro_tenant: Tenant
) -> None:
    Usuario.objects.create_user(
        username="forasteiro", password="x", tenant=outro_tenant, papel=Papel.TECNICO
    )

    corpo = api_tecnico.get("/api/equipe/").json()

    assert [pessoa["username"] for pessoa in corpo] == [tecnico.username]


@pytest.mark.django_db
def test_lista_vem_paginada(api_tecnico: APIClient, cenario: dict, tenant: Tenant) -> None:
    modelo = cenario["maria"]
    for _ in range(30):
        OrdemServico.abrir(
            tenant=tenant,
            loja=modelo.loja,
            cliente=modelo.cliente,
            aparelho=modelo.aparelho,
            problema_relatado="Em lote",
        )

    primeira = api_tecnico.get("/api/ordens/").json()
    segunda = api_tecnico.get("/api/ordens/", {"page": 2}).json()

    assert primeira["count"] == 32
    assert len(primeira["results"]) == 25
    assert len(segunda["results"]) == 7
    assert segunda["previous"] is not None
    assert segunda["next"] is None


@pytest.mark.django_db
def test_pagina_inexistente_devolve_404(api_tecnico: APIClient, cenario: dict) -> None:
    assert api_tecnico.get("/api/ordens/", {"page": 99}).status_code == 404
