import random
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from bancada.clientes.models import Aparelho, Cliente
from bancada.ordens.estados import StatusOS
from bancada.ordens.models import (
    Cobranca,
    EventoOS,
    FormaDePagamento,
    ItemOrcamento,
    OrdemServico,
    Pagamento,
    Recebimento,
    TipoItem,
)
from bancada.tenants.models import Loja, Tenant, Usuario

DIAS_DE_HISTORIA = 60
PREFIXO_DOS_TELEFONES = "1190000"
SEMENTE = 2026

CHANCE_DE_O_CLIENTE_VOLTAR = 0.2

PRIMEIROS_NOMES = [
    "Ana",
    "Bruno",
    "Camila",
    "Diego",
    "Eduarda",
    "Felipe",
    "Gabriela",
    "Igor",
    "Isabela",
    "Karina",
    "Lucas",
    "Mariana",
    "Nicolas",
    "Olívia",
    "Paulo",
    "Rafaela",
]

SOBRENOMES = [
    "Ribeiro",
    "Carvalho",
    "Duarte",
    "Martins",
    "Lopes",
    "Araújo",
    "Nunes",
    "Barros",
    "Teixeira",
    "Rocha",
    "Farias",
    "Pires",
]

APARELHOS = [
    ("Samsung", "Galaxy A15"),
    ("Samsung", "Galaxy A54"),
    ("Apple", "iPhone 11"),
    ("Apple", "iPhone 13"),
    ("Motorola", "Moto G54"),
    ("Motorola", "Moto E22"),
    ("Xiaomi", "Redmi Note 12"),
    ("Xiaomi", "Redmi 13C"),
]

DEFEITOS = [
    ("Tela trincada depois de uma queda", "Tela com moldura", 180, 420),
    ("Touch não responde na parte de baixo", "Tela com moldura", 180, 420),
    ("Bateria descarregando muito rápido", "Bateria", 90, 180),
    ("Bateria estufada, tampa levantando", "Bateria", 90, 180),
    ("Não carrega, só com o cabo em certa posição", "Conector de carga", 70, 140),
    ("Caiu na água e não liga", "Limpeza de oxidação", 120, 250),
    ("Sem som nas ligações", "Alto-falante auricular", 60, 120),
    ("Câmera traseira embaçada", "Lente da câmera", 50, 110),
    ("Celular muito lento e reiniciando sozinho", "Formatação e atualização", 60, 100),
    ("Botão de volume afundado", "Flex de botões", 70, 130),
]

MAO_DE_OBRA = (40, 90)


@dataclass
class Clientela:
    tenant: Tenant
    nomes: list[str]
    atendidos: list[Cliente] = field(default_factory=list)

    def proximo(self) -> Cliente:
        volta = random.random() < CHANCE_DE_O_CLIENTE_VOLTAR
        if self.atendidos and (volta or not self.nomes):
            return random.choice(self.atendidos)

        cliente = Cliente.objects.create(
            tenant=self.tenant,
            nome=self.nomes.pop(),
            telefone=f"{PREFIXO_DOS_TELEFONES}{len(self.atendidos) + 1:04d}",
        )
        self.atendidos.append(cliente)
        return cliente


@dataclass(frozen=True)
class Relogio:
    agora: datetime

    def depois(self, momento: datetime, horas_minimas: float, horas_maximas: float) -> datetime:
        return momento + timedelta(hours=random.uniform(horas_minimas, horas_maximas))

    def passou(self, momento: datetime) -> bool:
        return momento > self.agora


class Command(BaseCommand):
    help = "Cria dois meses de movimento fictício na assistência de demonstração"

    def handle(self, *args: Any, **options: Any) -> None:
        if not settings.DEBUG:
            raise CommandError("Este comando só roda com DJANGO_DEBUG=1")

        tenant = Tenant.objects.filter(slug="assistencia-central").first()
        if tenant is None:
            raise CommandError("Rode make semear antes, para criar a assistência de exemplo.")

        if Cliente.objects.filter(
            tenant=tenant, telefone__startswith=PREFIXO_DOS_TELEFONES
        ).exists():
            self.stdout.write(self.style.WARNING("O movimento já foi criado; nada mudou."))
            return

        random.seed(SEMENTE)
        with transaction.atomic():
            criadas = self._criar_movimento(tenant)

        self.stdout.write(self.style.SUCCESS(f"{criadas} ordens criadas nos últimos 60 dias."))

    def _criar_movimento(self, tenant: Tenant) -> int:
        lojas = self._lojas(tenant)
        equipe = list(Usuario.objects.filter(tenant=tenant, papel__in=["dono", "tecnico"]))
        clientela = Clientela(tenant=tenant, nomes=self._nomes())
        relogio = Relogio(agora=timezone.now())

        criadas = 0
        for dias_atras in range(DIAS_DE_HISTORIA, -1, -1):
            dia = relogio.agora - timedelta(days=dias_atras)
            for _ in range(random.choice([0, 1, 1, 2, 2, 3])):
                abertura = dia.replace(hour=random.randint(9, 17), minute=random.randint(0, 59))
                if relogio.passou(abertura):
                    continue
                cliente = clientela.proximo()
                self._criar_ordem(tenant, random.choice(lojas), cliente, equipe, abertura, relogio)
                criadas += 1
        return criadas

    def _lojas(self, tenant: Tenant) -> list[Loja]:
        filial, _ = Loja.objects.get_or_create(
            tenant=tenant,
            nome="Filial Centro",
            defaults={"telefone": "1133335555", "endereco": "Av. Brasil, 2000"},
        )
        return [*Loja.objects.filter(tenant=tenant).exclude(pk=filial.pk), filial, filial]

    def _nomes(self) -> list[str]:
        nomes = [f"{nome} {sobrenome}" for nome in PRIMEIROS_NOMES for sobrenome in SOBRENOMES]
        random.shuffle(nomes)
        return nomes

    def _aparelho(self, tenant: Tenant, cliente: Cliente) -> Aparelho:
        existente = cliente.aparelhos.first()
        if existente is not None and random.random() < 0.6:
            return existente
        marca, modelo = random.choice(APARELHOS)
        return Aparelho.objects.create(tenant=tenant, cliente=cliente, marca=marca, modelo=modelo)

    def _criar_ordem(
        self,
        tenant: Tenant,
        loja: Loja,
        cliente: Cliente,
        equipe: list[Usuario],
        abertura: datetime,
        relogio: Relogio,
    ) -> None:
        relato, peca, minimo, maximo = random.choice(DEFEITOS)
        tecnico = random.choices([*equipe, None], weights=[*[5] * len(equipe), 1])[0]
        ordem = OrdemServico.abrir(
            tenant=tenant,
            loja=loja,
            cliente=cliente,
            aparelho=self._aparelho(tenant, cliente),
            problema_relatado=relato,
            aberta_por=tecnico,
            tecnico=tecnico,
        )
        OrdemServico.objects.filter(pk=ordem.pk).update(criado_em=abertura)
        EventoOS.objects.filter(ordem=ordem).update(criado_em=abertura)

        ItemOrcamento.objects.create(
            ordem=ordem, tipo=TipoItem.PECA, descricao=peca, valor=random.randint(minimo, maximo)
        )
        ItemOrcamento.objects.create(
            ordem=ordem,
            tipo=TipoItem.SERVICO,
            descricao="Mão de obra",
            valor=random.randint(*MAO_DE_OBRA),
        )

        self._andar(ordem, tecnico, abertura, relogio)

    def _passos(self) -> list[tuple[str, float, float]]:
        passos = [
            (StatusOS.EM_DIAGNOSTICO, 1, 20),
            (StatusOS.ORCAMENTO_ENVIADO, 1, 8),
        ]
        if random.random() < 0.15:
            return [*passos, (StatusOS.REPROVADO, 2, 48), (StatusOS.DEVOLVIDO_SEM_REPARO, 4, 72)]

        passos += [(StatusOS.APROVADO, 1, 36), (StatusOS.EM_REPARO, 1, 24)]
        if random.random() < 0.25:
            passos += [(StatusOS.AGUARDANDO_PECA, 1, 6), (StatusOS.EM_REPARO, 24, 120)]
        return [*passos, (StatusOS.PRONTO, 2, 30), (StatusOS.ENTREGUE, 2, 72)]

    def _andar(
        self, ordem: OrdemServico, tecnico: Usuario | None, abertura: datetime, relogio: Relogio
    ) -> None:
        momento = abertura
        for status, horas_minimas, horas_maximas in self._passos():
            momento = relogio.depois(momento, horas_minimas, horas_maximas)
            if relogio.passou(momento):
                return

            cobranca = self._cobranca(ordem) if status == StatusOS.ENTREGUE else None
            evento = ordem.transicionar(status, usuario=tecnico, cobranca=cobranca)
            EventoOS.objects.filter(pk=evento.pk).update(criado_em=momento)

            if status == StatusOS.ENTREGUE:
                OrdemServico.objects.filter(pk=ordem.pk).update(entregue_em=momento)
                Pagamento.objects.filter(ordem=ordem).update(recebido_em=momento)

    def _cobranca(self, ordem: OrdemServico) -> Cobranca:
        aprovado = ordem.total_aprovado
        sorteio = random.random()
        desconto_de_dez_por_cento = sorteio < 0.12
        cobrado = (
            (aprovado * Decimal("0.9")).quantize(Decimal("1"))
            if desconto_de_dez_por_cento
            else aprovado
        )

        if sorteio > 0.94:
            return Cobranca(valor_cobrado=cobrado)

        formas = [
            FormaDePagamento.PIX,
            FormaDePagamento.DINHEIRO,
            FormaDePagamento.DEBITO,
            FormaDePagamento.CREDITO,
        ]
        principal = random.choices(formas, weights=[50, 20, 15, 15])[0]
        if random.random() < 0.2:
            metade = (cobrado / 2).quantize(Decimal("0.01"))
            return Cobranca(
                valor_cobrado=cobrado,
                recebimentos=(
                    Recebimento(forma=FormaDePagamento.DINHEIRO, valor=metade),
                    Recebimento(forma=principal, valor=cobrado - metade),
                ),
            )
        return Cobranca(
            valor_cobrado=cobrado, recebimentos=(Recebimento(forma=principal, valor=cobrado),)
        )
