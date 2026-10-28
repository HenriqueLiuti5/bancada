import io
from collections.abc import Callable
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any
from zipfile import ZipFile
from zoneinfo import ZoneInfo

import pytest
from django.core import mail
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.core.management.base import CommandError
from PIL import Image
from rest_framework.test import APIClient

from bancada.assinaturas.models import Assinatura, Fatura, SituacaoDaAssinatura
from bancada.assinaturas.provedor import ErroNoProvedor
from bancada.assinaturas.tests.conftest import ProvedorFalso
from bancada.auditoria.models import Acao, RegistroDeAuditoria
from bancada.auditoria.registro import registrar
from bancada.clientes.models import Aparelho
from bancada.core.calendario import somar_meses
from bancada.core.exemplo.simulacao import simular
from bancada.core.fuso import hoje_no_bancada
from bancada.ordens import publico
from bancada.ordens.models import FotoOS, OrdemServico, RegistroOS, TipoDeRegistro
from bancada.plataforma import copia, exclusao
from bancada.plataforma.tasks import apagar_contas_so_para_consulta
from bancada.plataforma.tests.conftest import (
    abrir_ordem,
    contratar,
    dono_da,
    fatura,
    nova_assistencia,
)
from bancada.tenants.models import Convite, Loja, Papel, Tenant, Usuario

AGORA = datetime(2026, 10, 14, 15, tzinfo=ZoneInfo("America/Sao_Paulo"))


def foto_da(ordem: OrdemServico) -> FotoOS:
    destino = io.BytesIO()
    Image.new("RGB", (64, 48), (120, 140, 160)).save(destino, format="JPEG")
    enviado = SimpleUploadedFile("aparelho.jpg", destino.getvalue(), content_type="image/jpeg")
    return FotoOS.registrar(ordem=ordem, enviado=enviado)


def com_o_teste_terminado(tenant: Tenant, *, em: date) -> Assinatura:
    Assinatura.objects.filter(tenant=tenant).update(teste_termina_em=em)
    return Assinatura.objects.get(tenant=tenant)


@pytest.mark.django_db
def test_apagar_leva_todos_os_dados_e_os_arquivos_da_assistencia(
    tenant_com_logo: Tenant,
    loja: Loja,
    tecnico: Usuario,
    atendente_do_tenant: Usuario,
    outro_tenant: Tenant,
    django_capture_on_commit_callbacks: Callable[..., Any],
) -> None:
    tenant = tenant_com_logo
    # O movimento de exemplo precisa do Marcos, o dono da equipe dele.
    dono = Usuario.objects.create_user(
        username="marcos", password="senha-de-teste", tenant=tenant, papel=Papel.DONO
    )
    simular(tenant, AGORA, meses=1)
    ordem = OrdemServico.objects.filter(tenant=tenant).first()
    assert ordem is not None
    foto = foto_da(ordem)
    RegistroOS.objects.create(
        tenant=tenant, ordem=ordem, tipo=TipoDeRegistro.COMENTARIO, texto="Cliente avisado."
    )
    Convite.objects.create(tenant=tenant, nome="Paulo", papel=Papel.TECNICO, criado_por=dono)
    da_outra = abrir_ordem(outro_tenant)
    arquivos = [Path(foto.arquivo.path), Path(tenant.logo.path)]
    cache.set(publico.chave_do_cache(ordem.token_publico), {"numero": ordem.numero})
    id_antigo = tenant.pk

    with django_capture_on_commit_callbacks(execute=True):
        exclusao.apagar_assistencia(tenant, motivo=exclusao.A_PEDIDO_DO_DONO)

    assert not Tenant.objects.filter(pk=id_antigo).exists()
    assert not Usuario.objects.filter(pk__in=[dono.pk, tecnico.pk]).exists()
    assert not OrdemServico.objects.filter(tenant_id=id_antigo).exists()
    assert not any(arquivo.exists() for arquivo in arquivos)
    assert cache.get(publico.chave_do_cache(ordem.token_publico)) is None
    assert OrdemServico.objects.filter(pk=da_outra.pk).exists()


@pytest.mark.django_db
def test_as_cobrancas_ficam_numa_ficha_sem_os_dados_da_assistencia(db: None) -> None:
    tenant = nova_assistencia("Conserta Já", dias_desde_o_cadastro=200)
    dono_da(tenant)
    assinatura = contratar(tenant, situacao=SituacaoDaAssinatura.CANCELADA)
    Assinatura.objects.filter(pk=assinatura.pk).update(documento_do_pagador="12345678909")
    paga = fatura(assinatura, vencimento=hoje_no_bancada() - timedelta(days=150))
    Fatura.objects.filter(pk=paga.pk).update(link_de_pagamento="https://sandbox.asaas.test/i/1")

    ficha = exclusao.apagar_assistencia(tenant, motivo=exclusao.SO_PARA_CONSULTA)

    ficha.refresh_from_db()
    assert ficha.nome == "Assistência apagada"
    assert ficha.whatsapp == ""
    assert ficha.apagada_em is not None
    assert ficha.criado_em == tenant.criado_em
    assinatura.refresh_from_db()
    assert assinatura.tenant_id == ficha.pk
    assert assinatura.documento_do_pagador == ""
    paga.refresh_from_db()
    assert paga.tenant_id == ficha.pk
    assert paga.link_de_pagamento == ""
    assert Assinatura.objects.filter(tenant=ficha).count() == 1


@pytest.mark.django_db
def test_os_registros_de_acesso_ficam_ligados_so_ao_email(tecnico: Usuario) -> None:
    tenant = tecnico.tenant
    assert tenant is not None
    entrada = registrar(
        tenant=tenant,
        usuario=tecnico,
        acao=Acao.ENTRADA,
        objeto="usuario",
        objeto_id=tecnico.pk,
        detalhe=tecnico.email,
        origem="203.0.113.7",
    )
    registrar(tenant=tenant, usuario=tecnico, acao=Acao.SENHA_VISTA, objeto="aparelho", objeto_id=1)
    id_antigo = tenant.pk

    exclusao.apagar_assistencia(tenant, motivo=exclusao.A_PEDIDO_DO_DONO)

    entrada.refresh_from_db()
    assert entrada.tenant is None
    assert entrada.usuario is None
    assert entrada.detalhe == "joana@central.test"
    assert entrada.origem == "203.0.113.7"
    assert not RegistroDeAuditoria.objects.filter(acao=Acao.SENHA_VISTA).exists()
    apagada = RegistroDeAuditoria.objects.get(acao=Acao.ASSISTENCIA_APAGADA)
    assert apagada.objeto_id == id_antigo
    assert apagada.detalhe == "a pedido do dono"


@pytest.mark.django_db
def test_assinatura_que_ainda_cobra_e_cancelada_no_asaas_antes(db: None) -> None:
    tenant = nova_assistencia("Conserta Já")
    assinatura = contratar(tenant, situacao=SituacaoDaAssinatura.SUSPENSA)
    provedor = ProvedorFalso()

    exclusao.apagar_assistencia(tenant, motivo=exclusao.SO_PARA_CONSULTA, provedor=provedor)

    assert provedor.canceladas == [assinatura.assinatura_no_provedor]
    assinatura.refresh_from_db()
    assert assinatura.situacao == SituacaoDaAssinatura.CANCELADA


@pytest.mark.django_db
def test_sem_o_asaas_nada_e_apagado(db: None) -> None:
    tenant = nova_assistencia("Conserta Já")
    contratar(tenant, situacao=SituacaoDaAssinatura.SUSPENSA)
    provedor = ProvedorFalso()
    provedor.falhar_em = "cancelar_assinatura"

    with pytest.raises(ErroNoProvedor):
        exclusao.apagar_assistencia(tenant, motivo=exclusao.SO_PARA_CONSULTA, provedor=provedor)

    assert Tenant.objects.filter(pk=tenant.pk).exists()
    assert not Tenant.objects.filter(apagada_em__isnull=False).exists()


@pytest.mark.django_db
def test_painel_tira_a_apagada_da_lista_e_das_situacoes_mas_guarda_o_recebido(
    api_plataforma: APIClient,
) -> None:
    nova_assistencia("Fica Celulares")
    saindo = nova_assistencia("Sai Celulares")
    assinatura = contratar(saindo, situacao=SituacaoDaAssinatura.CANCELADA)
    fatura(assinatura, vencimento=hoje_no_bancada())
    exclusao.apagar_assistencia(saindo, motivo=exclusao.A_PEDIDO_DO_DONO)

    painel = api_plataforma.get("/api/plataforma/painel/").json()

    assert [linha["nome"] for linha in painel["assistencias"]] == ["Fica Celulares"]
    situacoes = {item["situacao"]: item["total"] for item in painel["assinaturas"]["por_situacao"]}
    assert situacoes[SituacaoDaAssinatura.CANCELADA] == 0
    assert painel["dinheiro"]["recebido"] == "59.90"


@pytest.mark.django_db
def test_tarefa_avisa_o_dono_trinta_dias_antes_de_apagar(db: None) -> None:
    hoje = hoje_no_bancada()
    tenant = nova_assistencia("Conserta Já")
    dono = dono_da(tenant)
    assinatura = com_o_teste_terminado(tenant, em=somar_meses(hoje, -6) + timedelta(days=10))

    assert apagar_contas_so_para_consulta.run() == 0

    assinatura.refresh_from_db()
    assert assinatura.aviso_de_exclusao_em == hoje
    [aviso] = mail.outbox
    assert aviso.to == [dono.email]
    assert f"{hoje + timedelta(days=30):%d/%m/%Y}" in aviso.subject
    assert "o teste grátis terminou sem assinatura" in str(aviso.body)
    assert Tenant.objects.filter(pk=tenant.pk).exists()


@pytest.mark.django_db
def test_tarefa_nao_avisa_antes_da_hora(db: None) -> None:
    tenant = nova_assistencia("Conserta Já")
    dono_da(tenant)
    com_o_teste_terminado(tenant, em=somar_meses(hoje_no_bancada(), -4))

    assert apagar_contas_so_para_consulta.run() == 0

    assert mail.outbox == []


@pytest.mark.django_db
def test_tarefa_apaga_trinta_dias_depois_do_aviso(db: None) -> None:
    hoje = hoje_no_bancada()
    tenant = nova_assistencia("Conserta Já")
    assinatura = com_o_teste_terminado(tenant, em=somar_meses(hoje, -7))
    Assinatura.objects.filter(pk=assinatura.pk).update(
        aviso_de_exclusao_em=hoje - timedelta(days=29)
    )

    assert apagar_contas_so_para_consulta.run() == 0
    assert Tenant.objects.filter(pk=tenant.pk).exists()

    Assinatura.objects.filter(pk=assinatura.pk).update(
        aviso_de_exclusao_em=hoje - timedelta(days=30)
    )
    id_antigo = tenant.pk

    assert apagar_contas_so_para_consulta.run() == 1

    assert not Tenant.objects.filter(pk=id_antigo).exists()
    apagada = RegistroDeAuditoria.objects.get(acao=Acao.ASSISTENCIA_APAGADA)
    assert apagada.detalhe == "6 meses seguidos só para consulta"


@pytest.mark.django_db
def test_tarefa_nao_mexe_em_quem_paga_nem_na_ficha_das_cobrancas(db: None) -> None:
    hoje = hoje_no_bancada()
    pagante = nova_assistencia("Paga em Dia")
    contratar(pagante)
    Assinatura.objects.filter(tenant=pagante).update(teste_termina_em=somar_meses(hoje, -8))
    apagada = nova_assistencia("Já Apagada")
    com_o_teste_terminado(apagada, em=somar_meses(hoje, -9))
    ficha = exclusao.apagar_assistencia(apagada, motivo=exclusao.A_PEDIDO_DO_DONO)
    Assinatura.objects.filter(tenant=ficha).update(aviso_de_exclusao_em=hoje - timedelta(days=60))

    assert apagar_contas_so_para_consulta.run() == 0

    assert Tenant.objects.filter(pk=pagante.pk).exists()
    assert Tenant.objects.filter(pk=ficha.pk).exists()


@pytest.mark.django_db
def test_tarefa_deixa_para_amanha_quando_o_asaas_falha(
    db: None, monkeypatch: pytest.MonkeyPatch
) -> None:
    hoje = hoje_no_bancada()
    tenant = nova_assistencia("Conserta Já")
    assinatura = contratar(tenant, situacao=SituacaoDaAssinatura.SUSPENSA)
    fatura(assinatura, vencimento=somar_meses(hoje, -8), situacao="vencida")
    Assinatura.objects.filter(pk=assinatura.pk).update(
        aviso_de_exclusao_em=hoje - timedelta(days=40)
    )
    falso = ProvedorFalso()
    falso.falhar_em = "cancelar_assinatura"
    monkeypatch.setattr("bancada.assinaturas.servicos.provedor_configurado", lambda: falso)

    assert apagar_contas_so_para_consulta.run() == 0

    assert Tenant.objects.filter(pk=tenant.pk).exists()


@pytest.mark.django_db
def test_copia_traz_as_planilhas_as_fotos_e_a_logo_sem_as_senhas(
    tenant_com_logo: Tenant, ordem: OrdemServico, aparelho: Aparelho, tmp_path: Path
) -> None:
    dono = dono_da(tenant_com_logo)
    aparelho.senha_desbloqueio = "segredo-9876"
    aparelho.save()
    foto = foto_da(ordem)
    saida = tmp_path / "copia.zip"

    call_command("exportar_assistencia", dono.email, saida=str(saida), stdout=io.StringIO())

    with ZipFile(saida) as arquivo:
        nomes = set(arquivo.namelist())
        planilhas = {
            nome: arquivo.read(nome).decode("utf-8-sig") for nome in nomes if nome.endswith(".csv")
        }
    assert {"LEIA-ME.txt", f"fotos/{foto.pk}.jpg", "logo.png"} <= nomes
    assert {f"{nome}.csv" for nome, _ in copia.PLANILHAS} <= nomes
    assert "Maria Souza" in planilhas["clientes.csv"]
    assert "358240051111110" in planilhas["aparelhos.csv"]
    tudo = "".join(planilhas.values())
    for segredo in ["segredo-9876", ordem.token_publico, "senha_desbloqueio", "password"]:
        assert segredo not in tudo


def test_toda_tabela_da_assistencia_entra_na_copia_ou_tem_motivo_para_ficar_fora() -> None:
    da_assistencia = {relacao.related_model for relacao in Tenant._meta.related_objects}
    na_copia = {modelo for _, modelo in copia.PLANILHAS}

    assert da_assistencia - na_copia == copia.FORA_DA_COPIA


@pytest.mark.django_db
def test_comando_so_apaga_com_o_nome_certo_da_assistencia(tenant: Tenant) -> None:
    dono = dono_da(tenant)
    id_antigo = tenant.pk

    with pytest.raises(CommandError, match="não confere"):
        call_command(
            "apagar_assistencia", dono.email, confirmar="Outra Assistência", stdout=io.StringIO()
        )
    assert Tenant.objects.filter(pk=id_antigo).exists()

    call_command("apagar_assistencia", dono.email, confirmar=tenant.nome, stdout=io.StringIO())

    assert not Tenant.objects.filter(pk=id_antigo).exists()


@pytest.mark.django_db
def test_comandos_recusam_quem_nao_e_dono(tecnico: Usuario, tmp_path: Path) -> None:
    with pytest.raises(CommandError, match="Nenhum dono"):
        call_command("apagar_assistencia", tecnico.email, confirmar="x", stdout=io.StringIO())
    with pytest.raises(CommandError, match="Nenhum dono"):
        call_command("exportar_assistencia", tecnico.email, saida=str(tmp_path / "copia.zip"))
