import { describe, expect, it } from "vitest";
import {
  conferenciaDoTelefone,
  formatarTelefone,
  problemaDoTelefone,
  telefoneArrumado,
} from "@/lib/telefone";

// A lista oficial da Anatel, com os 67 DDDs em uso no Brasil.
const DDDS_EM_USO = [
  "11 12 13 14 15 16 17 18 19",
  "21 22 24 27 28",
  "31 32 33 34 35 37 38",
  "41 42 43 44 45 46 47 48 49",
  "51 53 54 55",
  "61 62 63 64 65 66 67 68 69",
  "71 73 74 75 77 79",
  "81 82 83 84 85 86 87 88 89",
  "91 92 93 94 95 96 97 98 99",
]
  .join(" ")
  .split(" ");

const TAMANHOS = "Com o DDD, celular tem 11 dígitos e fixo tem 10.";

describe("formatarTelefone", () => {
  it("põe a máscara no celular e no fixo", () => {
    expect(formatarTelefone("11912345678")).toBe("(11) 91234-5678");
    expect(formatarTelefone("1132345678")).toBe("(11) 3234-5678");
  });

  it("refaz a máscara de quem digitou de outro jeito", () => {
    expect(formatarTelefone("43 3322-1100")).toBe("(43) 3322-1100");
    expect(formatarTelefone("(43) 99615-6781")).toBe("(43) 99615-6781");
  });

  it("deixa como está o que não tem 10 nem 11 dígitos", () => {
    expect(formatarTelefone("123")).toBe("123");
    expect(formatarTelefone("+55 (43) 99615-6781")).toBe("+55 (43) 99615-6781");
    expect(formatarTelefone("")).toBe("");
  });
});

describe("problemaDoTelefone", () => {
  it.each([
    "11912345678",
    "(43) 99615-6781",
    "1132345678",
    "+55 (43) 99615-6781",
    "5511912345678",
    "011912345678",
    "01132345678",
  ])("aceita %s", (numero) => {
    expect(problemaDoTelefone(numero)).toBeNull();
  });

  it("conta quantos dígitos foram digitados", () => {
    expect(problemaDoTelefone("123")).toBe(`O número está incompleto: tem 3 dígitos. ${TAMANHOS}`);
    expect(problemaDoTelefone("1")).toBe(`O número está incompleto: tem 1 dígito. ${TAMANHOS}`);
  });

  it("avisa dos dígitos a mais", () => {
    expect(problemaDoTelefone("119123456789")).toBe(`O número tem dígitos a mais: são 12. ${TAMANHOS}`);
  });

  it("recusa DDD que não existe", () => {
    expect(problemaDoTelefone("20912345678")).toBe(
      "O DDD 20 não existe. Confira os dois primeiros números.",
    );
  });

  it("pede o 9 no começo do celular", () => {
    expect(problemaDoTelefone("11812345678")).toBe(
      "Celular começa com 9 depois do DDD. Confira o número.",
    );
  });

  it("percebe o celular escrito sem o 9", () => {
    expect(problemaDoTelefone("1162345678")).toBe(
      "Falta um dígito: celular tem 9 números depois do DDD.",
    );
  });

  it("recusa o fixo que não começa com 2, 3, 4 ou 5", () => {
    expect(problemaDoTelefone("1112345678")).toBe(
      "Confira o número: depois do DDD, celular começa com 9 e fixo com 2, 3, 4 ou 5.",
    );
  });

  it("conhece todos os DDDs da Anatel e nenhum outro", () => {
    for (let numero = 10; numero <= 99; numero += 1) {
      const ddd = String(numero);
      const problema = problemaDoTelefone(`${ddd}912345678`);
      if (DDDS_EM_USO.includes(ddd)) expect(problema, `DDD ${ddd}`).toBeNull();
      else expect(problema, `DDD ${ddd}`).toBe(`O DDD ${ddd} não existe. Confira os dois primeiros números.`);
    }
  });
});

describe("conferenciaDoTelefone", () => {
  it("diz o tipo do número e o estado do DDD", () => {
    expect(conferenciaDoTelefone("43996156781")).toBe("(43) 99615-6781, celular com DDD 43 (PR)");
    expect(conferenciaDoTelefone("1132345678")).toBe("(11) 3234-5678, fixo com DDD 11 (SP)");
    expect(conferenciaDoTelefone("61987654321")).toBe("(61) 98765-4321, celular com DDD 61 (DF)");
    expect(conferenciaDoTelefone("92987654321")).toBe("(92) 98765-4321, celular com DDD 92 (AM)");
  });

  it("tira o código do país e o zero da longa distância", () => {
    expect(conferenciaDoTelefone("+55 11 91234-5678")).toBe("(11) 91234-5678, celular com DDD 11 (SP)");
    expect(conferenciaDoTelefone("011 3234-5678")).toBe("(11) 3234-5678, fixo com DDD 11 (SP)");
  });

  it("fica calada enquanto o número tem problema", () => {
    expect(conferenciaDoTelefone("1191234")).toBeNull();
    expect(conferenciaDoTelefone("20912345678")).toBeNull();
  });
});

describe("telefoneArrumado", () => {
  it("guarda o número com máscara e sem prefixos", () => {
    expect(telefoneArrumado("5543996156781")).toBe("(43) 99615-6781");
    expect(telefoneArrumado("01132345678")).toBe("(11) 3234-5678");
    expect(telefoneArrumado("43 99615 6781")).toBe("(43) 99615-6781");
  });

  it("devolve como foi digitado o número com problema, para a pessoa corrigir", () => {
    expect(telefoneArrumado("4399615")).toBe("4399615");
    expect(telefoneArrumado("")).toBe("");
  });
});
