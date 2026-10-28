import { cabecalhosDoVisitante, levarAoUmami, paginaContada } from "@/lib/estatisticas";

// Uma visita cabe em poucas centenas de bytes; mais que isso não é do contador.
const TAMANHO_MAXIMO_EM_BYTES = 16 * 1024;

function enderecoDaVisita(corpo: string): unknown {
  try {
    return JSON.parse(corpo)?.payload?.url;
  } catch {
    return undefined;
  }
}

export async function POST(pedido: Request): Promise<Response> {
  const corpo = await pedido.text();
  if (corpo.length > TAMANHO_MAXIMO_EM_BYTES) return new Response(null, { status: 413 });
  if (!paginaContada(enderecoDaVisita(corpo))) return Response.json({});

  const cache = pedido.headers.get("x-umami-cache");
  const resposta = await levarAoUmami("/api/send", {
    method: "POST",
    body: corpo,
    headers: {
      ...(await cabecalhosDoVisitante()),
      "Content-Type": "application/json",
      ...(cache ? { "x-umami-cache": cache } : {}),
    },
  });
  if (!resposta) return new Response(null, { status: 404 });

  return new Response(await resposta.text(), {
    status: resposta.status,
    headers: { "Content-Type": resposta.headers.get("content-type") ?? "application/json" },
  });
}
