import { BarrasHorizontais } from "@/componentes/BarrasHorizontais";
import { GradeDeIndicadores, Indicador } from "@/componentes/Indicador";
import { Cartao } from "@/componentes/ui/Cartao";
import { emReais } from "@/lib/moeda";
import type { Painel } from "@/lib/tipos";
import { contagem, emPorcentagem } from "./formatos";
import { Secao } from "./secao";
import { Variacao } from "./variacao";

type Dinheiro = NonNullable<Painel["dinheiro"]>;

function numeroOuNulo(valor: string | null): number | null {
  return valor === null ? null : Number(valor);
}

function Recebido({ dinheiro }: { dinheiro: Dinheiro }) {
  const { recebido, descontos } = dinheiro;

  return (
    <Cartao>
      <p className="text-[13px] text-texto-suave">Recebido no período</p>
      <p className="mt-2 text-4xl leading-none font-semibold tracking-tight sm:text-5xl">
        {emReais(recebido.atual)}
      </p>
      <div className="mt-3 text-xs text-texto-apagado">
        <Variacao
          atual={Number(recebido.atual)}
          anterior={Number(recebido.anterior)}
          formatar={emReais}
        />
      </div>

      <div className="mt-6 border-t border-borda pt-4">
        <p className="text-[13px] text-texto-suave">
          Descontos dados:{" "}
          <span className="font-medium text-texto">{emReais(descontos.atual)}</span>
        </p>
        <div className="mt-1 text-xs text-texto-apagado">
          <Variacao
            atual={Number(descontos.atual)}
            anterior={Number(descontos.anterior)}
            formatar={emReais}
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
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <Recebido dinheiro={dinheiro} />
        <Cartao titulo="Por forma de pagamento" semEspaco>
          <BarrasHorizontais
            empilhada
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
          valor={emReais(aReceber.valor)}
          nota={`${ordensAReceber} sem pagamento completo`}
          href={aReceber.ordens > 0 ? "/ordens?situacao=a_receber" : undefined}
        />
        <Indicador
          rotulo="Aprovado em aberto"
          valor={emReais(dinheiro.aprovado_em_aberto)}
          nota="vai entrar quando as ordens abertas forem entregues"
        />
        <Indicador
          rotulo="Ticket médio"
          valor={ticket.atual === null ? "—" : emReais(ticket.atual)}
          nota={
            <Variacao
              atual={numeroOuNulo(ticket.atual)}
              anterior={numeroOuNulo(ticket.anterior)}
              formatar={emReais}
            />
          }
        />
        <Indicador
          rotulo="Orçamentos aprovados"
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
