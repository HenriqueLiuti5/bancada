import { describe, expect, it } from "vitest";
import {
  linkDoAReceber,
  mensagemDeCobranca,
  notaDoAPagar,
  notaDoAReceber,
  situacaoDoAReceber,
  situacaoDoVencimento,
  textoDoAReceber,
  totalAPagarLogo,
} from "@/lib/financeiro";

const HOJE = "2026-10-22";
const MANAUS = "America/Manaus";

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

  it("no a receber, destaca as ordens com o pagamento vencido e leva a elas", () => {
    const comVencidas = { valor: "500.00", ordens: 4, vencidas: { valor: "120.00", ordens: 2 } };
    const emDia = { valor: "90.00", ordens: 1, vencidas: { valor: "0.00", ordens: 0 } };
    const nada = { valor: "0.00", ordens: 0, vencidas: { valor: "0.00", ordens: 0 } };

    expect(notaDoAReceber(comVencidas)).toBe("2 ordens com o pagamento vencido");
    expect(notaDoAReceber(emDia)).toBe("1 ordem entregue sem pagamento completo");
    expect(linkDoAReceber(comVencidas)).toBe("/financeiro/a-receber?situacao=vencidas");
    expect(linkDoAReceber(emDia)).toBe("/financeiro/a-receber");
    expect(linkDoAReceber(nada)).toBeUndefined();
  });
});

describe("contas a receber", () => {
  it("o dia combinado vence como uma conta, e a entrega antiga fica sem data", () => {
    const aReceber = (pagamento_combinado_para: string | null) =>
      situacaoDoAReceber({ pagamento_combinado_para, quitada_em: null }, HOJE, MANAUS);

    expect(aReceber("2026-10-20")).toEqual({ tom: "vencida", curto: "Há 2 dias", frase: "Venceu há 2 dias" });
    expect(aReceber("2026-10-22").curto).toBe("Hoje");
    expect(aReceber(null)).toEqual({ tom: "sem_data", curto: "Sem data", frase: "Sem data combinada" });
  });

  it("a quitada mostra o dia em que o cliente pagou, no fuso da assistência", () => {
    // 00h30 do dia 23 em Brasília ainda é 23h30 do dia 22 em Manaus.
    const quitada = { pagamento_combinado_para: "2026-10-20", quitada_em: "2026-10-23T03:30:00Z" };

    expect(situacaoDoAReceber(quitada, HOJE, MANAUS)).toEqual({
      tom: "paga",
      curto: "Recebido 22/10",
      frase: "Recebido em 22/10/2026",
    });
    expect(situacaoDoAReceber(quitada, HOJE, "America/Sao_Paulo").curto).toBe("Recebido 23/10");
  });

  it("o cartão da ordem diz até quando o cliente combinou pagar, e avisa quando venceu", () => {
    expect(textoDoAReceber("2026-10-30", HOJE)).toEqual({
      texto:
        "O aparelho foi entregue e o cliente combinou pagar o resto até 30 de outubro. Quando ele pagar, registre aqui.",
      vencido: false,
    });
    expect(textoDoAReceber("2026-10-22", HOJE).texto).toContain("combinou pagar o resto hoje.");
    expect(textoDoAReceber("2026-10-23", HOJE).texto).toContain("combinou pagar o resto amanhã.");
    expect(textoDoAReceber("2026-10-21", HOJE)).toEqual({
      texto:
        "O pagamento combinado para 21 de outubro venceu ontem. Cobre o cliente e registre aqui quando ele pagar.",
      vencido: true,
    });
    expect(textoDoAReceber("2026-10-17", HOJE).texto).toContain("venceu há 5 dias.");
    expect(textoDoAReceber(null, HOJE).texto).toMatch(/^O aparelho foi entregue\. Combine com o cliente/);
  });

  it("a cobrança no WhatsApp lembra o valor, o aparelho e o dia combinado", () => {
    const ordem = {
      cliente_nome: "Bruno Lima",
      aparelho_descricao: "Motorola Moto G54",
      saldo_a_receber: "200.00",
      pagamento_combinado_para: "2026-10-30",
    };

    expect(mensagemDeCobranca(ordem)).toBe(
      "Olá, Bruno! Passando para lembrar do pagamento de R$ 200,00 do conserto do seu Motorola Moto G54, combinado para 30/10. Qualquer dúvida, é só responder esta mensagem.",
    );
    expect(mensagemDeCobranca({ ...ordem, pagamento_combinado_para: null })).toContain(
      "do seu Motorola Moto G54. Qualquer dúvida",
    );
  });
});
