import { describe, expect, it } from "vitest";
import { avisoDaExclusao } from "@/lib/assinatura";

describe("avisoDaExclusao", () => {
  it("diz em que dia a conta só para consulta é apagada", () => {
    expect(avisoDaExclusao("2027-04-28")).toBe(
      "Se continuar só para consulta, a conta é apagada com todos os dados em 28 de abril.",
    );
  });

  it("não diz nada enquanto a assistência pode editar", () => {
    expect(avisoDaExclusao(null)).toBeNull();
  });
});
