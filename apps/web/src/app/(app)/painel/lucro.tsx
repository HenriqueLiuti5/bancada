import { ChartBarIcon, TrendDownIcon, TrendUpIcon, WarningIcon } from "@/componentes/icones";
import { Cartao } from "@/componentes/ui/Cartao";
import { juntar } from "@/componentes/ui/estilos";
import { mesAbreviado, mesPorExtenso } from "@/lib/datas";
import { emPorcentagem } from "@/lib/formatos";
import {
  avisoDasPecasSemCusto,
  despesasResumidas,
  graficoDoLucro,
  margem,
  type ColunaDoLucro,
  type Rotulo,
} from "@/lib/lucro";
import { emReais, emReaisCurto } from "@/lib/moeda";
import type { LucroDoMes, LucroNoPeriodo } from "@/lib/tipos";
import { Variacao } from "./variacao";

const MENOS = "−";

function corDoLucro(valor: number): string {
  return valor < 0 ? "text-perigo" : "text-dinheiro";
}

function Linha({
  rotulo,
  dica,
  valor,
  saida = false,
  detalhe = false,
  forte = false,
}: {
  rotulo: string;
  dica?: string;
  valor: number;
  saida?: boolean;
  detalhe?: boolean;
  forte?: boolean;
}) {
  const zero = Math.round(valor * 100) === 0;
  const cor = zero
    ? "text-texto-apagado"
    : detalhe
      ? "text-texto-suave"
      : forte
        ? corDoLucro(valor)
        : "text-dinheiro";

  return (
    <div
      className={juntar(
        "flex items-baseline justify-between gap-4 py-1.5",
        detalhe && "py-1 pl-4 text-[13px] sm:text-xs",
        forte && "mt-1.5 border-t border-borda pt-3",
      )}
    >
      <dt className={forte ? "font-bold" : detalhe ? "text-texto-apagado" : "text-texto-suave"}>
        {rotulo}
        {dica && <span className="block text-xs font-normal text-texto-apagado">{dica}</span>}
      </dt>
      <dd className={juntar("shrink-0 tabular-nums", cor, forte && "font-bold")}>
        {saida && !zero && MENOS}
        {emReais(valor)}
      </dd>
    </div>
  );
}

// O que entrou menos o custo das peças e as contas pagas, com as maiores contas abertas por
// categoria. As compras de peças ficam de fora: o custo das peças já conta o que foi usado.
export function LucroDoPeriodo({
  atual,
  anterior,
}: {
  atual: LucroNoPeriodo;
  anterior: LucroNoPeriodo;
}) {
  const lucro = Number(atual.lucro);
  const antes = Number(anterior.lucro);
  const sobra = margem(atual.lucro, atual.recebido);
  const aviso = avisoDasPecasSemCusto(atual.pecas_sem_custo);
  const Icone = lucro < 0 ? TrendDownIcon : TrendUpIcon;

  return (
    <Cartao tour="lucro">
      <div className="flex items-center gap-2.5">
        <Icone size={22} className={juntar("shrink-0", lucro < 0 ? "text-perigo" : "text-icone")} />
        <p className="text-sm font-medium text-texto-apagado">
          {lucro < 0 ? "Prejuízo no período" : "Lucro no período"}
        </p>
      </div>
      <p
        className={juntar(
          "mt-4 text-4xl leading-none font-bold tracking-tight tabular-nums sm:text-5xl",
          corDoLucro(lucro),
        )}
      >
        {emReais(lucro)}
      </p>
      <div className="mt-2 text-xs text-texto-apagado">
        <Variacao atual={lucro} anterior={antes} formatar={emReais} dinheiro={antes >= 0} />
      </div>

      <dl className="mt-6 text-sm sm:text-[13px]">
        <Linha rotulo="Entrou no período" valor={Number(atual.recebido)} />
        <Linha
          rotulo="Custo das peças"
          dica="Das ordens entregues e das vendas no balcão."
          valor={Number(atual.custo_das_pecas)}
          saida
        />
        <Linha rotulo="Contas pagas" valor={Number(atual.despesas)} saida />
        {despesasResumidas(atual.despesas_por_categoria).map((linha) => (
          <Linha key={linha.chave} rotulo={linha.rotulo} valor={linha.valor} detalhe />
        ))}
        <Linha
          rotulo={lucro < 0 ? "Prejuízo" : "Lucro"}
          dica={sobra === null ? undefined : `${emPorcentagem(sobra)} do que entrou`}
          valor={lucro}
          forte
        />
      </dl>

      {aviso && (
        <p className="mt-4 flex items-start gap-2 text-xs text-aviso">
          <WarningIcon size={16} className="shrink-0" />
          <span>{aviso}</span>
        </p>
      )}
      <p className="mt-3 text-xs text-texto-apagado">
        As compras de peças não entram como conta: o custo das peças já conta o que foi usado e
        vendido.
      </p>
    </Cartao>
  );
}

function descricaoDoMes(mes: string, mesAtual: string): string {
  return mes === mesAtual ? `${mesPorExtenso(mes)}, até hoje` : mesPorExtenso(mes);
}

function Dica({
  coluna,
  mesAtual,
  aDireita,
}: {
  coluna: ColunaDoLucro;
  mesAtual: string;
  aDireita: boolean;
}) {
  return (
    <span
      className={juntar(
        "pointer-events-none absolute top-0 z-10 rounded-xl border border-borda bg-superficie px-3 py-2 text-left whitespace-nowrap opacity-0 shadow-elevada transition-opacity duration-150 group-hover:opacity-100",
        aDireita ? "right-0" : "left-0",
      )}
    >
      <span className={juntar("block text-[13px] font-semibold", corDoLucro(coluna.lucro))}>
        {emReais(coluna.lucro)}
      </span>
      <span className="block text-[11px] text-texto-suave">
        {descricaoDoMes(coluna.mes, mesAtual)}
      </span>
    </span>
  );
}

function ValorNaPonta({
  coluna,
  rotulo,
  embaixo,
}: {
  coluna: ColunaDoLucro;
  rotulo: Rotulo;
  embaixo: boolean;
}) {
  return (
    <span
      className={juntar(
        "absolute left-1/2 -translate-x-1/2 rounded-full bg-superficie px-1 text-[11px] font-semibold whitespace-nowrap",
        embaixo ? "top-full mt-1" : "bottom-full mb-1",
        rotulo.soNoComputador && "max-sm:hidden",
        corDoLucro(coluna.lucro),
      )}
    >
      {emReaisCurto(coluna.lucro)}
    </span>
  );
}

function ColunaDoMes({
  coluna,
  acimaDoZero,
  rotulo,
  mesAtual,
  aDireita,
}: {
  coluna: ColunaDoLucro;
  acimaDoZero: number;
  rotulo?: Rotulo;
  mesAtual: string;
  aDireita: boolean;
}) {
  const altura = { height: `${Math.max(coluna.fracao * 100, 2)}%` };

  return (
    <li className="group relative flex h-full flex-1 flex-col">
      <span
        className="flex w-full items-end justify-center"
        style={{ height: `${acimaDoZero * 100}%` }}
      >
        {coluna.lucro > 0 && (
          <span
            className="relative block w-full max-w-6 rounded-t-[4px] bg-grafico transition-colors duration-150 group-hover:bg-grafico-forte"
            style={altura}
          >
            {rotulo && <ValorNaPonta coluna={coluna} rotulo={rotulo} embaixo={false} />}
          </span>
        )}
      </span>
      <span className="flex w-full flex-1 items-start justify-center">
        {coluna.lucro < 0 && (
          <span
            className="relative block w-full max-w-6 rounded-b-[4px] bg-perigo transition-opacity duration-150 group-hover:opacity-80"
            style={altura}
          >
            {rotulo && <ValorNaPonta coluna={coluna} rotulo={rotulo} embaixo />}
          </span>
        )}
      </span>
      <Dica coluna={coluna} mesAtual={mesAtual} aDireita={aDireita} />
    </li>
  );
}

function TabelaDoLucro({ meses, mesAtual }: { meses: LucroDoMes[]; mesAtual: string }) {
  const celula = "px-3 py-1.5 text-right tabular-nums first:pl-5 first:text-left last:pr-5";

  return (
    <details className="border-t border-borda">
      <summary className="cursor-pointer px-5 py-3 text-[13px] font-medium text-texto-apagado transition-colors select-none hover:text-texto">
        Ver os números
      </summary>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px] whitespace-nowrap sm:text-xs">
          <thead>
            <tr className="border-t border-borda text-xs text-texto-suave">
              {["Mês", "Entrou", "Peças", "Contas", "Lucro"].map((titulo) => (
                <th key={titulo} scope="col" className={juntar(celula, "font-medium")}>
                  {titulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-borda border-t border-borda">
            {meses.map((mes) => (
              <tr key={mes.mes}>
                <td className={celula}>{descricaoDoMes(mes.mes, mesAtual)}</td>
                <td className={celula}>{emReais(mes.recebido)}</td>
                <td className={celula}>{emReais(mes.custo_das_pecas)}</td>
                <td className={celula}>{emReais(mes.despesas)}</td>
                <td className={juntar(celula, "font-semibold", corDoLucro(Number(mes.lucro)))}>
                  {emReais(mes.lucro)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

// O lucro dos últimos seis meses: o positivo sobe da linha do zero em verde, e o prejuízo desce
// dela em vermelho, com o valor escrito, para não depender só da cor.
export function LucroMesAMes({ meses, hoje }: { meses: LucroDoMes[]; hoje: string }) {
  const grafico = graficoDoLucro(meses);
  const mesAtual = hoje.slice(0, 7);
  const comPrejuizo = grafico.acimaDoZero < 1;

  return (
    <Cartao
      titulo="Lucro mês a mês"
      descricao="Os últimos 6 meses; o atual vai até hoje."
      icone={ChartBarIcon}
      semEspaco
      preencher
    >
      {grafico.vazio ? (
        <p className="flex flex-1 items-center justify-center px-5 py-10 text-center text-[13px] text-texto-apagado">
          O lucro de cada mês aparece aqui quando entrar o primeiro pagamento ou for paga a
          primeira conta.
        </p>
      ) : (
        <figure className="flex flex-1 flex-col">
          <figcaption className="sr-only">Lucro de cada um dos últimos 6 meses</figcaption>
          {/* No computador, o gráfico cresce até a altura do cartão do lucro, ao lado. */}
          <div aria-hidden="true" className="flex flex-1 flex-col px-5 pt-2">
            <div
              className={juntar(
                "h-48 pt-6 lg:h-auto lg:min-h-48 lg:flex-1",
                comPrejuizo && "pb-6",
              )}
            >
              <div className="relative h-full">
                <span
                  className="absolute inset-x-0 border-t border-borda"
                  style={{ top: `${grafico.acimaDoZero * 100}%` }}
                />
                <ol className="flex h-full gap-2">
                  {grafico.colunas.map((coluna, indice) => (
                    <ColunaDoMes
                      key={coluna.mes}
                      coluna={coluna}
                      acimaDoZero={grafico.acimaDoZero}
                      rotulo={grafico.rotulos.find((rotulo) => rotulo.indice === indice)}
                      mesAtual={mesAtual}
                      aDireita={indice >= grafico.colunas.length / 2}
                    />
                  ))}
                </ol>
              </div>
            </div>
            <ol className="flex gap-2 pt-1.5 pb-3">
              {grafico.colunas.map((coluna) => (
                <li
                  key={coluna.mes}
                  className={juntar(
                    "flex min-w-0 flex-1 justify-center text-[11px] whitespace-nowrap text-texto-apagado",
                    coluna.mes === mesAtual && "font-semibold text-texto-suave",
                  )}
                >
                  {mesAbreviado(coluna.mes)}
                </li>
              ))}
            </ol>
          </div>
          <TabelaDoLucro meses={meses} mesAtual={mesAtual} />
        </figure>
      )}
    </Cartao>
  );
}
