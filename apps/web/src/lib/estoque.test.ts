import { describe, expect, it } from "vitest";
import {
  lerQuantidade,
  quantidadeNaLoja,
  rotuloDoProduto,
  textoDaQuantidade,
  totalDaVenda,
} from "@/lib/estoque";
import type { ProdutoParaEscolher } from "@/lib/tipos";

const capa: ProdutoParaEscolher = {
  id: 7,
  nome: "Capa Moto G54",
  tipo: "acessorio",
  codigo: "",
  custo: "12.00",
  preco: "39.90",
  quantidade: 5,
  por_loja: { "1": 3, "2": 2 },
};

const tela: ProdutoParaEscolher = { ...capa, id: 8, nome: "Tela", preco: "320.00", por_loja: {} };

describe("quantidadeNaLoja", () => {
  it("usa o total quando a assistência tem uma loja só", () => {
    expect(quantidadeNaLoja(capa, 1, false)).toBe(5);
  });

  it("usa a quantidade da loja quando há várias", () => {
    expect(quantidadeNaLoja(capa, 2, true)).toBe(2);
    expect(quantidadeNaLoja(capa, 3, true)).toBe(0);
  });
});

describe("textoDaQuantidade", () => {
  it("diz quanto há, quando acabou e quanto falta", () => {
    expect(textoDaQuantidade(3)).toBe("3 em estoque");
    expect(textoDaQuantidade(0)).toBe("sem estoque");
    expect(textoDaQuantidade(-2)).toBe("faltam 2");
  });

  it("monta o nome do produto com o preço e a quantidade", () => {
    expect(rotuloDoProduto(capa, 3)).toBe("Capa Moto G54 · R$ 39,90 · 3 em estoque");
  });
});

describe("lerQuantidade", () => {
  it("aceita só números inteiros", () => {
    expect(lerQuantidade(" 12 ")).toBe(12);
    expect(lerQuantidade("0")).toBe(0);
    expect(lerQuantidade("1,5")).toBeNull();
    expect(lerQuantidade("-1")).toBeNull();
    expect(lerQuantidade("")).toBeNull();
  });
});

describe("totalDaVenda", () => {
  it("soma o preço de cada produto pela quantidade, em centavos", () => {
    const linhas = [
      { chave: 0, produto: "7", quantidade: "3" },
      { chave: 1, produto: "8", quantidade: "1" },
    ];
    expect(totalDaVenda(linhas, [capa, tela])).toBe(3990 * 3 + 32000);
  });

  it("ignora a linha sem produto ou com quantidade inválida", () => {
    const linhas = [
      { chave: 0, produto: "", quantidade: "1" },
      { chave: 1, produto: "7", quantidade: "dois" },
    ];
    expect(totalDaVenda(linhas, [capa])).toBe(0);
  });
});
