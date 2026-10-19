import { describe, expect, it } from "vitest";
import type { Usuario } from "@/lib/tipos";
import { gerenciaEquipe, podeApagar, podeVerSenha, rotuloDoPapel } from "@/lib/usuario";

function pessoa(papel: string): Usuario {
  return {
    id: 1,
    username: "pessoa@loja.test",
    first_name: "Pessoa",
    email: "pessoa@loja.test",
    email_confirmado: true,
    papel,
    tenant: null,
    da_plataforma: false,
  };
}

describe("o que cada papel pode fazer", () => {
  it.each([
    ["dono", { senha: true, apagar: true, equipe: true }],
    ["tecnico", { senha: true, apagar: true, equipe: false }],
    ["atendente", { senha: false, apagar: false, equipe: false }],
    ["desconhecido", { senha: false, apagar: false, equipe: false }],
  ])("%s", (papel, pode) => {
    const usuario = pessoa(papel);
    expect({
      senha: podeVerSenha(usuario),
      apagar: podeApagar(usuario),
      equipe: gerenciaEquipe(usuario),
    }).toEqual(pode);
  });

  it("dá nome aos papéis", () => {
    expect(rotuloDoPapel("dono")).toBe("Dono");
    expect(rotuloDoPapel("tecnico")).toBe("Técnico");
    expect(rotuloDoPapel("atendente")).toBe("Atendente");
    expect(rotuloDoPapel("outro")).toBe("outro");
  });
});
