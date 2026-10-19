import { afterEach, describe, expect, it, vi } from "vitest";
import {
  dataCurta,
  diaEMes,
  diaEMesEmNumeros,
  diaPorExtenso,
  diasEntre,
  hojeEmIso,
  intervaloEscrito,
  mesAbreviado,
  mesPorExtenso,
  nomeDoMes,
  somarDias,
} from "@/lib/datas";

// O servidor roda em UTC, e cada navegador no fuso de quem usa: as contas precisam dar o mesmo
// resultado em todos eles.
const FUSOS = ["UTC", "America/Sao_Paulo", "America/Manaus", "America/Rio_Branco", "America/Noronha"];

const FUSO_DO_PROCESSO = process.env.TZ;

afterEach(() => {
  vi.useRealTimers();
  if (FUSO_DO_PROCESSO === undefined) delete process.env.TZ;
  else process.env.TZ = FUSO_DO_PROCESSO;
});

describe("hojeEmIso", () => {
  it("segue o dia de Brasília, não o do servidor", () => {
    vi.useFakeTimers();

    vi.setSystemTime(new Date("2026-10-18T02:59:00Z"));
    expect(hojeEmIso()).toBe("2026-10-17");

    vi.setSystemTime(new Date("2026-10-18T03:00:00Z"));
    expect(hojeEmIso()).toBe("2026-10-18");
  });
});

describe("datas escritas", () => {
  it("escrevem o dia e o mês de cada jeito usado nas telas", () => {
    expect(diaEMes("2026-10-18")).toBe("18 de out.");
    expect(diaPorExtenso("2026-10-18")).toBe("18 de outubro");
    expect(dataCurta("2026-03-07")).toBe("07/03/2026");
    expect(diaEMesEmNumeros("2026-03-07")).toBe("07/03");
  });

  it("escrevem o mês", () => {
    expect(mesPorExtenso("2026-10")).toBe("outubro de 2026");
    expect(nomeDoMes("2026-03")).toBe("março");
    expect(mesAbreviado("2026-10")).toBe("out");
    expect(mesAbreviado("2026-05")).toBe("mai");
  });

  it("encurtam o período quando o mês se repete", () => {
    expect(intervaloEscrito("2026-10-18", "2026-10-18")).toBe("18 de out.");
    expect(intervaloEscrito("2026-10-01", "2026-10-18")).toBe("1 a 18 de out.");
    expect(intervaloEscrito("2026-09-28", "2026-10-04")).toBe("28 de set. a 4 de out.");
    expect(intervaloEscrito("2025-12-29", "2026-01-04")).toBe("29 de dez. a 4 de jan.");
  });
});

describe("diasEntre e somarDias", () => {
  it("contam os dias para a frente e para trás", () => {
    expect(diasEntre("2026-10-18", "2026-10-25")).toBe(7);
    expect(diasEntre("2026-10-25", "2026-10-18")).toBe(-7);
  });

  it("acertam a virada do mês, do ano e o fevereiro bissexto", () => {
    expect(diasEntre("2026-02-27", "2026-03-01")).toBe(2);
    expect(diasEntre("2024-02-28", "2024-03-01")).toBe(2);
    expect(somarDias("2026-10-18", 2)).toBe("2026-10-20");
    expect(somarDias("2026-12-31", 1)).toBe("2027-01-01");
    expect(somarDias("2026-03-01", -1)).toBe("2026-02-28");
    expect(somarDias("2024-02-28", 1)).toBe("2024-02-29");
  });
});

describe("em qualquer fuso do Brasil", () => {
  it.each(FUSOS)("dão o mesmo dia em %s", (fuso) => {
    process.env.TZ = fuso;

    expect(diaEMes("2026-10-18")).toBe("18 de out.");
    expect(dataCurta("2026-01-01")).toBe("01/01/2026");
    expect(mesPorExtenso("2026-12")).toBe("dezembro de 2026");
    expect(somarDias("2026-12-31", 1)).toBe("2027-01-01");
    expect(diasEntre("2026-10-01", "2026-10-31")).toBe(30);
  });
});
