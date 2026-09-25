import pytest
from rest_framework.test import APIClient

from bancada.tenants.models import Usuario


@pytest.mark.django_db
def test_tour_visto_fica_guardado_na_conta(api_dono: APIClient, dono: Usuario) -> None:
    resposta = api_dono.post("/api/orientacao/tours/", {"tour": "ordens"}, format="json")

    assert resposta.status_code == 204
    dono.refresh_from_db()
    assert dono.tours_vistos == ["ordens"]


@pytest.mark.django_db
def test_ver_o_mesmo_tour_de_novo_nao_duplica(api_dono: APIClient, dono: Usuario) -> None:
    for tour in ["ordens", "painel", "ordens"]:
        api_dono.post("/api/orientacao/tours/", {"tour": tour}, format="json")

    dono.refresh_from_db()
    assert dono.tours_vistos == ["ordens", "painel"]


@pytest.mark.django_db
def test_tour_que_nao_existe_e_recusado(api_dono: APIClient, dono: Usuario) -> None:
    resposta = api_dono.post("/api/orientacao/tours/", {"tour": "qualquer"}, format="json")

    assert resposta.status_code == 400
    dono.refresh_from_db()
    assert dono.tours_vistos == []


@pytest.mark.django_db
def test_tours_vistos_chegam_em_qualquer_aparelho_pela_conta(
    api_dono: APIClient, dono: Usuario
) -> None:
    api_dono.post("/api/orientacao/tours/", {"tour": "equipe"}, format="json")

    dados = api_dono.get("/api/auth/eu/").json()

    assert dados["tours_vistos"] == ["equipe"]
    assert dados["primeiros_passos_escondidos"] is False


@pytest.mark.django_db
def test_cada_pessoa_tem_os_proprios_tours(
    api_dono: APIClient, api_tecnico: APIClient, tecnico: Usuario
) -> None:
    api_dono.post("/api/orientacao/tours/", {"tour": "ordens"}, format="json")

    assert api_tecnico.get("/api/auth/eu/").json()["tours_vistos"] == []


@pytest.mark.django_db
def test_lista_da_equipe_nao_mostra_os_tours_dos_colegas(
    api_tecnico: APIClient, dono: Usuario
) -> None:
    colegas = api_tecnico.get("/api/equipe/").json()

    assert all("tours_vistos" not in colega for colega in colegas)


@pytest.mark.django_db
def test_marcar_tour_exige_login() -> None:
    resposta = APIClient().post("/api/orientacao/tours/", {"tour": "ordens"}, format="json")

    assert resposta.status_code == 401
