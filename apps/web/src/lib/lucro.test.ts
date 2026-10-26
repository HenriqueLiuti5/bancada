import { describe, expect, it } from "vitest";
import { avisoDasPecasSemCusto, despesasResumidas, graficoDoLucro, margem } from "@/lib/lucro";
import type { LucroDoMes } from "@/lib/tipos";

function mes(chave: string, lucro: string, recebido = "0.00"): LucroDoMes {
  return { mes: chave, recebido, custo_das_pecas: "0.00", despesas: "0.00", lucro };
}

function categoria(nome: string, valor: string) {
  return { categoria: nome, rotulo: nome, valor };
}

describe("margem", () => {
  it("é o quanto do que entrou sobrou como lucro", () => {
    expect(margem("80.00", "480.00")).toBe(16.7);
    expect(margem("-440.00", "100.00")).toBe(-440);
  });

  it("não existe sem nada recebido", () => {
    expect(margem("-300.00", "0.00")).toBeNull();
  });
});

describe("despesas resumidas", () => {
  it("mostra cada categoria quando são poucas", () => {
    const linhas = despesasResumidas([categoria("aluguel", "200.00"), categoria("luz", "50.00")]);

    expect(linhas).toEqual([
      { chave: "aluguel", rotulo: "aluguel", valor: 200 },
      { chave: "luz", rotulo: "luz", valor: 50 },
    ]);
  });

  it("junta as menores numa linha só, sem erro de centavos", () => {
    const linhas = despesasResumidas([
      categoria("aluguel", "2000.00"),
      categoria("salarios", "1500.00"),
      categoria("luz", "460.00"),
      categoria("internet", "0.10"),
      categoria("tarifas", "0.20"),
    ]);

    expect(linhas.map((linha) => linha.rotulo)).toEqual([
      "aluguel",
      "salarios",
      "luz",
      "Outras 2 categorias",
    ]);
    expect(linhas[3].valor).toBe(0.3);
  });
});

describe("aviso das peças sem custo", () => {
  it("só aparece quando alguma peça ficou sem custo", () => {
    expect(avisoDasPecasSemCusto(0)).toBeNull();
    expect(avisoDasPecasSemCusto(1)).toBe(
      "1 peça sem custo nas ordens entregues no período: o lucro de verdade é menor que este.",
    );
    expect(avisoDasPecasSemCusto(3)).toMatch(/^3 peças sem custo/);
  });
});

describe("gráfico do lucro", () => {
  it("põe lucro e prejuízo na mesma escala, dos dois lados da linha do zero", () => {
    const grafico = graficoDoLucro([
      mes("2026-05", "300.00"),
      mes("2026-06", "-100.00"),
      mes("2026-07", "0.00"),
      mes("2026-08", "150.00"),
    ]);

    expect(grafico.acimaDoZero).toBe(0.75);
    expect(grafico.colunas.map((coluna) => coluna.fracao)).toEqual([1, 1, 0, 0.5]);
  });

  it("sem prejuízo, a linha do zero fica embaixo; só com prejuízo, em cima", () => {
    expect(graficoDoLucro([mes("2026-09", "10.00"), mes("2026-10", "20.00")]).acimaDoZero).toBe(1);
    expect(graficoDoLucro([mes("2026-09", "-10.00"), mes("2026-10", "-20.00")]).acimaDoZero).toBe(0);
  });

  it("escreve o valor do mês atual e o do maior lucro ou prejuízo", () => {
    const meses = ["300", "-900", "100", "200", "150", "400"].map((lucro, indice) =>
      mes(`2026-0${indice + 4}`, lucro),
    );

    expect(graficoDoLucro(meses).rotulos).toEqual([
      { indice: 1, soNoComputador: false },
      { indice: 5, soNoComputador: false },
    ]);
    expect(graficoDoLucro([mes("2026-09", "100"), mes("2026-10", "0")]).rotulos).toEqual([
      { indice: 0, soNoComputador: false },
    ]);
    expect(graficoDoLucro([mes("2026-09", "0"), mes("2026-10", "0")]).rotulos).toEqual([]);
  });

  it("colado no mês atual, o valor do maior só aparece onde as colunas são largas", () => {
    const meses = [mes("2026-08", "100"), mes("2026-09", "-950"), mes("2026-10", "10")];

    expect(graficoDoLucro(meses).rotulos).toEqual([
      { indice: 1, soNoComputador: true },
      { indice: 2, soNoComputador: false },
    ]);
  });

  it("fica vazio quando nada entrou nem saiu nos seis meses", () => {
    expect(graficoDoLucro([mes("2026-09", "0.00"), mes("2026-10", "0.00")]).vazio).toBe(true);
    expect(graficoDoLucro([mes("2026-09", "0.00"), mes("2026-10", "0.00", "50.00")]).vazio).toBe(false);
  });
});
