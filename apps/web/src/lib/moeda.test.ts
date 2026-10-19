import { describe, expect, it } from "vitest";
import { centavosEmReais, centavosParaCampo, emCentavos, emReais, lerReais } from "@/lib/moeda";

// O Intl separa o símbolo do número com um espaço que não quebra a linha.
const ESPACO = " ";

describe("emReais", () => {
  it("escreve o valor como dinheiro", () => {
    expect(emReais(1234.5)).toBe(`R$${ESPACO}1.234,50`);
    expect(emReais("570.00")).toBe(`R$${ESPACO}570,00`);
    expect(emReais(0)).toBe(`R$${ESPACO}0,00`);
  });
});

describe("lerReais", () => {
  it.each([
    ["150", "150"],
    ["150,5", "150.5"],
    ["150,50", "150.50"],
    ["1.234,56", "1234.56"],
    ["R$ 1.234,56", "1234.56"],
    ["R$150", "150"],
    [" 99,9 ", "99.9"],
    ["1234.56", "1234.56"],
    ["12.5", "12.5"],
  ])("entende %j como %s", (digitado, esperado) => {
    expect(lerReais(digitado)).toBe(esperado);
  });

  it("lê o ponto seguido de três dígitos como separador de milhar", () => {
    expect(lerReais("1.234")).toBe("1234");
    expect(lerReais("10.000")).toBe("10000");
    expect(lerReais("1.000.000")).toBe("1000000");
    expect(lerReais("1.23")).toBe("1.23");
  });

  it.each(["", "abc", "-5", "1,234", "0,001", "1.2.3", "1,2,3"])("recusa %j", (digitado) => {
    expect(lerReais(digitado)).toBeNull();
  });
});

describe("emCentavos", () => {
  it("converte o que foi digitado em centavos inteiros", () => {
    expect(emCentavos("150,50")).toBe(15050);
    expect(emCentavos("1.234,56")).toBe(123456);
    expect(emCentavos("R$ 90")).toBe(9000);
  });

  it("não perde centavo com o arredondamento do ponto flutuante", () => {
    expect(emCentavos("0,29")).toBe(29);
    expect(emCentavos("1,15")).toBe(115);
    expect(emCentavos("4,35")).toBe(435);
  });

  it("devolve null para o que não é valor", () => {
    expect(emCentavos("")).toBeNull();
    expect(emCentavos("cento e cinquenta")).toBeNull();
  });
});

describe("centavosParaCampo e centavosEmReais", () => {
  it("escrevem os centavos com vírgula", () => {
    expect(centavosParaCampo(57000)).toBe("570,00");
    expect(centavosParaCampo(5)).toBe("0,05");
    expect(centavosParaCampo(123456)).toBe("1234,56");
    expect(centavosEmReais(57000)).toBe(`R$${ESPACO}570,00`);
  });

  it("voltam ao mesmo valor quando lidos de novo", () => {
    for (const centavos of [0, 1, 99, 15050, 123456, 9999999]) {
      expect(emCentavos(centavosParaCampo(centavos))).toBe(centavos);
    }
  });
});
