import { diaEMesEmNumeros, diaNoFuso, horaEMinuto, somarDias } from "@/lib/datas";
import { contagem } from "@/lib/formatos";
import { emReais } from "@/lib/moeda";
import type { CaixaDaLoja, MovimentoDoDia } from "@/lib/tipos";

export type TomDaConferencia = "bateu" | "sobrou" | "faltou" | "inicio";

export function resultadoDaConferencia(diferenca: string | null | undefined): {
  tom: TomDaConferencia;
  texto: string;
} {
  if (diferenca === null || diferenca === undefined) {
    return { tom: "inicio", texto: "Ponto de partida" };
  }
  const valor = Number(diferenca);
  if (valor === 0) return { tom: "bateu", texto: "Bateu" };
  if (valor > 0) return { tom: "sobrou", texto: `Sobraram ${emReais(valor)}` };
  return { tom: "faltou", texto: `Faltaram ${emReais(-valor)}` };
}

// "hoje, 18:02", "ontem, 18:02" ou "20/10, 18:02", no fuso da assistência.
export function quandoNoCaixa(momento: string, hoje: string, fuso: string): string {
  const dia = diaNoFuso(momento, fuso);
  const hora = horaEMinuto(new Date(momento), fuso);
  if (dia === hoje) return `hoje, ${hora}`;
  if (dia === somarDias(hoje, -1)) return `ontem, ${hora}`;
  return `${diaEMesEmNumeros(dia)}, ${hora}`;
}

function soma(valores: number[]): number {
  return valores.reduce((total, valor) => total + Math.round(valor * 100), 0) / 100;
}

export type AvisoDoCaixa = { valor: string; nota: string; alerta: boolean };

// O painel mostra a última conferência de cada loja, em vermelho quando faltou dinheiro. Com mais
// de uma loja, soma o que faltou, ou o que sobrou quando nada faltou.
export function avisoDoCaixa(lojas: CaixaDaLoja[], hoje: string, fuso: string): AvisoDoCaixa {
  const conferidas = lojas.filter((loja) => loja.conferida_em !== null);
  if (conferidas.length === 0) {
    return { valor: "—", nota: "nenhuma conferência ainda", alerta: false };
  }

  if (lojas.length === 1) {
    const { conferida_em: conferidaEm, diferenca } = conferidas[0];
    const quando = quandoNoCaixa(conferidaEm!, hoje, fuso);
    if (diferenca === null) {
      return { valor: "—", nota: `primeira conferência, ${quando}`, alerta: false };
    }
    const valor = Number(diferenca);
    const resultado = valor < 0 ? "faltou" : valor > 0 ? "sobrou" : "bateu";
    return {
      valor: emReais(valor),
      nota: `${resultado} na conferência de ${quando}`,
      alerta: valor < 0,
    };
  }

  const diferencas = conferidas.map((loja) => Number(loja.diferenca ?? "0"));
  const faltas = diferencas.filter((valor) => valor < 0);
  if (faltas.length > 0) {
    return {
      valor: emReais(soma(faltas)),
      nota: `faltou em ${contagem(faltas.length, "loja", "lojas")} na última conferência`,
      alerta: true,
    };
  }
  const sobras = diferencas.filter((valor) => valor > 0);
  if (sobras.length > 0) {
    return {
      valor: emReais(soma(sobras)),
      nota: `sobrou em ${contagem(sobras.length, "loja", "lojas")} na última conferência`,
      alerta: false,
    };
  }
  const semConferencia = lojas.length - conferidas.length;
  return {
    valor: emReais(0),
    nota:
      semConferencia > 0
        ? `bateu; ${contagem(semConferencia, "loja", "lojas")} sem conferência`
        : "bateu na última conferência das lojas",
    alerta: false,
  };
}

export function linkDoMovimento(movimento: MovimentoDoDia): string | null {
  if (movimento.ordem !== null) return `/ordens/${movimento.ordem}`;
  if (movimento.venda !== null) return `/estoque/vendas/${movimento.venda}`;
  if (movimento.conta !== null) return `/financeiro/contas/${movimento.conta}`;
  return null;
}
