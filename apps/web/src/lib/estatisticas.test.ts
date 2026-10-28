import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  contarCadastro,
  estatisticasLigadas,
  eventoDeCadastro,
  paginaContada,
} from "@/lib/estatisticas";

const enviar = vi.fn<typeof fetch>();

beforeEach(() => {
  enviar.mockReset();
  enviar.mockResolvedValue(new Response("{}", { status: 200 }));
  vi.stubGlobal("fetch", enviar);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function ligarOUmami(): void {
  vi.stubEnv("UMAMI_ID_DO_SITE", "4b1a4bde-4c4e-4a7c-9f1e-1f0c5d2a9e10");
  vi.stubEnv("UMAMI_URL_INTERNA", "http://umami:3000/");
  vi.stubEnv("APP_PUBLIC_URL", "https://bancada.exemplo");
}

describe("estatísticas", () => {
  it("ficam desligadas sem o site cadastrado no Umami", () => {
    vi.stubEnv("UMAMI_ID_DO_SITE", "");
    vi.stubEnv("UMAMI_URL_INTERNA", "http://umami:3000");
    expect(estatisticasLigadas()).toBe(false);
  });

  it("contam só as páginas abertas a todos", () => {
    expect(paginaContada("https://bancada.exemplo/?utm_source=whatsapp")).toBe(true);
    expect(paginaContada("/cadastro")).toBe(true);
    expect(paginaContada("https://bancada.exemplo/ordens")).toBe(false);
    expect(paginaContada("/os/um-link-de-acompanhamento")).toBe(false);
    expect(paginaContada(undefined)).toBe(false);
  });

  it("contam o cadastro como um evento da página de cadastro, sem dados de quem se cadastrou", () => {
    expect(eventoDeCadastro("site", "https://bancada.exemplo")).toEqual({
      type: "event",
      payload: { website: "site", hostname: "bancada.exemplo", url: "/cadastro", name: "cadastro" },
    });
  });

  it("mandam o cadastro ao Umami com o IP e o navegador de quem se cadastrou", async () => {
    ligarOUmami();
    const visitante = { "X-Forwarded-For": "203.0.113.9", "User-Agent": "Mozilla/5.0" };

    await contarCadastro(visitante);

    const [endereco, opcoes] = enviar.mock.calls[0];
    expect(endereco).toBe("http://umami:3000/api/send");
    expect(opcoes?.headers).toMatchObject(visitante);
    expect(JSON.parse(String(opcoes?.body)).payload.name).toBe("cadastro");
  });

  it("não atrapalham o cadastro quando o Umami está fora do ar", async () => {
    ligarOUmami();
    enviar.mockRejectedValue(new TypeError("fetch failed"));

    await expect(contarCadastro({})).resolves.toBeUndefined();
  });

  it("não mandam nada com o Umami desligado", async () => {
    vi.stubEnv("UMAMI_ID_DO_SITE", "");

    await contarCadastro({});

    expect(enviar).not.toHaveBeenCalled();
  });
});
