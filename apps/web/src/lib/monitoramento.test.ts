import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { avisarDoErro } from "@/lib/monitoramento";

const enviar = vi.fn<typeof fetch>();

beforeEach(() => {
  enviar.mockReset();
  enviar.mockResolvedValue(new Response(null, { status: 200 }));
  vi.stubGlobal("fetch", enviar);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function erroComPilha(): Error {
  const erro = new TypeError("Cannot read properties of undefined (reading 'nome')");
  erro.stack = [
    "TypeError: Cannot read properties of undefined (reading 'nome')",
    "    at Acompanhamento (/app/.next/server/app/os/[token]/page.js:10:20)",
    "    at async renderizar (/app/node_modules/next/dist/server/render.js:5:7)",
  ].join("\n");
  return erro;
}

function envio(): { endereco: string; cabecalhos: Record<string, string>; partes: unknown[] } {
  const [endereco, opcoes] = enviar.mock.calls[0];
  const corpo = String(opcoes?.body);
  return {
    endereco: String(endereco),
    cabecalhos: opcoes?.headers as Record<string, string>,
    partes: corpo.split("\n").map((linha) => JSON.parse(linha)),
  };
}

describe("avisarDoErro", () => {
  it("não envia nada sem SENTRY_DSN", async () => {
    vi.stubEnv("SENTRY_DSN", "");
    await avisarDoErro(erroComPilha(), "/os/[token]", {});
    expect(enviar).not.toHaveBeenCalled();
  });

  it("não envia com um endereço que não serve", async () => {
    vi.stubEnv("SENTRY_DSN", "https://sentry.exemplo.com/12");
    await avisarDoErro(erroComPilha(), "/os/[token]", {});
    vi.stubEnv("SENTRY_DSN", "isto não é um endereço");
    await avisarDoErro(erroComPilha(), "/os/[token]", {});
    expect(enviar).not.toHaveBeenCalled();
  });

  it("monta o endereço do envelope a partir do DSN", async () => {
    vi.stubEnv("SENTRY_DSN", "https://chavepublica@o123.ingest.sentry.io/4567");
    await avisarDoErro(erroComPilha(), "/os/[token]", { routerKind: "App Router" });

    const { endereco, cabecalhos } = envio();
    expect(endereco).toBe("https://o123.ingest.sentry.io/api/4567/envelope/");
    expect(cabecalhos["X-Sentry-Auth"]).toContain("sentry_key=chavepublica");
  });

  it("aceita o DSN com caminho, como o do GlitchTip numa subpasta", async () => {
    vi.stubEnv("SENTRY_DSN", "https://chave@erros.exemplo.com/glitchtip/12");
    await avisarDoErro(erroComPilha(), "/ordens/[id]", {});
    expect(envio().endereco).toBe("https://erros.exemplo.com/glitchtip/api/12/envelope/");
  });

  it("manda só o erro e o desenho da rota, sem dados de quem acessou", async () => {
    vi.stubEnv("SENTRY_DSN", "https://chave@o1.ingest.sentry.io/2");
    vi.stubEnv("VERSAO", "abc123");
    await avisarDoErro(erroComPilha(), "/os/[token]", { routerKind: "App Router" });

    const [cabecalho, tipo, evento] = envio().partes as Record<string, unknown>[];
    expect(cabecalho).toHaveProperty("event_id");
    expect(tipo).toEqual({ type: "event" });
    expect(Object.keys(evento).sort()).toEqual(
      [
        "environment",
        "event_id",
        "exception",
        "level",
        "logger",
        "platform",
        "release",
        "server_name",
        "tags",
        "timestamp",
        "transaction",
      ].sort(),
    );
    expect(evento).toMatchObject({
      transaction: "/os/[token]",
      release: "abc123",
      tags: { routerKind: "App Router" },
    });
  });

  it("põe a chamada mais antiga primeiro e separa o código do sistema do das bibliotecas", async () => {
    vi.stubEnv("SENTRY_DSN", "https://chave@o1.ingest.sentry.io/2");
    await avisarDoErro(erroComPilha(), "/os/[token]", {});

    const evento = envio().partes[2] as {
      exception: { values: { type: string; value: string; stacktrace: { frames: unknown[] } }[] };
    };
    const [excecao] = evento.exception.values;
    expect(excecao.type).toBe("TypeError");
    expect(excecao.stacktrace.frames).toEqual([
      {
        function: "renderizar",
        filename: "/app/node_modules/next/dist/server/render.js",
        lineno: 5,
        colno: 7,
        in_app: false,
      },
      {
        function: "Acompanhamento",
        filename: "/app/.next/server/app/os/[token]/page.js",
        lineno: 10,
        colno: 20,
        in_app: true,
      },
    ]);
  });

  it("não atrapalha a página quando o monitoramento está fora do ar", async () => {
    vi.stubEnv("SENTRY_DSN", "https://chave@o1.ingest.sentry.io/2");
    enviar.mockRejectedValue(new TypeError("fetch failed"));
    await expect(avisarDoErro(new Error("falhou"), "/", {})).resolves.toBeUndefined();
  });
});
