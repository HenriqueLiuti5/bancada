const BASE = process.env.API_INTERNAL_URL ?? "http://localhost:8000";
const CABECALHO_DO_TOKEN = "asaas-access-token";

export async function POST(pedido: Request): Promise<Response> {
  let resposta: Response;
  try {
    resposta = await fetch(`${BASE}/api/webhooks/asaas/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [CABECALHO_DO_TOKEN]: pedido.headers.get(CABECALHO_DO_TOKEN) ?? "",
      },
      body: await pedido.text(),
      cache: "no-store",
    });
  } catch {
    return new Response(null, { status: 502 });
  }

  return new Response(await resposta.text(), {
    status: resposta.status,
    headers: { "Content-Type": "application/json" },
  });
}
