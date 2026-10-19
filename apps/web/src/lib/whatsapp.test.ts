import { describe, expect, it } from "vitest";
import { linkDoWhatsApp } from "@/lib/whatsapp";

describe("linkDoWhatsApp", () => {
  it("acrescenta o código do Brasil ao número com DDD", () => {
    expect(linkDoWhatsApp("(43) 99615-6781", "Oi")).toBe("https://wa.me/5543996156781?text=Oi");
    expect(linkDoWhatsApp("43 3322-1100", "Oi")).toBe("https://wa.me/554333221100?text=Oi");
  });

  it("mantém o número que já tem o código do país", () => {
    expect(linkDoWhatsApp("+55 43 99615-6781", "Oi")).toBe("https://wa.me/5543996156781?text=Oi");
  });

  it("codifica a mensagem inteira, com acentos, símbolos e o link da ordem", () => {
    const link = linkDoWhatsApp(
      "43996156781",
      "Olá, Ana! Acompanhe aqui: https://bancada.app/os/abc?x=1&y=2 #1042",
    );
    expect(link).toBe(
      "https://wa.me/5543996156781?text=Ol%C3%A1%2C%20Ana!%20Acompanhe%20aqui%3A%20https%3A%2F%2Fbancada.app%2Fos%2Fabc%3Fx%3D1%26y%3D2%20%231042",
    );
    expect(decodeURIComponent(new URL(link!).searchParams.get("text")!)).toContain("x=1&y=2 #1042");
  });

  it("não monta link com número incompleto ou vazio", () => {
    expect(linkDoWhatsApp("9961", "Oi")).toBeNull();
    expect(linkDoWhatsApp("", "Oi")).toBeNull();
  });
});
