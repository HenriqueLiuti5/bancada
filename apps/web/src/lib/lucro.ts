import { contagem } from "@/lib/formatos";
import type { DespesaPorCategoria, LucroDoMes } from "@/lib/tipos";

function emCentavos(valor: string | number): number {
  return Math.round(Number(valor) * 100);
}

// O quanto do que entrou sobrou como lucro. Sem nada recebido, não há margem.
export function margem(lucro: string, recebido: string): number | null {
  const entrou = Number(recebido);
  if (entrou <= 0) return null;
  return Math.round((Number(lucro) / entrou) * 1000) / 10;
}

export type LinhaDeDespesa = { chave: string; rotulo: string; valor: number };

// As maiores categorias aparecem uma a uma, e as outras numa linha só, para o cartão não crescer
// com as treze.
export function despesasResumidas(
  categorias: DespesaPorCategoria[],
  limite = 3,
): LinhaDeDespesa[] {
  const linhas = categorias.map(({ categoria, rotulo, valor }) => ({
    chave: categoria,
    rotulo,
    valor: Number(valor),
  }));
  if (linhas.length <= limite + 1) return linhas;

  const resto = linhas.slice(limite);
  const soma = resto.reduce((total, linha) => total + emCentavos(linha.valor), 0) / 100;
  return [
    ...linhas.slice(0, limite),
    { chave: "outras", rotulo: `Outras ${resto.length} categorias`, valor: soma },
  ];
}

export function avisoDasPecasSemCusto(quantas: number): string | null {
  if (quantas === 0) return null;
  return `${contagem(quantas, "peça", "peças")} sem custo nas ordens entregues no período: o lucro de verdade é menor que este.`;
}

export type ColunaDoLucro = {
  mes: string;
  lucro: number;
  // A altura da barra, de 0 a 1, dentro da parte do gráfico do sinal dela.
  fracao: number;
};

export type Rotulo = { indice: number; soNoComputador: boolean };

export type GraficoDoLucro = {
  colunas: ColunaDoLucro[];
  // A parte da altura do gráfico acima da linha do zero, de 0 a 1.
  acimaDoZero: number;
  // Os meses que ganham o valor escrito: o atual e o de maior lucro ou prejuízo. Colado no atual,
  // o maior só ganha o valor onde as colunas são largas, para os dois não se encostarem.
  rotulos: Rotulo[];
  vazio: boolean;
};

// O lucro positivo sobe da linha do zero e o prejuízo desce dela, na mesma escala.
export function graficoDoLucro(meses: LucroDoMes[]): GraficoDoLucro {
  const valores = meses.map((mes) => Number(mes.lucro));
  const maior = Math.max(0, ...valores);
  const menor = Math.min(0, ...valores);
  const amplitude = maior - menor;

  const colunas = meses.map((mes, indice) => {
    const lucro = valores[indice];
    const fracao = lucro > 0 ? lucro / maior : lucro < 0 ? lucro / menor : 0;
    return { mes: mes.mes, lucro, fracao };
  });

  const ultimo = colunas.length - 1;
  const rotulos: Rotulo[] = [];
  const extremo = valores.reduce(
    (escolhido, valor, indice) => (Math.abs(valor) > Math.abs(valores[escolhido]) ? indice : escolhido),
    0,
  );
  if (valores[extremo] !== 0 && extremo !== ultimo) {
    rotulos.push({ indice: extremo, soNoComputador: ultimo - extremo === 1 && valores[ultimo] !== 0 });
  }
  if (ultimo >= 0 && valores[ultimo] !== 0) rotulos.push({ indice: ultimo, soNoComputador: false });

  return {
    colunas,
    acimaDoZero: amplitude === 0 ? 1 : maior / amplitude,
    rotulos,
    vazio: meses.every(
      (mes) =>
        emCentavos(mes.recebido) === 0 &&
        emCentavos(mes.custo_das_pecas) === 0 &&
        emCentavos(mes.despesas) === 0,
    ),
  };
}
