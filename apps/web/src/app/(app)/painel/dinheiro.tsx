import { BarrasHorizontais } from "@/componentes/BarrasHorizontais";
import { GradeDeIndicadores, Indicador } from "@/componentes/Indicador";
import {
  HandCoinsIcon,
  MoneyIcon,
  ReceiptIcon,
  StampIcon,
  ThumbsUpIcon,
  WalletIcon,
} from "@/componentes/icones";
import { Cartao } from "@/componentes/ui/Cartao";
import { Secao } from "@/componentes/ui/Secao";
import { contagem, emPorcentagem } from "@/lib/formatos";
import { emReais } from "@/lib/moeda";
import type { Painel } from "@/lib/tipos";
import { Variacao } from "./variacao";

type Dinheiro = NonNullable<Painel["dinheiro"]>;

function numeroOuNulo(valor: string | null): number | null {
  return valor === null ? null : Number(valor);
}

function Recebido({ dinheiro }: { dinheiro: Dinheiro }) {
  const { recebido, descontos } = dinheiro;

  return (
    <Cartao>
      <div className="flex items-center gap-2.5">
        <WalletIcon size={22} className="shrink-0 text-icone" />
        <p className="text-sm font-medium text-texto-apagado">Recebido no período</p>
      </div>
      <p className="mt-4 text-4xl leading-none font-bold tracking-tight text-dinheiro tabular-nums sm:text-5xl">
        {emReais(recebido.atual)}
      </p>
      <div className="mt-2 text-xs text-texto-apagado">
        <Variacao
          atual={Number(recebido.atual)}
          anterior={Number(recebido.anterior)}
          formatar={emReais}
          dinheiro
        />
      </div>

      <div className="mt-6 rounded-xl bg-realce px-4 py-3">
        <p className="text-[13px] text-texto-apagado">
          Descontos dados:{" "}
          <span className="font-bold text-dinheiro">{emReais(descontos.atual)}</span>
        </p>
        <div className="mt-1 text-xs text-texto-apagado">
          <Variacao
            atual={Number(descontos.atual)}
            anterior={Number(descontos.anterior)}
            formatar={emReais}
            dinheiro
          />
        </div>
      </div>
    </Cartao>
  );
}

export function SecaoDinheiro({ dinheiro }: { dinheiro: Dinheiro }) {
  const { a_receber: aReceber, ticket_medio: ticket, taxa_de_aprovacao: taxa } = dinheiro;
  const ordensAReceber = contagem(aReceber.ordens, "ordem entregue", "ordens entregues");

  return (
    <Secao
      titulo="Dinheiro"
      descricao="O que entrou no caixa no período. Só quem é dono vê esta parte."
      tour="dinheiro"
      icone={WalletIcon}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <Recebido dinheiro={dinheiro} />
        <Cartao titulo="Por forma de pagamento" icone={MoneyIcon} semEspaco>
          <BarrasHorizontais
            empilhada
            dinheiro
            larguraDoValor="w-auto"
            linhas={dinheiro.por_forma.map((linha) => ({
              chave: linha.forma,
              rotulo: linha.rotulo,
              medida: Number(linha.valor),
              valor: emReais(linha.valor),
            }))}
          />
        </Cartao>
      </div>

      <GradeDeIndicadores>
        <Indicador
          rotulo="A receber"
          icone={HandCoinsIcon}
          valor={emReais(aReceber.valor)}
          dinheiro
          nota={`${ordensAReceber} sem pagamento completo`}
          href={aReceber.ordens > 0 ? "/ordens?situacao=a_receber" : undefined}
        />
        <Indicador
          rotulo="Aprovado em aberto"
          icone={StampIcon}
          valor={emReais(dinheiro.aprovado_em_aberto)}
          dinheiro
          nota="vai entrar quando as ordens abertas forem entregues"
        />
        <Indicador
          rotulo="Ticket médio"
          icone={ReceiptIcon}
          valor={ticket.atual === null ? "—" : emReais(ticket.atual)}
          dinheiro={ticket.atual !== null}
          nota={
            <Variacao
              atual={numeroOuNulo(ticket.atual)}
              anterior={numeroOuNulo(ticket.anterior)}
              formatar={emReais}
              dinheiro
            />
          }
        />
        <Indicador
          rotulo="Orçamentos aprovados"
          icone={ThumbsUpIcon}
          valor={emPorcentagem(taxa.atual)}
          nota={
            <Variacao
              atual={taxa.atual}
              anterior={taxa.anterior}
              formatar={emPorcentagem}
              emPontos
            />
          }
        />
      </GradeDeIndicadores>
    </Secao>
  );
}
