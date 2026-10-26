import random
from collections.abc import Callable
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from decimal import Decimal
from functools import partial

from django.db.models import F
from django.utils import timezone

from bancada.clientes.models import Aparelho, Cliente
from bancada.core.exemplo.agenda import aberta, datar, depois, no_expediente, no_horario
from bancada.core.exemplo.assistencia import Assistencia
from bancada.core.exemplo.baralho import Baralho
from bancada.core.exemplo.catalogo import (
    APARELHOS,
    CONECTOR_AVULSO,
    DEFEITOS,
    FORNECEDOR_DE_PECAS,
    PRIMEIROS_NOMES,
    SOBRENOMES,
    Defeito,
)
from bancada.core.exemplo.estoque import Estoque
from bancada.estoque.models import MovimentoDeEstoque, Produto, TipoDeMovimento
from bancada.ordens.estados import StatusOS
from bancada.ordens.models import (
    Cobranca,
    EventoOS,
    FormaDePagamento,
    ItemOrcamento,
    OrdemServico,
    Pagamento,
    Recebimento,
    RegistroOS,
    TipoDeRegistro,
    TipoItem,
)
from bancada.tenants.models import Loja, Tenant, Usuario

PREFIXO_DOS_TELEFONES = "1190000"
CHANCE_DE_O_CLIENTE_VOLTAR = 0.2
CORES = ["Preto", "Preto", "Branco", "Azul", "Verde", "Grafite", "Roxo"]
GARANTIA = timedelta(days=90)


class Clientela:
    def __init__(self, tenant: Tenant) -> None:
        self.tenant = tenant
        self.nomes = [f"{nome} {sobrenome}" for nome in PRIMEIROS_NOMES for sobrenome in SOBRENOMES]
        random.shuffle(self.nomes)
        self.atendidos: list[Cliente] = []

    def proximo(self, momento: datetime) -> Cliente:
        volta = random.random() < CHANCE_DE_O_CLIENTE_VOLTAR
        if self.atendidos and (volta or not self.nomes):
            return random.choice(self.atendidos)

        cliente = Cliente.objects.create(
            tenant=self.tenant,
            nome=self.nomes.pop(),
            telefone=f"{PREFIXO_DOS_TELEFONES}{len(self.atendidos) + 1:04d}",
        )
        datar(Cliente.objects.filter(pk=cliente.pk), momento)
        self.atendidos.append(cliente)
        return cliente


# As ordens do `semear` não usam o catálogo de defeitos; o defeito sai do que foi relatado.
PALAVRAS_DO_RELATO = [
    ("água", "Caiu na água e não liga"),
    ("tela", "Tela trincada depois de uma queda"),
    ("bateria", "Bateria descarregando muito rápido"),
    ("carrega", "Não carrega, só com o cabo em certa posição"),
]


def defeito_do_relato(relato: str) -> Defeito:
    por_relato = {defeito.relato: defeito for defeito in DEFEITOS}
    texto = relato.lower()
    for palavra, parecido in PALAVRAS_DO_RELATO:
        if palavra in texto:
            return por_relato[parecido]
    return por_relato["Celular muito lento e reiniciando sozinho"]


@dataclass
class Conserto:
    ordem: OrdemServico
    defeito: Defeito
    tecnico: Usuario | None
    peca: Produto | None = None
    peca_avulsa: bool = False


Passo = Callable[[Conserto, datetime], None]


class Oficina:
    def __init__(self, assistencia: Assistencia, estoque: Estoque) -> None:
        self.assistencia = assistencia
        self.estoque = estoque
        self.clientela = Clientela(assistencia.tenant)
        self._defeitos = Baralho([defeito for defeito in DEFEITOS for _ in range(defeito.peso)])
        self._aparelhos = Baralho(APARELHOS)

    def _marcar(self, conserto: Conserto, momento: datetime, passo: Passo) -> None:
        self.assistencia.agenda.marcar(momento, partial(passo, conserto))

    def _quem_conserta(self, conserto: Conserto) -> Usuario:
        return conserto.tecnico or self.assistencia.dono

    def _mudar(
        self,
        conserto: Conserto,
        status: str,
        momento: datetime,
        usuario: Usuario | None = None,
        cobranca: Cobranca | None = None,
    ) -> None:
        evento = conserto.ordem.transicionar(
            status, usuario=usuario or self._quem_conserta(conserto), cobranca=cobranca
        )
        datar(EventoOS.objects.filter(pk=evento.pk), momento)

    def _comentar(self, conserto: Conserto, texto: str, momento: datetime) -> None:
        registro = RegistroOS.objects.create(
            tenant=self.assistencia.tenant,
            ordem=conserto.ordem,
            tipo=TipoDeRegistro.COMENTARIO,
            texto=texto,
            usuario=self._quem_conserta(conserto),
        )
        datar(RegistroOS.objects.filter(pk=registro.pk), momento)

    def abrir(self, loja: Loja, momento: datetime) -> None:
        assistencia = self.assistencia
        cliente = self.clientela.proximo(momento)
        defeito = self._defeitos.tirar()
        tecnico = random.choices([assistencia.tecnica, assistencia.dono, None], weights=[6, 3, 1])[
            0
        ]
        ordem = OrdemServico.abrir(
            tenant=assistencia.tenant,
            loja=loja,
            cliente=cliente,
            aparelho=self._aparelho(cliente, momento),
            problema_relatado=defeito.relato,
            aberta_por=random.choice([assistencia.no_balcao(loja), tecnico or assistencia.dono]),
            tecnico=tecnico,
            prometida_para=self._prazo(momento) if random.random() < 0.85 else None,
        )
        datar(OrdemServico.objects.filter(pk=ordem.pk), momento)
        datar(EventoOS.objects.filter(ordem=ordem), momento)
        self._marcar(Conserto(ordem, defeito, tecnico), depois(momento, 0.3, 4), self.diagnosticar)

    def _aparelho(self, cliente: Cliente, momento: datetime) -> Aparelho:
        existente = cliente.aparelhos.first()
        if existente is not None and random.random() < 0.6:
            return existente
        marca, modelo = self._aparelhos.tirar()
        aparelho = Aparelho.objects.create(
            tenant=self.assistencia.tenant,
            cliente=cliente,
            marca=marca,
            modelo=modelo,
            cor=random.choice(CORES),
        )
        datar(Aparelho.objects.filter(pk=aparelho.pk), momento)
        return aparelho

    def _prazo(self, momento: datetime) -> date:
        dia = timezone.localdate(momento)
        for _ in range(random.choice([1, 1, 2, 2, 2, 3, 3, 4, 5])):
            dia += timedelta(days=1)
            while not aberta(dia):
                dia += timedelta(days=1)
        return dia

    # As ordens do `semear` entram no começo da história e seguem dali como as outras.
    def continuar(self, ordem: OrdemServico, momento: datetime) -> None:
        deslocamento = momento - ordem.criado_em
        OrdemServico.objects.filter(pk=ordem.pk).update(criado_em=momento)
        ordem.eventos.update(criado_em=F("criado_em") + deslocamento)
        ordem.itens.update(criado_em=F("criado_em") + deslocamento)
        ordem.fotos.update(criado_em=F("criado_em") + deslocamento)
        Cliente.objects.filter(pk=ordem.cliente_id, criado_em__gt=momento).update(criado_em=momento)
        Aparelho.objects.filter(pk=ordem.aparelho_id, criado_em__gt=momento).update(
            criado_em=momento
        )
        # A peça digitada sem custo ganha o custo que a equipe informaria.
        ordem.itens.filter(tipo=TipoItem.PECA, produto__isnull=True, custo__isnull=True).update(
            custo=F("valor") * Decimal("0.4")
        )

        seguintes: dict[str, Passo] = {
            StatusOS.RECEBIDO: self.diagnosticar,
            StatusOS.EM_DIAGNOSTICO: self.orcar,
            StatusOS.ORCAMENTO_ENVIADO: self.responder,
            StatusOS.APROVADO: self.consertar,
            StatusOS.EM_REPARO: self.aprontar,
            StatusOS.PRONTO: self.entregar,
        }
        seguinte = seguintes.get(ordem.status)
        if seguinte is not None:
            conserto = Conserto(ordem, defeito_do_relato(ordem.problema_relatado), ordem.tecnico)
            self._marcar(conserto, depois(momento, 1, 8), seguinte)

    def diagnosticar(self, conserto: Conserto, momento: datetime) -> None:
        self._mudar(conserto, StatusOS.EM_DIAGNOSTICO, momento)
        self._marcar(conserto, depois(momento, 0.5, 6), self.orcar)

    def orcar(self, conserto: Conserto, momento: datetime) -> None:
        ordem = conserto.ordem
        if not ordem.itens.exists():
            self._montar_orcamento(conserto, momento)
        OrdemServico.objects.filter(pk=ordem.pk, diagnostico="").update(
            diagnostico=conserto.defeito.diagnostico
        )
        self._mudar(conserto, StatusOS.ORCAMENTO_ENVIADO, momento)
        if random.random() < 0.08:
            self._comentar(conserto, "Cliente pediu para ligar antes de começar.", momento)
        self._marcar(conserto, depois(momento, 0.5, 14), self.responder)

    def _montar_orcamento(self, conserto: Conserto, momento: datetime) -> None:
        ordem, defeito = conserto.ordem, conserto.defeito
        modelo = ordem.aparelho.modelo
        itens: list[ItemOrcamento] = []
        if defeito.servico is not None:
            nome, minimo, maximo = defeito.servico
            itens.append(
                ItemOrcamento(
                    ordem=ordem,
                    tipo=TipoItem.SERVICO,
                    descricao=nome,
                    valor=Decimal(random.randint(minimo, maximo)),
                )
            )
        else:
            peca = self.estoque.peca(defeito.peca, modelo) if defeito.peca else None
            if peca is not None:
                conserto.peca = peca
                itens.append(
                    ItemOrcamento(
                        ordem=ordem,
                        tipo=TipoItem.PECA,
                        descricao=peca.nome,
                        valor=peca.preco,
                        produto=peca,
                    )
                )
            else:
                avulsa = defeito.avulsa or CONECTOR_AVULSO
                conserto.peca_avulsa = True
                itens.append(
                    ItemOrcamento(
                        ordem=ordem,
                        tipo=TipoItem.PECA,
                        descricao=f"{avulsa.nome} {modelo}",
                        valor=Decimal(random.randint(*avulsa.valor)),
                        custo=Decimal(random.randint(*avulsa.custo)),
                    )
                )
            itens.append(
                ItemOrcamento(
                    ordem=ordem,
                    tipo=TipoItem.SERVICO,
                    descricao="Mão de obra",
                    valor=Decimal(random.randint(*defeito.mao_de_obra)),
                )
            )
        ItemOrcamento.objects.bulk_create(itens)
        datar(ItemOrcamento.objects.filter(ordem=ordem), momento)

    def responder(self, conserto: Conserto, momento: datetime) -> None:
        if random.random() < 0.13:
            self._mudar(conserto, StatusOS.REPROVADO, momento)
            self._marcar(conserto, depois(momento, 2, 30), self.devolver)
            return

        ordem = conserto.ordem
        self._mudar(conserto, StatusOS.APROVADO, momento)
        datar(MovimentoDeEstoque.objects.filter(ordem=ordem, tipo=TipoDeMovimento.ORDEM), momento)

        faltou = conserto.peca is not None and conserto.peca.quantidade_na_loja(ordem.loja) < 0
        if faltou or (conserto.peca_avulsa and random.random() < 0.7):
            self._marcar(conserto, depois(momento, 0.3, 3), self.comecar_sem_a_peca)
        else:
            self._marcar(conserto, depois(momento, 0.5, 8), self.consertar)

    # O técnico abre o aparelho, confirma a peça que falta e a ordem para até ela chegar: da outra
    # loja, da compra seguinte do estoque ou do fornecedor, quando é peça que a loja não guarda.
    def comecar_sem_a_peca(self, conserto: Conserto, momento: datetime) -> None:
        self._mudar(conserto, StatusOS.EM_REPARO, momento)
        self._marcar(conserto, depois(momento, 0.3, 1.5), self.esperar)

    def esperar(self, conserto: Conserto, momento: datetime) -> None:
        self._mudar(conserto, StatusOS.AGUARDANDO_PECA, momento)
        if random.random() < 0.6:
            self._comentar(conserto, f"Peça pedida para a {FORNECEDOR_DE_PECAS}.", momento)

        retomar = partial(self.retomar, conserto)
        if conserto.peca is not None:
            self.estoque.providenciar(conserto.peca, conserto.ordem.loja, momento, retomar)
        else:
            self.assistencia.agenda.marcar(depois(momento, 9, 27), retomar)

    def retomar(self, conserto: Conserto, momento: datetime) -> None:
        self._mudar(conserto, StatusOS.EM_REPARO, momento)
        self._marcar(conserto, depois(momento, 1, 5), self.aprontar)

    def consertar(self, conserto: Conserto, momento: datetime) -> None:
        self._mudar(conserto, StatusOS.EM_REPARO, momento)
        self._marcar(conserto, depois(momento, 1, 10), self.aprontar)

    def aprontar(self, conserto: Conserto, momento: datetime) -> None:
        self._mudar(conserto, StatusOS.PRONTO, momento)
        if random.random() < 0.08:
            self._comentar(conserto, "Cliente avisou que busca no fim da tarde.", momento)
        self._marcar(conserto, depois(momento, 1, 20), self.entregar)

    def devolver(self, conserto: Conserto, momento: datetime) -> None:
        self._mudar(conserto, StatusOS.DEVOLVIDO_SEM_REPARO, momento)

    def entregar(self, conserto: Conserto, momento: datetime) -> None:
        ordem = conserto.ordem
        cobranca = self._cobranca(ordem, momento)
        quem = random.choice(
            [self.assistencia.no_balcao(ordem.loja), self._quem_conserta(conserto)]
        )
        self._mudar(conserto, StatusOS.ENTREGUE, momento, usuario=quem, cobranca=cobranca)
        OrdemServico.objects.filter(pk=ordem.pk).update(
            entregue_em=momento, garantia_ate=timezone.localdate(momento) + GARANTIA
        )
        Pagamento.objects.filter(ordem=ordem).update(recebido_em=momento, criado_em=momento)
        combinados = RegistroOS.objects.filter(ordem=ordem, tipo=TipoDeRegistro.PAGAMENTO_COMBINADO)
        datar(combinados, momento)
        if cobranca.falta_receber > 0:
            self._receber_depois(conserto, cobranca, quem)

    def _cobranca(self, ordem: OrdemServico, entrega: datetime) -> Cobranca:
        aprovado = ordem.total_aprovado
        sorteio = random.random()
        com_desconto = sorteio < 0.12
        cobrado = (aprovado * Decimal("0.9")).quantize(Decimal("1")) if com_desconto else aprovado

        # Uma parte das entregas fica devendo tudo ou metade, para pagar até o dia combinado.
        if sorteio > 0.88:
            parte_paga = Recebimento(
                forma=FormaDePagamento.PIX, valor=(cobrado / 2).quantize(Decimal("1"))
            )
            return Cobranca(
                valor_cobrado=cobrado,
                recebimentos=() if sorteio > 0.94 else (parte_paga,),
                pagamento_combinado_para=timezone.localdate(entrega)
                + timedelta(days=random.randint(3, 15)),
            )

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

    # Quem ficou devendo costuma pagar perto do dia combinado; alguns pagam semanas depois, e
    # poucos não pagam. O que passou da data e ainda não foi pago aparece vencido.
    def _receber_depois(self, conserto: Conserto, cobranca: Cobranca, quem: Usuario) -> None:
        combinado = cobranca.pagamento_combinado_para
        sorteio = random.random()
        if combinado is None or sorteio < 0.1:
            return
        if sorteio < 0.8:
            dia = combinado + timedelta(days=random.choice([-2, -1, 0, 0, 1, 3]))
        else:
            dia = combinado + timedelta(days=random.randint(10, 40))
        hora = time(random.randint(9, 17), random.randint(0, 59))

        def receber(momento: datetime) -> None:
            ordem = conserto.ordem
            restante = Recebimento(
                forma=random.choice([FormaDePagamento.PIX, FormaDePagamento.DINHEIRO]),
                valor=ordem.saldo_a_receber,
            )
            pagamento = ordem.receber(restante, usuario=quem)
            Pagamento.objects.filter(pk=pagamento.pk).update(recebido_em=momento, criado_em=momento)

        self.assistencia.agenda.marcar(no_expediente(no_horario(dia, hora)), receber)
