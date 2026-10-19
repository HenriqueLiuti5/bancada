import { describe, expect, it } from "vitest";
import {
  contagem,
  emDias,
  emHoras,
  emPorcentagem,
  formatarDocumento,
  haDias,
} from "@/lib/formatos";

describe("formatarDocumento", () => {
  it("põe a máscara do CPF", () => {
    expect(formatarDocumento("12345678909")).toBe("123.456.789-09");
  });

  it("põe a máscara do CNPJ, inclusive o novo com letras", () => {
    expect(formatarDocumento("11222333000181")).toBe("11.222.333/0001-81");
    expect(formatarDocumento("12ABC34501DE35")).toBe("12.ABC.345/01DE-35");
  });

  it("deixa como está o que não é CPF nem CNPJ sem máscara", () => {
    expect(formatarDocumento("123")).toBe("123");
    expect(formatarDocumento("123.456.789-09")).toBe("123.456.789-09");
    expect(formatarDocumento("")).toBe("");
  });
});

describe("emDias e emHoras", () => {
  it("escrevem dias no singular, no plural e com milhar", () => {
    expect(emDias(null)).toBe("—");
    expect(emDias(1)).toBe("1 dia");
    expect(emDias(2.5)).toBe("2,5 dias");
    expect(emDias(1500)).toBe("1.500 dias");
  });

  it("passam a contar em dias a partir de 24 horas", () => {
    expect(emHoras(5)).toBe("5 h");
    expect(emHoras(5.25)).toBe("5,3 h");
    expect(emHoras(24)).toBe("1 dia");
    expect(emHoras(36)).toBe("1,5 dias");
  });
});

describe("emPorcentagem, contagem e haDias", () => {
  it("escrevem a porcentagem com uma casa", () => {
    expect(emPorcentagem(null)).toBe("—");
    expect(emPorcentagem(12.345)).toBe("12,3%");
    expect(emPorcentagem(100)).toBe("100%");
  });

  it("concordam a palavra com o número", () => {
    expect(contagem(0, "ordem", "ordens")).toBe("0 ordens");
    expect(contagem(1, "ordem", "ordens")).toBe("1 ordem");
    expect(contagem(2, "ordem", "ordens")).toBe("2 ordens");
  });

  it("dizem há quanto tempo foi", () => {
    expect(haDias(-1)).toBe("hoje");
    expect(haDias(0)).toBe("hoje");
    expect(haDias(1)).toBe("ontem");
    expect(haDias(5)).toBe("há 5 dias");
  });
});
