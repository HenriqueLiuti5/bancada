import { describe, expect, it } from "vitest";
import {
  avisoDaExclusao,
  mensalNoAnual,
  nomeDaCobranca,
  porPeriodo,
  precoDoPlano,
  tamanhoDaAssistencia,
  tamanhoDoPlano,
} from "@/lib/assinatura";
import type { PlanoDaAssinatura } from "@/lib/tipos";

const EQUIPE: PlanoDaAssinatura = {
  plano: "equipe",
  nome: "Equipe",
  lojas: 1,
  pessoas: null,
  mensal: "59.90",
  anual: "599.00",
  por_que_nao_cabe: null,
};

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

describe("cobrança no ciclo da assinatura", () => {
  it("chama de anuidade e cobra por ano no anual, e de mensalidade no resto", () => {
    expect([nomeDaCobranca("anual"), porPeriodo("anual")]).toEqual(["anuidade", "por ano"]);
    expect([nomeDaCobranca("mensal"), porPeriodo("mensal")]).toEqual(["mensalidade", "por mês"]);
    expect([nomeDaCobranca(""), porPeriodo("")]).toEqual(["mensalidade", "por mês"]);
  });

  it("mostra o preço do ciclo escolhido e o anual dividido pelos doze meses", () => {
    expect(precoDoPlano(EQUIPE, "mensal")).toBe("59.90");
    expect(precoDoPlano(EQUIPE, "anual")).toBe("599.00");
    expect(mensalNoAnual(EQUIPE)).toBe("49.92");
    expect(mensalNoAnual({ ...EQUIPE, anual: "399.00" })).toBe("33.25");
  });
});

describe("tamanho", () => {
  it("descreve o que cabe em cada plano", () => {
    expect(tamanhoDoPlano({ lojas: 1, pessoas: 2 })).toBe("1 loja, até 2 pessoas");
    expect(tamanhoDoPlano({ lojas: 1, pessoas: null })).toBe("1 loja, pessoas ilimitadas");
    expect(tamanhoDoPlano({ lojas: 3, pessoas: null })).toBe("até 3 lojas, pessoas ilimitadas");
  });

  it("descreve a assistência no singular e no plural", () => {
    expect(tamanhoDaAssistencia({ lojas: 1, pessoas: 1 })).toBe("1 loja ativa e 1 pessoa");
    expect(tamanhoDaAssistencia({ lojas: 2, pessoas: 5 })).toBe("2 lojas ativas e 5 pessoas");
  });
});
