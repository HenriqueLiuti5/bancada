import random
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from decimal import Decimal
from typing import Any

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify

from bancada.assinaturas import servicos
from bancada.assinaturas.models import (
    Assinatura,
    Fatura,
    FormaDeCobranca,
    SituacaoDaAssinatura,
    SituacaoDaFatura,
)
from bancada.assinaturas.regras import DIAS_DE_TESTE, um_mes_depois
from bancada.clientes.models import Aparelho, Cliente
from bancada.core.management.commands.semear import CONTA_DA_PLATAFORMA_DEMO, SENHA_DEMO
from bancada.ordens.models import EventoOS, OrdemServico
from bancada.plataforma.meses import Mes
from bancada.plataforma.models import Custo
from bancada.tenants.models import Loja, Papel, Tenant, Usuario

PREFIXO_DOS_ENDERECOS = "exemplo-"
SEMENTE = 2026

TAXA_FIXA = Decimal("1.99")
TAXA_DO_CARTAO = Decimal("0.0299")
TARIFA_DO_CARTAO = Decimal("0.49")
CENTAVO = Decimal("0.01")

NOMES_DE_CLIENTES = [
    "Ana Prado",
    "Bruno Sales",
    "Carla Menezes",
    "Davi Moura",
    "Elisa Campos",
    "Fábio Reis",
    "Gisele Matos",
    "Hugo Freitas",
    "Iara Lima",
    "João Vitor",
]


@dataclass(frozen=True)
class Exemplo:
    nome: str
    dono: str
    whatsapp: str
    dias_desde_o_cadastro: int
    ordens: int
    dias_desde_a_ultima_ordem: int | None
    dias_desde_o_ultimo_acesso: int
    assinou: bool = False
    paga_por: str = FormaDeCobranca.PIX
    deixou_atrasar: bool = False
    dias_desde_o_cancelamento: int | None = None


EXEMPLOS = [
    Exemplo("Conserta Já Celulares", "Ana Ribeiro", "11981110001", 2, 0, None, 0),
    Exemplo("Cell Point Moema", "Bruno Carvalho", "11981110002", 6, 0, None, 5),
    Exemplo("Doutor Smartphone", "Camila Duarte", "21981110003", 12, 9, 1, 0),
    Exemplo("Tech Mobile Reparos", "Diego Martins", "31981110004", 30, 26, 0, 0, assinou=True),
    Exemplo(
        "iFix Centro",
        "Eduarda Lopes",
        "11981110005",
        95,
        72,
        2,
        1,
        assinou=True,
        paga_por=FormaDeCobranca.CARTAO,
    ),
    Exemplo(
        "Mega Cell Assistência",
        "Felipe Araújo",
        "41981110006",
        70,
        31,
        18,
        16,
        assinou=True,
        paga_por=FormaDeCobranca.BOLETO,
    ),
    Exemplo(
        "Ponto do Celular",
        "Gabriela Nunes",
        "11981110007",
        64,
        27,
        4,
        3,
        assinou=True,
        deixou_atrasar=True,
    ),
    Exemplo("Fix Fone", "Igor Barros", "51981110008", 50, 4, 25, 24),
    Exemplo(
        "Central do Reparo",
        "Isabela Teixeira",
        "11981110009",
        92,
        30,
        12,
        11,
        assinou=True,
        dias_desde_o_cancelamento=10,
    ),
    Exemplo("Smart Assistência", "Karina Rocha", "61981110010", 36, 0, None, 30),
]


def valor_liquido(valor: Decimal, forma: str) -> Decimal:
    if forma == FormaDeCobranca.CARTAO:
        return (valor - valor * TAXA_DO_CARTAO - TARIFA_DO_CARTAO).quantize(CENTAVO)
    return valor - TAXA_FIXA


def momento(dias_atras: int, agora: datetime) -> datetime:
    dia = timezone.localdate(agora) - timedelta(days=dias_atras)
    horario = time(random.randint(8, 18), random.randint(0, 59))
    return min(timezone.make_aware(datetime.combine(dia, horario)), agora)


class Command(BaseCommand):
    help = "Cria assistências fictícias em situações variadas para o painel da plataforma"

    def handle(self, *args: Any, **options: Any) -> None:
        if not settings.DEBUG:
            raise CommandError("Este comando só roda com DJANGO_DEBUG=1")

        if Tenant.objects.filter(slug__startswith=PREFIXO_DOS_ENDERECOS).exists():
            self.stdout.write(self.style.WARNING("As assistências de exemplo já existem."))
            return

        random.seed(SEMENTE)
        agora = timezone.now()
        hoje = timezone.localdate()
        with transaction.atomic():
            for exemplo in EXEMPLOS:
                self._criar(exemplo, agora, hoje)
            self._custos(hoje)

        self.stdout.write(self.style.SUCCESS(f"{len(EXEMPLOS)} assistências de exemplo criadas."))
        if Usuario.objects.filter(username=CONTA_DA_PLATAFORMA_DEMO).exists():
            self.stdout.write(f"  Entre com {CONTA_DA_PLATAFORMA_DEMO} / {SENHA_DEMO} para ver.")
        else:
            self.stdout.write("  Rode make semear para criar a conta da plataforma de exemplo.")

    def _criar(self, exemplo: Exemplo, agora: datetime, hoje: date) -> None:
        cadastro = momento(exemplo.dias_desde_o_cadastro, agora)
        tenant = Tenant.objects.create(
            nome=exemplo.nome,
            slug=f"{PREFIXO_DOS_ENDERECOS}{slugify(exemplo.nome)}",
            whatsapp=exemplo.whatsapp,
        )
        Tenant.objects.filter(pk=tenant.pk).update(criado_em=cadastro)
        loja = Loja.objects.create(tenant=tenant, nome="Matriz", telefone=exemplo.whatsapp)

        primeiro_nome = exemplo.dono.split()[0].lower()
        endereco = f"{primeiro_nome}@{tenant.slug}.test"
        dono = Usuario.objects.create_user(
            username=endereco,
            email=endereco,
            first_name=exemplo.dono,
            tenant=tenant,
            papel=Papel.DONO,
        )
        Usuario.objects.filter(pk=dono.pk).update(
            date_joined=cadastro,
            ultimo_acesso=momento(exemplo.dias_desde_o_ultimo_acesso, agora),
        )

        self._ordens(tenant, loja, exemplo, cadastro, agora)
        self._assinatura(tenant, exemplo, cadastro, agora, hoje)

    def _ordens(
        self, tenant: Tenant, loja: Loja, exemplo: Exemplo, cadastro: datetime, agora: datetime
    ) -> None:
        if exemplo.ordens == 0 or exemplo.dias_desde_a_ultima_ordem is None:
            return

        ultima = momento(exemplo.dias_desde_a_ultima_ordem, agora)
        intervalo = (ultima - cadastro) / exemplo.ordens
        for indice in range(exemplo.ordens):
            cliente = Cliente.objects.create(
                tenant=tenant,
                nome=random.choice(NOMES_DE_CLIENTES),
                telefone=f"119{random.randint(10000000, 99999999)}",
            )
            aparelho = Aparelho.objects.create(
                tenant=tenant, cliente=cliente, marca="Samsung", modelo="Galaxy A15"
            )
            ordem = OrdemServico.abrir(
                tenant=tenant,
                loja=loja,
                cliente=cliente,
                aparelho=aparelho,
                problema_relatado="Tela trincada depois de uma queda",
            )
            aberta_em = ultima - intervalo * (exemplo.ordens - 1 - indice)
            OrdemServico.objects.filter(pk=ordem.pk).update(criado_em=aberta_em)
            EventoOS.objects.filter(ordem=ordem).update(criado_em=aberta_em)

    def _assinatura(
        self, tenant: Tenant, exemplo: Exemplo, cadastro: datetime, agora: datetime, hoje: date
    ) -> None:
        assinatura = Assinatura.objects.get(tenant=tenant)
        assinatura.teste_termina_em = timezone.localdate(cadastro) + timedelta(days=DIAS_DE_TESTE)
        assinatura.save(update_fields=["teste_termina_em"])

        if exemplo.assinou:
            self._contratar(assinatura, exemplo, cadastro, agora, hoje)
        servicos.recalcular(assinatura, hoje)

    def _contratar(
        self,
        assinatura: Assinatura,
        exemplo: Exemplo,
        cadastro: datetime,
        agora: datetime,
        hoje: date,
    ) -> None:
        valor = settings.VALOR_DA_ASSINATURA
        assinatura.assinatura_no_provedor = f"sub_exemplo_{assinatura.tenant_id}"
        assinatura.valor_mensal = valor
        assinatura.assinada_em = cadastro + timedelta(days=random.randint(14, 28))
        assinatura.situacao = SituacaoDaAssinatura.ATIVA
        assinatura.save()

        cancelada = exemplo.dias_desde_o_cancelamento
        ultimo_dia = hoje - timedelta(days=cancelada) if cancelada else hoje
        vencimento = assinatura.teste_termina_em
        while vencimento <= ultimo_dia:
            atrasou = exemplo.deixou_atrasar and um_mes_depois(vencimento) > hoje
            self._fatura(assinatura, exemplo, vencimento, atrasou)
            vencimento = um_mes_depois(vencimento)
        if not cancelada:
            self._fatura(assinatura, exemplo, vencimento, atrasou=False, futura=True)
            return

        servicos.encerrar(assinatura, ultimo_dia)
        Assinatura.objects.filter(pk=assinatura.pk).update(cancelada_em=momento(cancelada, agora))

    def _fatura(
        self,
        assinatura: Assinatura,
        exemplo: Exemplo,
        vencimento: date,
        atrasou: bool,
        futura: bool = False,
    ) -> None:
        valor = assinatura.valor_mensal or settings.VALOR_DA_ASSINATURA
        paga = not (atrasou or futura)
        if paga:
            situacao = SituacaoDaFatura.PAGA
        elif atrasou:
            situacao = SituacaoDaFatura.VENCIDA
        else:
            situacao = SituacaoDaFatura.ABERTA
        Fatura.objects.create(
            tenant_id=assinatura.tenant_id,
            assinatura=assinatura,
            id_no_provedor=f"pay_exemplo_{assinatura.tenant_id}_{vencimento.isoformat()}",
            valor=valor,
            valor_liquido=valor_liquido(valor, exemplo.paga_por) if paga else None,
            vencimento=vencimento,
            situacao=situacao,
            forma_de_pagamento=exemplo.paga_por if paga else FormaDeCobranca.A_ESCOLHER,
            paga_em=vencimento if paga else None,
        )

    def _custos(self, hoje: date) -> None:
        mes = Mes.de(hoje)
        Custo.objects.create(
            mes=mes.anterior.inicio,
            descricao="Domínio do site, um ano",
            valor=Decimal("40.00"),
        )
        Custo.objects.create(
            mes=mes.inicio,
            descricao="Recarga do chip do WhatsApp de suporte",
            valor=Decimal("20.00"),
        )
