import { describe, expect, it } from "vitest";
import { avisoDoCaixa, linkDoMovimento, quandoNoCaixa, resultadoDaConferencia } from "@/lib/caixa";
import type { CaixaDaLoja, MovimentoDoDia } from "@/lib/tipos";

const HOJE = "2026-10-25";
const BRASILIA = "America/Sao_Paulo";
// 18h02 em Brasília.
const HOJE_AS_SEIS = "2026-10-25T21:02:00Z";

function loja(nome: string, diferenca: string | null, conferidaEm: string | null = HOJE_AS_SEIS): CaixaDaLoja {
  return { loja: nome.length, loja_nome: nome, conferida_em: conferidaEm, diferenca };
}

function movimento(campos: Partial<MovimentoDoDia>): MovimentoDoDia {
  return {
    momento: null,
    tipo: "retirada",
    descricao: "",
    forma: "dinheiro",
    forma_rotulo: "Dinheiro",
    valor: "0.00",
    usuario: null,
    ordem: null,
    venda: null,
    conta: null,
    movimento: null,
    ...campos,
  };
}

describe("resultado da conferência", () => {
  it("diz se bateu, quanto sobrou ou quanto faltou", () => {
    expect(resultadoDaConferencia("0.00")).toEqual({ tom: "bateu", texto: "Bateu" });
    expect(resultadoDaConferencia("2.50").texto).toMatch(/^Sobraram R\$\s2,50$/);
    expect(resultadoDaConferencia("-5.00")).toEqual({ tom: "faltou", texto: "Faltaram R$ 5,00" });
  });

  it("a primeira conferência da loja é o ponto de partida", () => {
    expect(resultadoDaConferencia(null)).toEqual({ tom: "inicio", texto: "Ponto de partida" });
    expect(resultadoDaConferencia(undefined).tom).toBe("inicio");
  });
});

describe("quando foi no caixa", () => {
  it("usa hoje e ontem, e a data nos outros dias, no fuso da assistência", () => {
    expect(quandoNoCaixa(HOJE_AS_SEIS, HOJE, BRASILIA)).toBe("hoje, 18:02");
    expect(quandoNoCaixa("2026-10-24T21:02:00Z", HOJE, BRASILIA)).toBe("ontem, 18:02");
    expect(quandoNoCaixa("2026-10-20T13:15:00Z", HOJE, BRASILIA)).toBe("20/10, 10:15");
    // 00h30 do dia 25 em Brasília ainda é 23h30 do dia 24 em Manaus.
    expect(quandoNoCaixa("2026-10-25T03:30:00Z", HOJE, "America/Manaus")).toBe("ontem, 23:30");
  });
});

describe("aviso do caixa no painel", () => {
  it("com uma loja, mostra a diferença da última conferência e fica vermelho quando faltou", () => {
    expect(avisoDoCaixa([loja("Matriz", "-5.00")], HOJE, BRASILIA)).toEqual({
      valor: "-R$ 5,00",
      nota: "faltou na conferência de hoje, 18:02",
      alerta: true,
    });
    expect(avisoDoCaixa([loja("Matriz", "0.00")], HOJE, BRASILIA).nota).toBe(
      "bateu na conferência de hoje, 18:02",
    );
    expect(avisoDoCaixa([loja("Matriz", "1.00")], HOJE, BRASILIA).alerta).toBe(false);
    expect(avisoDoCaixa([loja("Matriz", null)], HOJE, BRASILIA)).toEqual({
      valor: "—",
      nota: "primeira conferência, hoje, 18:02",
      alerta: false,
    });
  });

  it("sem nenhuma conferência, só avisa que ainda não houve", () => {
    expect(avisoDoCaixa([loja("Matriz", null, null)], HOJE, BRASILIA)).toEqual({
      valor: "—",
      nota: "nenhuma conferência ainda",
      alerta: false,
    });
    expect(avisoDoCaixa([], HOJE, BRASILIA).nota).toBe("nenhuma conferência ainda");
  });

  it("com várias lojas, soma o que faltou sem erro de centavos", () => {
    const lojas = [loja("Centro", "-0.10"), loja("Shopping", "-0.20"), loja("Bairro", "3.00")];

    expect(avisoDoCaixa(lojas, HOJE, BRASILIA)).toEqual({
      valor: "-R$ 0,30",
      nota: "faltou em 2 lojas na última conferência",
      alerta: true,
    });
    expect(avisoDoCaixa([loja("Centro", "3.00"), loja("Shopping", "0.00")], HOJE, BRASILIA).nota).toBe(
      "sobrou em 1 loja na última conferência",
    );
    expect(avisoDoCaixa([loja("Centro", "0.00"), loja("Shopping", null, null)], HOJE, BRASILIA).nota).toBe(
      "bateu; 1 loja sem conferência",
    );
  });
});

describe("link de cada movimento do dia", () => {
  it("leva à ordem, à venda ou à conta, e retirada e reforço não têm página", () => {
    expect(linkDoMovimento(movimento({ tipo: "ordem", ordem: 12 }))).toBe("/ordens/12");
    expect(linkDoMovimento(movimento({ tipo: "venda_desfeita", venda: 3 }))).toBe("/estoque/vendas/3");
    expect(linkDoMovimento(movimento({ tipo: "conta", conta: 8 }))).toBe("/financeiro/contas/8");
    expect(linkDoMovimento(movimento({ tipo: "reforco", movimento: 2 }))).toBeNull();
  });
});
