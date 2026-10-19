import { afterEach, describe, expect, it, vi } from "vitest";
import { acompanhamentoDeExemplo, etapaDaDemonstracao } from "@/lib/demonstracao";

afterEach(() => {
  vi.useRealTimers();
});

describe("etapaDaDemonstracao", () => {
  it("aceita só as etapas dos botões e começa no reparo", () => {
    expect(etapaDaDemonstracao("pronto")).toBe("pronto");
    expect(etapaDaDemonstracao("orcamento_enviado")).toBe("orcamento_enviado");
    expect(etapaDaDemonstracao("em_diagnostico")).toBe("em_reparo");
    expect(etapaDaDemonstracao(undefined)).toBe("em_reparo");
    expect(etapaDaDemonstracao(["pronto"])).toBe("em_reparo");
  });
});

describe("acompanhamentoDeExemplo", () => {
  it("mostra o orçamento só depois de enviado, e aprovado depois da resposta", () => {
    expect(acompanhamentoDeExemplo("recebido").orcamento).toBeUndefined();
    expect(acompanhamentoDeExemplo("orcamento_enviado").orcamento).toMatchObject({
      aprovado: false,
      total: "570.00",
    });
    expect(acompanhamentoDeExemplo("em_reparo").orcamento?.aprovado).toBe(true);
  });

  it("percorre a linha do tempo até a etapa escolhida, em ordem", () => {
    const exemplo = acompanhamentoDeExemplo("em_reparo");
    expect(exemplo.linha_do_tempo.map((etapa) => etapa.status)).toEqual([
      "recebido",
      "em_diagnostico",
      "orcamento_enviado",
      "aprovado",
      "em_reparo",
    ]);
    const momentos = exemplo.linha_do_tempo.map((etapa) => Date.parse(etapa.em));
    expect(momentos).toEqual([...momentos].sort((um, outro) => um - outro));
    expect(Date.parse(exemplo.aberta_em)).toBeLessThan(Date.now());
  });

  it("encerra a ordem só na entrega", () => {
    expect(acompanhamentoDeExemplo("pronto")).toMatchObject({ encerrada: false, entregue_em: null });
    const entregue = acompanhamentoDeExemplo("entregue");
    expect(entregue.encerrada).toBe(true);
    expect(entregue.entregue_em).toBe(entregue.linha_do_tempo.at(-1)?.em);
  });

  it("promete a entrega para daqui a dois dias", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-12-30T15:00:00Z"));
    expect(acompanhamentoDeExemplo("em_reparo").prometida_para).toBe("2027-01-01");
  });
});
