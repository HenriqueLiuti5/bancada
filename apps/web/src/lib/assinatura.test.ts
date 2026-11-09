import { describe, expect, it } from "vitest";
import {
  avisoDaExclusao,
  avisoDoFundador,
  mensalNoAnual,
  nomeDaCobranca,
  porPeriodo,
  precoDoPlano,
  tamanhoDaAssistencia,
  tamanhoDoPlano,
  vagasDeFundador,
} from "@/lib/assinatura";
import type { PlanoDaAssinatura } from "@/lib/tipos";

const EQUIPE: PlanoDaAssinatura = {
  plano: "equipe",
  nome: "Equipe",
  lojas: 1,
  pessoas: null,
  mensal: "89.90",
  anual: "899.00",
  fundador_mensal: "62.90",
  fundador_anual: "629.00",
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
    expect(precoDoPlano(EQUIPE, "mensal")).toBe("89.90");
    expect(precoDoPlano(EQUIPE, "anual")).toBe("899.00");
    expect(mensalNoAnual(EQUIPE)).toBe("74.92");
    expect(mensalNoAnual({ ...EQUIPE, anual: "399.00" })).toBe("33.25");
  });

  it("mostra o preço de fundador quando a assistência ganha o desconto", () => {
    expect(precoDoPlano(EQUIPE, "mensal", true)).toBe("62.90");
    expect(precoDoPlano(EQUIPE, "anual", true)).toBe("629.00");
    expect(mensalNoAnual(EQUIPE, true)).toBe("52.42");
  });
});

describe("vagas de fundador", () => {
  it("diz quantas das vagas restam, no singular e no plural", () => {
    expect(vagasDeFundador({ vagas: 15, restantes: 12, desconto: 30 })).toBe(
      "Restam 12 de 15 vagas de fundador",
    );
    expect(vagasDeFundador({ vagas: 15, restantes: 1, desconto: 30 })).toBe(
      "Restam 1 de 15 vaga de fundador",
    );
  });

  it("avisa que o preço vale enquanto a assinatura continuar", () => {
    const aviso = avisoDoFundador({ vagas: 15, restantes: 12, desconto: 30 });
    expect(aviso).toContain("30% a menos");
    expect(aviso).toContain("Restam 12 de 15 vagas de fundador");
    expect(aviso).toContain("acaba se você cancelar");
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
