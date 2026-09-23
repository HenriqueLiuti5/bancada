import pytest
from rest_framework.test import APIClient

from bancada.ordens.estados import StatusOS
from bancada.ordens.models import EventoOS, OrdemServico
from bancada.tenants.models import Usuario


@pytest.mark.django_db
def test_nao_da_para_mudar_o_status_por_fora_da_maquina_de_estados(
    api_tecnico: APIClient, ordem: OrdemServico
) -> None:
    resposta = api_tecnico.patch(
        f"/api/ordens/{ordem.pk}/", {"status": StatusOS.ENTREGUE}, format="json"
    )

    assert resposta.status_code == 200

    ordem.refresh_from_db()
    assert ordem.status == StatusOS.RECEBIDO
    assert ordem.entregue_em is None
    assert ordem.eventos.count() == 1


@pytest.mark.django_db
def test_nao_da_para_apagar_uma_ordem_pela_api(api_tecnico: APIClient, ordem: OrdemServico) -> None:
    resposta = api_tecnico.delete(f"/api/ordens/{ordem.pk}/")

    assert resposta.status_code == 405
    assert OrdemServico.objects.filter(pk=ordem.pk).exists()


@pytest.mark.django_db
def test_nao_da_para_substituir_a_ordem_inteira(
    api_tecnico: APIClient, ordem: OrdemServico
) -> None:
    resposta = api_tecnico.put(
        f"/api/ordens/{ordem.pk}/", {"problema_relatado": "reescrito"}, format="json"
    )

    assert resposta.status_code == 405
    ordem.refresh_from_db()
    assert ordem.problema_relatado == "Não carrega"


@pytest.mark.django_db
def test_o_numero_e_o_token_publico_nao_mudam(api_tecnico: APIClient, ordem: OrdemServico) -> None:
    api_tecnico.patch(
        f"/api/ordens/{ordem.pk}/",
        {"numero": 999, "token_publico": "escolhido-por-mim"},
        format="json",
    )

    ordem.refresh_from_db()
    assert ordem.numero == 1
    assert ordem.token_publico != "escolhido-por-mim"


@pytest.mark.django_db
def test_edicao_grava_diagnostico_laudo_e_prazo(
    api_tecnico: APIClient, ordem: OrdemServico
) -> None:
    resposta = api_tecnico.patch(
        f"/api/ordens/{ordem.pk}/",
        {
            "diagnostico": "Conector de carga oxidado",
            "laudo": "Conector substituído e testado",
            "prometida_para": "2026-10-01",
        },
        format="json",
    )

    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["diagnostico"] == "Conector de carga oxidado"
    assert corpo["laudo"] == "Conector substituído e testado"
    assert corpo["prometida_para"] == "2026-10-01"


@pytest.mark.django_db
def test_nao_da_para_atribuir_tecnico_de_outra_assistencia(
    api_tecnico: APIClient, ordem: OrdemServico, intruso: Usuario
) -> None:
    resposta = api_tecnico.patch(f"/api/ordens/{ordem.pk}/", {"tecnico": intruso.pk}, format="json")

    assert resposta.status_code == 400
    ordem.refresh_from_db()
    assert ordem.tecnico_id != intruso.pk


@pytest.mark.django_db
def test_intruso_nao_edita_ordem_alheia(api_intruso: APIClient, ordem: OrdemServico) -> None:
    resposta = api_intruso.patch(
        f"/api/ordens/{ordem.pk}/", {"diagnostico": "invadido"}, format="json"
    )

    assert resposta.status_code == 404
    ordem.refresh_from_db()
    assert ordem.diagnostico == ""


@pytest.mark.django_db
def test_o_historico_continua_intocavel(api_tecnico: APIClient, ordem: OrdemServico) -> None:
    ordem.transicionar(StatusOS.EM_DIAGNOSTICO, nota="registro original")
    evento = EventoOS.objects.latest("criado_em")

    antes = EventoOS.objects.count()
    api_tecnico.patch(f"/api/ordens/{ordem.pk}/", {"diagnostico": "x"}, format="json")

    assert EventoOS.objects.count() == antes
    evento.refresh_from_db()
    assert evento.nota == "registro original"
