import { describe, expect, it } from "vitest";
import { notaDoAPagar, situacaoDoVencimento, totalAPagarLogo } from "@/lib/financeiro";

const HOJE = "2026-10-22";

function aPagar(vencimento: string) {
  return situacaoDoVencimento({ vencimento, paga_em: null }, HOJE);
}

function aviso(vencidas: [string, number], proximas: [string, number]) {
  return {
    vencidas: { valor: vencidas[0], contas: vencidas[1] },
    proximos_dias: { valor: proximas[0], contas: proximas[1] },
  };
}

describe("situação do vencimento", () => {
  it("separa o que venceu, o que vence hoje e o que vem depois", () => {
    expect(aPagar("2026-10-19")).toEqual({ tom: "vencida", curto: "Há 3 dias", frase: "Venceu há 3 dias" });
    expect(aPagar("2026-10-21")).toEqual({ tom: "vencida", curto: "Ontem", frase: "Venceu ontem" });
    expect(aPagar("2026-10-22")).toEqual({ tom: "hoje", curto: "Hoje", frase: "Vence hoje" });
    expect(aPagar("2026-10-23")).toEqual({ tom: "futura", curto: "Amanhã", frase: "Vence amanhã" });
    expect(aPagar("2026-11-10").frase).toMatch(/^Vence em 10 de nov/);
  });

  it("conta paga mostra quando foi paga, mesmo depois do vencimento", () => {
    expect(situacaoDoVencimento({ vencimento: "2026-10-10", paga_em: "2026-10-12" }, HOJE)).toEqual({
      tom: "paga",
      curto: "Paga 12/10",
      frase: "Paga em 12/10/2026",
    });
  });

  it("vale também na virada do mês e do ano", () => {
    expect(situacaoDoVencimento({ vencimento: "2026-12-31", paga_em: null }, "2027-01-01").frase).toBe(
      "Venceu ontem",
    );
    expect(situacaoDoVencimento({ vencimento: "2026-03-01", paga_em: null }, "2026-02-28").curto).toBe(
      "Amanhã",
    );
  });
});

describe("aviso do painel", () => {
  it("soma o que venceu com o que vence na semana, sem erro de centavos", () => {
    expect(totalAPagarLogo(aviso(["120.10", 1], ["2000.20", 2]))).toBe(2120.3);
    expect(totalAPagarLogo(aviso(["0.00", 0], ["0.00", 0]))).toBe(0);
  });

  it("diz quantas contas venceram e quantas vencem logo", () => {
    expect(notaDoAPagar(aviso(["120.00", 2], ["80.00", 1]))).toBe("2 vencidas e 1 nos próximos 7 dias");
    expect(notaDoAPagar(aviso(["120.00", 1], ["0.00", 0]))).toBe("1 conta vencida");
    expect(notaDoAPagar(aviso(["0.00", 0], ["80.00", 3]))).toBe("3 contas nos próximos 7 dias");
    expect(notaDoAPagar(aviso(["0.00", 0], ["0.00", 0]))).toBe("nada vence nos próximos 7 dias");
  });
});
