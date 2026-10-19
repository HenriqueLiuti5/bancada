import { describe, expect, it } from "vitest";
import { mensagemDoConvite, validadeDoConvite } from "@/lib/convites";
import type { Convite } from "@/lib/tipos";

const CONVITE: Convite = {
  id: 7,
  nome: "Joana Prado",
  papel: "tecnico",
  papel_rotulo: "Técnico",
  email: "",
  link: "https://bancada.app/convite/abc",
  expira_em: "2026-10-25T02:30:00Z",
  expirado: false,
  criado_em: "2026-10-18T12:00:00Z",
};

describe("convites", () => {
  it("chamam a pessoa pelo primeiro nome e levam o link", () => {
    expect(mensagemDoConvite(CONVITE, "Central Celulares")).toBe(
      "Olá, Joana! Este é o seu convite para entrar na equipe da Central Celulares no Bancada. Abra o link e crie a sua senha: https://bancada.app/convite/abc",
    );
  });

  it("dizem até quando valem, no dia de Brasília", () => {
    expect(validadeDoConvite(CONVITE)).toBe("vale até 24/10");
    expect(validadeDoConvite({ ...CONVITE, expirado: true })).toBe("expirou em 24/10");
  });
});
